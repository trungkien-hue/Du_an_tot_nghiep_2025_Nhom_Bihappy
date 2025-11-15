// File: Integrations/PartnerHotel/PartnerWebhookSender.cs
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using VirtualTravel.Data;
using VirtualTravel.Models;
using VirtualTravel.Options;

namespace VirtualTravel.Integrations.PartnerHotel
{
    public interface IPartnerWebhookSender
    {
        Task SendBookingCreatedAsync(int bookingId, CancellationToken ct = default);
        Task SendBookingModifiedAsync(int bookingId, CancellationToken ct = default);
        Task SendBookingCanceledAsync(int bookingId, string reason = "", CancellationToken ct = default);
    }

    public sealed class PartnerWebhookSender : IPartnerWebhookSender
    {
        private readonly AppDbContext _db;
        private readonly HttpClient _http;
        private readonly PartnerHotelOptions _opt;

        public PartnerWebhookSender(AppDbContext db, HttpClient http, IOptions<PartnerHotelOptions> opt)
        {
            _db = db;
            _http = http;
            _opt = opt.Value;
            if (!string.IsNullOrWhiteSpace(_opt.OutboundWebhookBaseUrl) && _http.BaseAddress is null)
                _http.BaseAddress = new Uri(_opt.OutboundWebhookBaseUrl!);
        }

        /* ----------------------------- Helpers ----------------------------- */

        private static string IsoDate(DateTime d) => d.ToString("yyyy-MM-dd");

        private static int CalcNights(DateTime? checkIn, DateTime? checkOut)
        {
            if (checkIn is null || checkOut is null) return 1;
            var nights = (checkOut.Value.Date - checkIn.Value.Date).Days;
            return nights < 1 ? 1 : nights;
        }

        private static (int adults, int children, int total) DeriveGuests(Booking b)
        {
            var total = b.NumberOfGuests ?? Math.Max(1, b.Quantity) * 2; // default 2/ngày/phòng
            var adults = Math.Max(1, total);
            var children = 0;
            return (adults, children, total);
        }

        private static string FallbackExternalId(Booking b)
            => string.IsNullOrWhiteSpace(b.ExternalBookingId) ? $"VT-{b.BookingID}" : b.ExternalBookingId!;

        private async Task<(string hotelCode, string roomCode, string? ratePlanCode)> ResolveExternalCodesAsync(
            Booking b, int partnerId, CancellationToken ct)
        {
            var hotelCode = await _db.PartnerHotelMaps.AsNoTracking()
                .Where(x => x.PartnerID == partnerId && x.HotelID == b.HotelID)
                .Select(x => x.ExternalHotelCode)
                .FirstOrDefaultAsync(ct)
                ?? (b.Hotel?.ExternalHotelCode ?? "HOTEL");

            var roomCode = await _db.PartnerRoomTypeMaps.AsNoTracking()
                .Where(x => x.PartnerID == partnerId && x.HotelID == b.HotelID && x.RoomTypeID == b.RoomTypeID)
                .Select(x => x.ExternalRoomTypeCode)
                .FirstOrDefaultAsync(ct)
                ?? (b.RoomType?.ExternalRoomTypeCode ?? "ROOM");

            var ratePlanCode = b.GetType().GetProperty("RatePlanCode")?.GetValue(b) as string;
            return (hotelCode, roomCode, ratePlanCode);
        }

        private static string BuildConfirmationCode(string hotelCode, string roomCode, int bookingId)
            => $"{hotelCode}-{roomCode}-{bookingId}";

        private static (string ts, string sig) Sign(string rawBody, string secret)
        {
            var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
            var payload = $"{ts}.{rawBody}";
            using var h = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var sig = Convert.ToHexString(h.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
            return (ts, sig);
        }

        /* ----------------------- Payload types (V2) ------------------------ */

        private sealed record OutEnvelope(
            string Event, string EventId, int PartnerId, BookingDto Booking);

        private sealed record BookingDto(
            string ExternalBookingId, string ConfirmationCode, string Status,
            string CheckIn, string CheckOut, int Nights, int Quantity,
            string HotelCode, string RoomTypeCode, string? RatePlanCode,
            Guests Guests, Customer Customer, Amount Amount, Metadata Metadata);

        private sealed record Guests(int Adults, int Children, int Total);
        private sealed record Customer(string? Name, string? Phone);
        private sealed record Amount(decimal? Total, string Currency);
        private sealed record Metadata(string? PolicySnapshotJson, string? PriceBreakdownJson);

        // 💡 Payload “compat” (legacy flat + v2 nested) để phía gốc đọc dễ dàng
        private sealed record OriginCompatPayload(
            string Event, string EventId, int PartnerId,

            // --- FLAT (legacy) ---
            string ExternalBookingId, string ConfirmationCode, string Status,
            string CheckIn, string CheckOut, int Nights, int Quantity,
            string HotelCode, string RoomTypeCode, string? RatePlanCode,
            int Adults, int Children, int GuestsTotal,
            string? Name, string? Phone, decimal? AmountTotal, string Currency,

            // --- NESTED (v2) ---
            BookingDto Booking
        );

        private async Task<OriginCompatPayload> BuildPayloadAsync(
            Booking b, string @event, string status, int partnerId, CancellationToken ct)
        {
            var (hotelCode, roomCode, ratePlanCode) = await ResolveExternalCodesAsync(b, partnerId, ct);
            var checkIn = (b.CheckInDate ?? b.BookingDate.Date);
            var checkOut = (b.CheckOutDate ?? b.BookingDate.Date.AddDays(1));
            var nights = CalcNights(b.CheckInDate, b.CheckOutDate);
            var qty = Math.Max(1, b.Quantity);
            var (adults, children, totalGuests) = DeriveGuests(b);

            var dto = new BookingDto(
                ExternalBookingId: FallbackExternalId(b),
                ConfirmationCode: BuildConfirmationCode(hotelCode, roomCode, b.BookingID),
                Status: status,
                CheckIn: IsoDate(checkIn),
                CheckOut: IsoDate(checkOut),
                Nights: nights,
                Quantity: qty,
                HotelCode: hotelCode,
                RoomTypeCode: roomCode,
                RatePlanCode: string.IsNullOrWhiteSpace(ratePlanCode) ? "RP1" : ratePlanCode,
                Guests: new Guests(adults, children, totalGuests),
                Customer: new Customer(b.FullName, b.Phone),
                Amount: new Amount(b.TotalPrice, "VND"),
                Metadata: new Metadata(b.PolicySnapshotJson, b.PriceBreakdownJson)
            );

            return new OriginCompatPayload(
                Event: @event,
                EventId: $"{@event}:{b.BookingID}:{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
                PartnerId: partnerId,

                // FLAT
                ExternalBookingId: dto.ExternalBookingId,
                ConfirmationCode: dto.ConfirmationCode,
                Status: dto.Status,
                CheckIn: dto.CheckIn,
                CheckOut: dto.CheckOut,
                Nights: dto.Nights,
                Quantity: dto.Quantity,
                HotelCode: dto.HotelCode,
                RoomTypeCode: dto.RoomTypeCode,
                RatePlanCode: dto.RatePlanCode,
                Adults: dto.Guests.Adults,
                Children: dto.Guests.Children,
                GuestsTotal: dto.Guests.Total,
                Name: dto.Customer.Name,
                Phone: dto.Customer.Phone,
                AmountTotal: dto.Amount.Total,
                Currency: dto.Amount.Currency,

                // NESTED (v2)
                Booking: dto
            );
        }

        private async Task SendAsync(string path, OriginCompatPayload payload, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(_opt.OutboundWebhookBaseUrl))
                throw new InvalidOperationException("Missing PartnerHotelOptions.OutboundWebhookBaseUrl");
            if (string.IsNullOrWhiteSpace(_opt.OutboundWebhookSecret))
                throw new InvalidOperationException("Missing PartnerHotelOptions.OutboundWebhookSecret");

            var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            var (ts, sig) = Sign(json, _opt.OutboundWebhookSecret);
            var fullUrl = _http.BaseAddress is null ? path : new Uri(_http.BaseAddress, path).ToString();
            Console.WriteLine($"[PartnerWebhookSender] POST {fullUrl}");

            var delays = new[] { 0, 600, 1500 };
            Exception? last = null;

            foreach (var delay in delays)
            {
                if (delay > 0) await Task.Delay(delay, ct);
                try
                {
                    using var req = new HttpRequestMessage(HttpMethod.Post, path)
                    {
                        Content = new StringContent(json, Encoding.UTF8, "application/json")
                    };
                    req.Headers.Add("X-Timestamp", ts);
                    req.Headers.Add("X-Signature", sig);
                    req.Headers.Accept.ParseAdd("application/json");

                    using var res = await _http.SendAsync(req, ct);
                    Console.WriteLine($"[PartnerWebhookSender] OUT -> {path} : {(int)res.StatusCode} {res.StatusCode}");
                    res.EnsureSuccessStatusCode();
                    return;
                }
                catch (Exception ex)
                {
                    last = ex;
                    Console.WriteLine($"[PartnerWebhookSender] ERROR ({path}) attempt failed: {ex.Message}");
                }
            }

            if (last is not null) throw last;
        }

        /* --------------------------- Public APIs --------------------------- */

        public async Task SendBookingCreatedAsync(int bookingId, CancellationToken ct = default)
        {
            var b = await _db.Bookings
                .Include(x => x.Hotel).Include(x => x.RoomType)
                .FirstOrDefaultAsync(x => x.BookingID == bookingId, ct)
                ?? throw new InvalidOperationException("Booking not found");

            var partnerId = _opt.PartnerId <= 0 ? 1 : _opt.PartnerId;
            var status = string.IsNullOrWhiteSpace(b.Status) ? "Pending" : b.Status!;
            var payload = await BuildPayloadAsync(b, "bookings.created", status, partnerId, ct);

            await SendAsync("/webhooks/intermediary/bookings.created", payload, ct);
        }

        public async Task SendBookingModifiedAsync(int bookingId, CancellationToken ct = default)
        {
            var b = await _db.Bookings
                .Include(x => x.Hotel).Include(x => x.RoomType)
                .FirstOrDefaultAsync(x => x.BookingID == bookingId, ct)
                ?? throw new InvalidOperationException("Booking not found");

            var partnerId = _opt.PartnerId <= 0 ? 1 : _opt.PartnerId;
            var status = string.IsNullOrWhiteSpace(b.Status) ? "Confirmed" : b.Status!;
            var payload = await BuildPayloadAsync(b, "bookings.modified", status, partnerId, ct);

            await SendAsync("/webhooks/intermediary/bookings.modified", payload, ct);
        }

        public async Task SendBookingCanceledAsync(int bookingId, string reason = "", CancellationToken ct = default)
        {
            var b = await _db.Bookings
                .Include(x => x.Hotel).Include(x => x.RoomType)
                .FirstOrDefaultAsync(x => x.BookingID == bookingId, ct)
                ?? throw new InvalidOperationException("Booking not found");

            var partnerId = _opt.PartnerId <= 0 ? 1 : _opt.PartnerId;

            if (!string.Equals(b.Status, "Canceled", StringComparison.OrdinalIgnoreCase))
            {
                b.Status = "Canceled";
                await _db.SaveChangesAsync(ct);
            }

            var payload = await BuildPayloadAsync(b, "bookings.canceled", "Canceled", partnerId, ct);
            await SendAsync("/webhooks/intermediary/bookings.canceled", payload, ct);
        }
    }
}



//SỬ DỤNG KHI CÓ NHIỀU PANTER
//using System.Security.Cryptography;
//using System.Text;
//using System.Text.Json;
//using Microsoft.EntityFrameworkCore;
//using Microsoft.Extensions.Options;
//using VirtualTravel.Data;
//using VirtualTravel.Models;
//using VirtualTravel.Options;

//namespace VirtualTravel.Integrations.PartnerHotel
//{
//    public interface IPartnerWebhookSender
//    {
//        Task SendBookingCreatedAsync(int bookingId, CancellationToken ct = default);
//        Task SendBookingModifiedAsync(int bookingId, CancellationToken ct = default);
//        Task SendBookingCanceledAsync(int bookingId, string reason = "", CancellationToken ct = default);
//    }

//    public sealed class PartnerWebhookSender : IPartnerWebhookSender
//    {
//        private readonly AppDbContext _db;
//        private readonly HttpClient _http;
//        private readonly PartnerHotelOptions _opt; // giữ làm Fallback (nếu không tìm thấy Partner)

//        public PartnerWebhookSender(AppDbContext db, HttpClient http, IOptions<PartnerHotelOptions> opt)
//        {
//            _db = db;
//            _http = http;
//            _opt = opt.Value;
//        }

//        /* ========================= RESOLUTION ========================= */

//        // 1) Tìm Partner theo HotelID/RoomTypeID của booking
//        private async Task<Partner?> ResolvePartnerAsync(Booking b, CancellationToken ct)
//        {
//            // Ưu tiên map theo RoomType nhằm tránh trùng giữa các KS
//            if (b.RoomTypeID.HasValue)
//            {
//                var pid = await _db.PartnerRoomTypeMaps.AsNoTracking()
//                    .Where(m => m.RoomTypeID == b.RoomTypeID.Value)
//                    .Select(m => m.PartnerID)
//                    .FirstOrDefaultAsync(ct);

//                if (pid > 0)
//                    return await _db.Partners.AsNoTracking()
//                        .FirstOrDefaultAsync(p => p.PartnerID == pid && p.IsActive, ct);
//            }

//            // Rơi về map theo Hotel
//            if (b.HotelID.HasValue)
//            {
//                var pid = await _db.PartnerHotelMaps.AsNoTracking()
//                    .Where(m => m.HotelID == b.HotelID.Value)
//                    .Select(m => m.PartnerID)
//                    .FirstOrDefaultAsync(ct);

//                if (pid > 0)
//                    return await _db.Partners.AsNoTracking()
//                        .FirstOrDefaultAsync(p => p.PartnerID == pid && p.IsActive, ct);
//            }

//            return null;
//        }

//        // 2) Lấy External codes cho KS gốc (HotelCode/RoomTypeCode/RatePlanCode)
//        private async Task<(string hotelCode, string roomCode, string? ratePlanCode, int partnerId)> ResolveExternalCodesAsync(
//            Booking b, int partnerId, CancellationToken ct)
//        {
//            var hotelCode = await _db.PartnerHotelMaps.AsNoTracking()
//                .Where(x => x.PartnerID == partnerId && x.HotelID == b.HotelID)
//                .Select(x => x.ExternalHotelCode)
//                .FirstOrDefaultAsync(ct)
//                ?? (b.Hotel?.ExternalHotelCode ?? "HOTEL");

//            var roomCode = await _db.PartnerRoomTypeMaps.AsNoTracking()
//                .Where(x => x.PartnerID == partnerId && x.HotelID == b.HotelID && x.RoomTypeID == b.RoomTypeID)
//                .Select(x => x.ExternalRoomTypeCode)
//                .FirstOrDefaultAsync(ct)
//                ?? (b.RoomType?.ExternalRoomTypeCode ?? "ROOM");

//            // nếu có cột RatePlanCode trong Booking thì map tiếp; nếu không, để null/“RP1”
//            var ratePlanCode = b.GetType().GetProperty("RatePlanCode")?.GetValue(b) as string;

//            return (hotelCode, roomCode, ratePlanCode, partnerId);
//        }

//        /* ========================== HELPERS ========================== */

//        private static string IsoDate(DateTime d) => d.ToString("yyyy-MM-dd");

//        private static int CalcNights(DateTime? ci, DateTime? co)
//        {
//            if (ci is null || co is null) return 1;
//            var n = (co.Value.Date - ci.Value.Date).Days;
//            return n < 1 ? 1 : n;
//        }

//        private static (int adults, int children, int total) DeriveGuests(Booking b)
//        {
//            var total = b.NumberOfGuests ?? Math.Max(1, b.Quantity) * 2;
//            return (Math.Max(1, total), 0, total);
//        }

//        private static string FallbackExternalId(Booking b)
//            => string.IsNullOrWhiteSpace(b.ExternalBookingId) ? $"VT-{b.BookingID}" : b.ExternalBookingId!;

//        private static string BuildConfirmationCode(string hotelCode, string roomCode, int bookingId)
//            => $"{hotelCode}-{roomCode}-{bookingId}";

//        private static (string ts, string sig) Sign(string rawBody, string secret)
//        {
//            var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
//            using var h = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
//            var sig = Convert.ToHexString(h.ComputeHash(Encoding.UTF8.GetBytes($"{ts}.{rawBody}"))).ToLowerInvariant();
//            return (ts, sig);
//        }

//        /* =================== Payload (flat + nested) =================== */

//        private sealed record Guests(int Adults, int Children, int Total);
//        private sealed record Customer(string? Name, string? Phone);
//        private sealed record Amount(decimal? Total, string Currency);
//        private sealed record Metadata(string? PolicySnapshotJson, string? PriceBreakdownJson);

//        private sealed record BookingDto(
//            string ExternalBookingId, string ConfirmationCode, string Status,
//            string CheckIn, string CheckOut, int Nights, int Quantity,
//            string HotelCode, string RoomTypeCode, string? RatePlanCode,
//            Guests Guests, Customer Customer, Amount Amount, Metadata Metadata);

//        private sealed record OriginCompatPayload(
//            string Event, string EventId, int PartnerId,
//            // FLAT (legacy)
//            string ExternalBookingId, string ConfirmationCode, string Status,
//            string CheckIn, string CheckOut, int Nights, int Quantity,
//            string HotelCode, string RoomTypeCode, string? RatePlanCode,
//            int Adults, int Children, int GuestsTotal, string? Name, string? Phone,
//            decimal? AmountTotal, string Currency,
//            // NESTED (v2)
//            BookingDto Booking
//        );

//        private async Task<OriginCompatPayload> BuildPayloadAsync(Booking b, string @event, string status, int partnerId, CancellationToken ct)
//        {
//            var (hotelCode, roomCode, ratePlanCode, _) = await ResolveExternalCodesAsync(b, partnerId, ct);
//            var checkIn = (b.CheckInDate ?? b.BookingDate.Date);
//            var checkOut = (b.CheckOutDate ?? b.BookingDate.Date.AddDays(1));
//            var nights = CalcNights(b.CheckInDate, b.CheckOutDate);
//            var qty = Math.Max(1, b.Quantity);
//            var (adults, children, totalGuests) = DeriveGuests(b);

//            var dto = new BookingDto(
//                ExternalBookingId: FallbackExternalId(b),
//                ConfirmationCode: BuildConfirmationCode(hotelCode, roomCode, b.BookingID),
//                Status: status,
//                CheckIn: IsoDate(checkIn),
//                CheckOut: IsoDate(checkOut),
//                Nights: nights,
//                Quantity: qty,
//                HotelCode: hotelCode,
//                RoomTypeCode: roomCode,
//                RatePlanCode: string.IsNullOrWhiteSpace(ratePlanCode) ? "RP1" : ratePlanCode,
//                Guests: new Guests(adults, children, totalGuests),
//                Customer: new Customer(b.FullName, b.Phone),
//                Amount: new Amount(b.TotalPrice, "VND"),
//                Metadata: new Metadata(b.PolicySnapshotJson, b.PriceBreakdownJson)
//            );

//            return new OriginCompatPayload(
//                Event: @event,
//                EventId: $"{@event}:{b.BookingID}:{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
//                PartnerId: partnerId,
//                // flat
//                ExternalBookingId: dto.ExternalBookingId,
//                ConfirmationCode: dto.ConfirmationCode,
//                Status: dto.Status,
//                CheckIn: dto.CheckIn,
//                CheckOut: dto.CheckOut,
//                Nights: dto.Nights,
//                Quantity: dto.Quantity,
//                HotelCode: dto.HotelCode,
//                RoomTypeCode: dto.RoomTypeCode,
//                RatePlanCode: dto.RatePlanCode,
//                Adults: dto.Guests.Adults,
//                Children: dto.Guests.Children,
//                GuestsTotal: dto.Guests.Total,
//                Name: dto.Customer.Name,
//                Phone: dto.Customer.Phone,
//                AmountTotal: dto.Amount.Total,
//                Currency: dto.Amount.Currency,
//                // nested
//                Booking: dto
//            );
//        }

//        private async Task SendToAsync(Partner partner, string relativePath, OriginCompatPayload payload, CancellationToken ct)
//        {
//            if (string.IsNullOrWhiteSpace(partner.ApiBase))
//                throw new InvalidOperationException($"Partner {partner.PartnerID} missing ApiBase");

//            var baseUrl = partner.ApiBase!.TrimEnd('/');               // ví dụ: http://localhost:6060/webhooks/intermediary
//            var url = $"{baseUrl}/{relativePath.TrimStart('/')}";      // -> .../bookings.created
//            var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

//            var (ts, sig) = Sign(json, partner.WebhookSecret ?? "");
//            using var req = new HttpRequestMessage(HttpMethod.Post, url)
//            {
//                Content = new StringContent(json, Encoding.UTF8, "application/json")
//            };
//            req.Headers.Add("X-Timestamp", ts);
//            req.Headers.Add("X-Signature", sig);
//            req.Headers.Accept.ParseAdd("application/json");

//            var res = await _http.SendAsync(req, ct);
//            Console.WriteLine($"[PartnerWebhookSender] OUT -> Partner#{partner.PartnerID} {relativePath} : {(int)res.StatusCode} {res.StatusCode}");
//            res.EnsureSuccessStatusCode();
//        }

//        /* =========================== PUBLIC =========================== */

//        public async Task SendBookingCreatedAsync(int bookingId, CancellationToken ct = default)
//        {
//            var b = await _db.Bookings.Include(x => x.Hotel).Include(x => x.RoomType)
//                .FirstOrDefaultAsync(x => x.BookingID == bookingId, ct)
//                ?? throw new InvalidOperationException("Booking not found");

//            var partner = await ResolvePartnerAsync(b, ct);
//            if (partner is null)
//            {
//                Console.WriteLine("[Webhook] No partner mapping for booking; skip.");
//                return; // hoặc ném exception tùy chính sách
//            }

//            var payload = await BuildPayloadAsync(b, "bookings.created", string.IsNullOrWhiteSpace(b.Status) ? "Pending" : b.Status!, partner.PartnerID, ct);
//            await SendToAsync(partner, "bookings.created", payload, ct);
//        }

//        public async Task SendBookingModifiedAsync(int bookingId, CancellationToken ct = default)
//        {
//            var b = await _db.Bookings.Include(x => x.Hotel).Include(x => x.RoomType)
//                .FirstOrDefaultAsync(x => x.BookingID == bookingId, ct)
//                ?? throw new InvalidOperationException("Booking not found");

//            var partner = await ResolvePartnerAsync(b, ct);
//            if (partner is null)
//            {
//                Console.WriteLine("[Webhook] No partner mapping for booking; skip.");
//                return;
//            }

//            var payload = await BuildPayloadAsync(b, "bookings.modified", string.IsNullOrWhiteSpace(b.Status) ? "Confirmed" : b.Status!, partner.PartnerID, ct);
//            await SendToAsync(partner, "bookings.modified", payload, ct);
//        }

//        public async Task SendBookingCanceledAsync(int bookingId, string reason = "", CancellationToken ct = default)
//        {
//            var b = await _db.Bookings.Include(x => x.Hotel).Include(x => x.RoomType)
//                .FirstOrDefaultAsync(x => x.BookingID == bookingId, ct)
//                ?? throw new InvalidOperationException("Booking not found");

//            var partner = await ResolvePartnerAsync(b, ct);
//            if (partner is null)
//            {
//                Console.WriteLine("[Webhook] No partner mapping for booking; skip.");
//                return;
//            }

//            if (!string.Equals(b.Status, "Canceled", StringComparison.OrdinalIgnoreCase))
//            {
//                b.Status = "Canceled";
//                await _db.SaveChangesAsync(ct);
//            }

//            var payload = await BuildPayloadAsync(b, "bookings.canceled", "Canceled", partner.PartnerID, ct);
//            await SendToAsync(partner, "bookings.canceled", payload, ct);
//        }
//    }
//}

using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;
using System.Text.Json;
using VirtualTravel.Data;
using VirtualTravel.Models;
using VirtualTravel.Services.Notifications;

namespace VirtualTravel.Integrations.PartnerHotel
{
    public interface IBookingSyncService
    {
        Task HandleBookingCreatedAsync(PartnerBookingEvent e, int partnerId);
        Task HandleBookingModifiedAsync(PartnerBookingEvent e, int partnerId);
        Task HandleBookingCanceledAsync(PartnerBookingEvent e, int partnerId);
    }

    public sealed class BookingSyncService : IBookingSyncService
    {
        private readonly AppDbContext _db;
        private readonly INotificationPublisher _noti;
        private readonly IInventoryService _inv;

        public BookingSyncService(AppDbContext db, INotificationPublisher noti, IInventoryService inv)
        {
            _db = db;
            _noti = noti;
            _inv = inv;
        }

        /* ================== Helpers ================== */

        private static DateTime ParseDateOrToday(string s)
            => DateTime.TryParse(s, out var d) ? d.Date : DateTime.UtcNow.Date;

        private static void TrySetProp<T>(object obj, string name, T value)
        {
            var p = obj.GetType().GetProperty(name);
            if (p == null || !p.CanWrite) return;

            var target = Nullable.GetUnderlyingType(p.PropertyType) ?? p.PropertyType;
            object? converted = value;
            try
            {
                if (value != null && !target.IsAssignableFrom(value!.GetType()))
                    converted = Convert.ChangeType(value, target, CultureInfo.InvariantCulture);
            }
            catch { /* ignore */ }

            p.SetValue(obj, converted);
        }

        private static int? TryGetNullableInt(object obj, string name)
        {
            var p = obj.GetType().GetProperty(name);
            if (p == null) return null;
            var v = p.GetValue(obj);
            if (v == null) return null;
            try
            {
                return (int)Convert.ChangeType(v, typeof(int), CultureInfo.InvariantCulture);
            }
            catch { return null; }
        }

        private async Task<(string hotelName, string roomName)> GetPrettyNamesAsync(
            int? hotelId, int? roomTypeId, string fallbackHotelCode, string fallbackRoomCode)
        {
            if (hotelId is null || roomTypeId is null)
                return (fallbackHotelCode, fallbackRoomCode);

            var hotelName = await _db.Hotels
                .Where(h => h.HotelID == hotelId.Value)
                .Select(h => h.Name)
                .FirstOrDefaultAsync() ?? fallbackHotelCode;

            var roomName = await _db.RoomTypes
                .Where(r => r.RoomTypeID == roomTypeId.Value)
                .Select(r => r.Name)
                .FirstOrDefaultAsync() ?? fallbackRoomCode;

            return (hotelName, roomName);
        }

        private async Task<(int hotelId, int roomTypeId, int? ratePlanId)?> TryMapAsync(int partnerId, PartnerBookingEvent e)
        {
            var hotelMap = await _db.PartnerHotelMaps.AsNoTracking()
                .FirstOrDefaultAsync(m => m.PartnerID == partnerId && m.ExternalHotelCode == e.HotelCode);
            if (hotelMap == null) return null;

            var roomMap = await _db.PartnerRoomTypeMaps.AsNoTracking()
                .FirstOrDefaultAsync(m => m.PartnerID == partnerId &&
                                          m.HotelID == hotelMap.HotelID &&
                                          m.ExternalRoomTypeCode == e.RoomTypeCode);
            if (roomMap == null) return null;

            int? ratePlanId = null;
            if (!string.IsNullOrWhiteSpace(e.RatePlanCode))
            {
                ratePlanId = await _db.PartnerRatePlanMaps.AsNoTracking()
                    .Where(m => m.PartnerID == partnerId &&
                                m.HotelID == hotelMap.HotelID &&
                                m.ExternalRatePlanCode == e.RatePlanCode)
                    .Select(m => (int?)m.RatePlanID)
                    .FirstOrDefaultAsync();
            }

            return (hotelMap.HotelID, roomMap.RoomTypeID, ratePlanId);
        }

        private async Task HandleUnmappedAsync(string eventType, int partnerId, PartnerBookingEvent e, string reason)
        {
            await _db.UnmappedWebhooks.AddAsync(new UnmappedWebhook
            {
                PartnerID = partnerId,
                EventType = eventType,
                ExternalHotelCode = e.HotelCode,
                ExternalRoomTypeCode = e.RoomTypeCode,
                ExternalRatePlanCode = e.RatePlanCode,
                ExternalBookingId = e.ExternalBookingId,
                PayloadJson = JsonSerializer.Serialize(e),
                Status = "Pending",
                RetryCount = 0,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            await _noti.AddAndBroadcastAsync(
                targetRole: "Admin",
                title: "⚠️ Chưa ánh xạ dữ liệu webhook",
                message: $"Sự kiện: {eventType}. HotelCode={e.HotelCode}, RoomTypeCode={e.RoomTypeCode}, RatePlanCode={e.RatePlanCode}. Lý do: {reason}");
        }

        private static string StatusLabel(string eventType, string? status)
        {
            var s = (status ?? "").Trim();
            return eventType switch
            {
                "bookings.created" => "Đặt mới" + (string.IsNullOrEmpty(s) ? "" : $" ({s})"),
                "bookings.modified" => "Cập nhật" + (string.IsNullOrEmpty(s) ? "" : $" ({s})"),
                "bookings.canceled" => "Hủy" + (string.IsNullOrEmpty(s) ? "" : $" ({s})"),
                _ => s
            };
        }

        private async Task NotifyBothRolesAsync(
            string eventType,
            string hotelName,
            string roomName,
            string extId,
            string dateIn,
            string dateOut,
            string? status = null,
            string? changeSummary = null)
        {
            var label = StatusLabel(eventType, status);
            var tail = string.IsNullOrWhiteSpace(changeSummary) ? "" : $"\n• {changeSummary}";

            await _noti.AddAndBroadcastAsync(
                targetRole: "Staff",
                title: $"🏨 {label} (PartnerHotel)",
                message: $"{hotelName} — {roomName}. Mã đối tác: {extId}.\nNhận {dateIn} · Trả {dateOut}.{tail}");

            await _noti.AddAndBroadcastAsync(
                targetRole: "Admin",
                title: $"🏨 {label} (PartnerHotel)",
                message: $"{hotelName} — {roomName}. Mã đối tác: {extId}.\nNhận {dateIn} · Trả {dateOut}.{tail}");
        }

        private async Task<string> BuildChangeSummaryAsync(
            Booking existing,
            PartnerBookingEvent e,
            int? mappedRoomTypeId,
            string fallbackRoomCode)
        {
            var sb = new StringBuilder();
            string fmt(DateTime? d) => d.HasValue ? d.Value.ToString("dd/MM/yyyy") : "-";

            if (!string.IsNullOrWhiteSpace(e.CheckIn))
            {
                var newIn = ParseDateOrToday(e.CheckIn);
                if (existing.CheckInDate?.Date != newIn)
                    sb.Append($"Ngày nhận {fmt(existing.CheckInDate)} → {newIn:dd/MM/yyyy}; ");
            }
            if (!string.IsNullOrWhiteSpace(e.CheckOut))
            {
                var newOut = ParseDateOrToday(e.CheckOut);
                if (existing.CheckOutDate?.Date != newOut)
                    sb.Append($"Ngày trả {fmt(existing.CheckOutDate)} → {newOut:dd/MM/yyyy}; ");
            }

            if (mappedRoomTypeId.HasValue && existing.RoomTypeID != mappedRoomTypeId.Value)
            {
                var oldName = await _db.RoomTypes.AsNoTracking()
                    .Where(r => r.RoomTypeID == existing.RoomTypeID)
                    .Select(r => r.Name)
                    .FirstOrDefaultAsync() ?? fallbackRoomCode;

                var newName = await _db.RoomTypes.AsNoTracking()
                    .Where(r => r.RoomTypeID == mappedRoomTypeId.Value)
                    .Select(r => r.Name)
                    .FirstOrDefaultAsync() ?? fallbackRoomCode;

                sb.Append($"Hạng phòng {oldName} → {newName}; ");
            }

            var oldAdults = TryGetNullableInt(existing, "Adults");
            var oldChildren = TryGetNullableInt(existing, "Children");

            if (oldAdults.HasValue && e.Adults != oldAdults.Value)
                sb.Append($"Người lớn {oldAdults.Value} → {e.Adults}; ");

            if (oldChildren.HasValue && e.Children != oldChildren.Value)
                sb.Append($"Trẻ em {oldChildren.Value} → {e.Children}; ");

            var incomingStatus = (e.Status ?? "").Trim();
            if (!string.IsNullOrEmpty(incomingStatus) &&
                !string.Equals(existing.Status, incomingStatus, StringComparison.OrdinalIgnoreCase))
            {
                sb.Append($"Trạng thái {existing.Status} → {incomingStatus}; ");
            }

            var result = sb.ToString().Trim();
            if (result.EndsWith(";")) result = result[..^1];
            return string.IsNullOrWhiteSpace(result) ? "Không có thay đổi đáng kể." : result;
        }

        /* ================== Handlers ================== */

        // ===== Đặt phòng mới =====
        public async Task HandleBookingCreatedAsync(PartnerBookingEvent e, int partnerId)
        {
            var mapped = await TryMapAsync(partnerId, e);
            if (mapped == null)
            {
                await HandleUnmappedAsync("bookings.created", partnerId, e, "Thiếu map Hotel/RoomType/RatePlan");
                return;
            }

            var (hotelId, roomTypeId, _) = mapped.Value;

            var existing = await _db.Bookings
                .FirstOrDefaultAsync(b => b.ExternalBookingId == e.ExternalBookingId);

            if (existing == null)
            {
                var b = new Booking
                {
                    HotelID = hotelId,
                    RoomTypeID = roomTypeId,
                    Status = string.IsNullOrWhiteSpace(e.Status) ? "Confirmed" : e.Status!,
                    BookingDate = DateTime.UtcNow,
                    ExternalBookingId = e.ExternalBookingId,
                    IsDeleted = false
                };

                TrySetProp(b, "CheckInDate", ParseDateOrToday(e.CheckIn));
                TrySetProp(b, "CheckOutDate", ParseDateOrToday(e.CheckOut));
                TrySetProp(b, "Adults", e.Adults);
                TrySetProp(b, "Children", e.Children);

                _db.Bookings.Add(b);
                await _db.SaveChangesAsync();
                existing = b;
            }
            else
            {
                existing.Status = string.IsNullOrWhiteSpace(e.Status) ? existing.Status : e.Status!;
                // giữ map non-nullable từ webhook
                if (existing.HotelID == 0) existing.HotelID = hotelId;
                existing.RoomTypeID = roomTypeId;

                TrySetProp(existing, "CheckInDate", ParseDateOrToday(e.CheckIn));
                TrySetProp(existing, "CheckOutDate", ParseDateOrToday(e.CheckOut));
                TrySetProp(existing, "Adults", e.Adults);
                TrySetProp(existing, "Children", e.Children);

                await _db.SaveChangesAsync();
            }

            // ===== Inventory: trừ phòng (dùng id đã map để đảm bảo non-null)
            var ci = ParseDateOrToday(e.CheckIn);
            var co = ParseDateOrToday(e.CheckOut);
            var reserved = await _inv.ReserveAsync(hotelId, roomTypeId, ci, co, rooms: 1);
            if (!reserved)
            {
                await _noti.AddAndBroadcastAsync(
                    targetRole: "Admin",
                    title: "⚠️ Hết phòng khi đồng bộ đơn (PartnerHotel)",
                    message: $"Không đủ phòng cho {e.HotelCode}/{e.RoomTypeCode} {ci:dd/MM/yyyy}→{co:dd/MM/yyyy}."
                );
            }

            var (hotelName, roomName) = await GetPrettyNamesAsync(hotelId, roomTypeId, e.HotelCode, e.RoomTypeCode);
            var dateIn = ci.ToString("dd/MM/yyyy");
            var dateOut = co.ToString("dd/MM/yyyy");

            await NotifyBothRolesAsync("bookings.created", hotelName, roomName, e.ExternalBookingId, dateIn, dateOut, e.Status);
        }

        // ===== Cập nhật =====
        public async Task HandleBookingModifiedAsync(PartnerBookingEvent e, int partnerId)
        {
            var mapped = await TryMapAsync(partnerId, e);
            if (mapped == null)
            {
                await HandleUnmappedAsync("bookings.modified", partnerId, e, "Thiếu map Hotel/RoomType/RatePlan");
                return;
            }

            var (mappedHotelId, mappedRoomTypeId, _) = mapped.Value;

            var existing = await _db.Bookings
                .FirstOrDefaultAsync(b => b.ExternalBookingId == e.ExternalBookingId);

            if (existing == null)
            {
                await HandleUnmappedAsync("bookings.modified", partnerId, e, "Không tìm thấy booking theo ExternalBookingId");
                return;
            }

            // Lưu lại cũ (nullable-safe)
            int? oldRoomTypeId = existing.RoomTypeID;
            DateTime oldCheckIn = existing.CheckInDate?.Date ?? ParseDateOrToday(e.CheckIn);
            DateTime oldCheckOut = existing.CheckOutDate?.Date ?? ParseDateOrToday(e.CheckOut);

            var changeSummary = await BuildChangeSummaryAsync(existing, e, mappedRoomTypeId, e.RoomTypeCode);

            // Áp thay đổi
            existing.Status = string.IsNullOrWhiteSpace(e.Status) ? existing.Status : e.Status!;
            existing.RoomTypeID = mappedRoomTypeId;

            TrySetProp(existing, "CheckInDate", ParseDateOrToday(e.CheckIn));
            TrySetProp(existing, "CheckOutDate", ParseDateOrToday(e.CheckOut));
            TrySetProp(existing, "Adults", e.Adults);
            TrySetProp(existing, "Children", e.Children);

            // nếu HotelID nullable/0, set theo map
            if ((existing.GetType().GetProperty("HotelID")?.GetValue(existing) as int?) is int exHotelId && exHotelId == 0)
                existing.HotelID = mappedHotelId;

            await _db.SaveChangesAsync();

            // Inventory: trả cũ (nếu có đủ id), rồi giữ mới
            try
            {
                int? exHotelIdNullable = existing.GetType().GetProperty("HotelID")?.GetValue(existing) as int?;
                int hIdForRelease = exHotelIdNullable ?? mappedHotelId;

                if (oldRoomTypeId.HasValue)
                {
                    await _inv.ReleaseAsync(hIdForRelease, oldRoomTypeId.Value, oldCheckIn, oldCheckOut, rooms: 1);
                }

                var newCi = existing.CheckInDate?.Date ?? ParseDateOrToday(e.CheckIn);
                var newCo = existing.CheckOutDate?.Date ?? ParseDateOrToday(e.CheckOut);
                int hIdForReserve = exHotelIdNullable ?? mappedHotelId;

                var ok = await _inv.ReserveAsync(hIdForReserve, mappedRoomTypeId, newCi, newCo, rooms: 1);

                if (!ok)
                {
                    await _noti.AddAndBroadcastAsync(
                        targetRole: "Admin",
                        title: "⚠️ Hết phòng khi cập nhật đơn (PartnerHotel)",
                        message: $"Không đủ phòng sau khi đổi đơn {e.ExternalBookingId} ({e.HotelCode}/{e.RoomTypeCode}) {newCi:dd/MM}→{newCo:dd/MM}."
                    );
                }
            }
            catch (Exception ex)
            {
                await _noti.AddAndBroadcastAsync(
                    targetRole: "Admin",
                    title: "⚠️ Lỗi cập nhật tồn kho",
                    message: $"Đơn {e.ExternalBookingId}: {ex.Message}"
                );
            }

            var (hotelName, roomName) = await GetPrettyNamesAsync(mappedHotelId, mappedRoomTypeId, e.HotelCode, e.RoomTypeCode);
            var dateIn = ParseDateOrToday(e.CheckIn).ToString("dd/MM/yyyy");
            var dateOut = ParseDateOrToday(e.CheckOut).ToString("dd/MM/yyyy");

            await NotifyBothRolesAsync(
                eventType: "bookings.modified",
                hotelName: hotelName,
                roomName: roomName,
                extId: e.ExternalBookingId,
                dateIn: dateIn,
                dateOut: dateOut,
                status: existing.Status,
                changeSummary: changeSummary
            );
        }

        // ===== Huỷ =====
        public async Task HandleBookingCanceledAsync(PartnerBookingEvent e, int partnerId)
        {
            var existing = await _db.Bookings
                .FirstOrDefaultAsync(b => b.ExternalBookingId == e.ExternalBookingId);

            if (existing == null)
            {
                await HandleUnmappedAsync("bookings.canceled", partnerId, e, "Không tìm thấy booking theo ExternalBookingId");
                return;
            }

            existing.Status = "Canceled";
            await _db.SaveChangesAsync();

            // Inventory: trả phòng — chỉ gọi khi có đủ id
            var ci = existing.CheckInDate?.Date ?? ParseDateOrToday(e.CheckIn);
            var co = existing.CheckOutDate?.Date ?? ParseDateOrToday(e.CheckOut);

            int? exHotelIdNullable = existing.GetType().GetProperty("HotelID")?.GetValue(existing) as int?;
            int? exRoomTypeIdNullable = existing.GetType().GetProperty("RoomTypeID")?.GetValue(existing) as int?;

            if (exHotelIdNullable.HasValue && exRoomTypeIdNullable.HasValue)
            {
                await _inv.ReleaseAsync(exHotelIdNullable.Value, exRoomTypeIdNullable.Value, ci, co, rooms: 1);
            }

            var (hotelName, roomName) = await GetPrettyNamesAsync(
                exHotelIdNullable, exRoomTypeIdNullable, e.HotelCode, e.RoomTypeCode);

            var dateIn = ci.ToString("dd/MM/yyyy");
            var dateOut = co.ToString("dd/MM/yyyy");

            await NotifyBothRolesAsync(
                eventType: "bookings.canceled",
                hotelName: hotelName,
                roomName: roomName,
                extId: e.ExternalBookingId,
                dateIn: dateIn,
                dateOut: dateOut,
                status: "Canceled",
                changeSummary: "Đơn đã bị hủy"
            );
        }
    }
}

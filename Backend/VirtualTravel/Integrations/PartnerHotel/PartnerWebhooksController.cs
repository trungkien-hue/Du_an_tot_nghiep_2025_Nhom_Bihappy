// File: Integrations/PartnerHotel/PartnerWebhooksController.cs
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using VirtualTravel.Data;
using VirtualTravel.Models;
using VirtualTravel.Options;

namespace VirtualTravel.Integrations.PartnerHotel
{
    [ApiController]
    [Route("webhooks/partner")]
    public sealed class PartnerWebhooksController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebhookVerifier _verifier;
        private readonly IOptions<PartnerHotelOptions> _opt;
        private readonly IIdempotencyStore _idem;
        private readonly IWebhookLogger _log;
        private readonly IBookingSyncService _sync;
        private readonly IAriSyncService _ari;
        private readonly IInventoryService _inventory;

        public PartnerWebhooksController(
            AppDbContext db,
            IWebhookVerifier verifier,
            IOptions<PartnerHotelOptions> options,
            IIdempotencyStore idem,
            IWebhookLogger logger,
            IBookingSyncService sync,
            IAriSyncService ari,
            IInventoryService inventory)
        {
            _db = db;
            _verifier = verifier;
            _opt = options;
            _idem = idem;
            _log = logger;
            _sync = sync;
            _ari = ari;
            _inventory = inventory;
        }

        private int ResolvePartnerId() => _opt.Value.PartnerId <= 0 ? 1 : _opt.Value.PartnerId;

        [HttpPost("bookings.created")]
        public Task<IActionResult> BookingCreated() =>
            HandleBookingEventAsync("bookings.created", (e, pid) => _sync.HandleBookingCreatedAsync(e, pid));

        [HttpPost("bookings.modified")]
        public Task<IActionResult> BookingModified() =>
            HandleBookingEventAsync("bookings.modified", (e, pid) => _sync.HandleBookingModifiedAsync(e, pid));

        [HttpPost("bookings.canceled")]
        public Task<IActionResult> BookingCanceled() =>
            HandleBookingEventAsync("bookings.canceled", (e, pid) => _sync.HandleBookingCanceledAsync(e, pid));

        [HttpPost("ari.changed")]
        public async Task<IActionResult> AriChanged()
        {
            var (raw, sig, ts) = await ReadRequestAsync(Request);
            if (!_verifier.Verify(raw, sig, ts, _opt.Value.WebhookSecret))
            {
                await _log.LogAsync(new WebhookLog { EventType = "ari.changed", StatusCode = 401, Signature = sig, Payload = raw });
                return Unauthorized();
            }

            string? eventId = null;
            try
            {
                using var doc = JsonDocument.Parse(raw);
                if (doc.RootElement.TryGetProperty("eventId", out var ev))
                    eventId = ev.GetString();
            }
            catch { /* ignore */ }

            if (!string.IsNullOrWhiteSpace(eventId) && await _idem.ExistsAsync(eventId))
            {
                await _log.LogAsync(new WebhookLog { EventType = "ari.changed", EventId = eventId, StatusCode = 200, Signature = sig, Payload = raw });
                return Ok();
            }

            try
            {
                await _ari.HandleAriChangedAsync(raw, sig, eventId);
                if (!string.IsNullOrWhiteSpace(eventId)) await _idem.RememberAsync(eventId);
                await _log.LogAsync(new WebhookLog { EventType = "ari.changed", EventId = eventId, StatusCode = 200, Signature = sig, Payload = raw });
                return Ok();
            }
            catch (Exception ex)
            {
                await _log.LogAsync(new WebhookLog { EventType = "ari.changed", EventId = eventId, StatusCode = 500, Signature = sig, Payload = raw, Error = ex.ToString() });
                return StatusCode(500);
            }
        }

        // ===== Helper chung cho 3 sự kiện booking.* + inventory =====
        private async Task<IActionResult> HandleBookingEventAsync(
            string eventType,
            Func<PartnerBookingEvent, int, Task> handler)
        {
            var (raw, sig, ts) = await ReadRequestAsync(Request);
            if (!_verifier.Verify(raw, sig, ts, _opt.Value.WebhookSecret))
            {
                await _log.LogAsync(new WebhookLog { EventType = eventType, StatusCode = 401, Signature = sig, Payload = raw });
                return Unauthorized();
            }

            PartnerBookingEvent? dto;
            try
            {
                dto = JsonSerializer.Deserialize<PartnerBookingEvent>(raw,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (Exception ex)
            {
                await _log.LogAsync(new WebhookLog { EventType = eventType, StatusCode = 400, Signature = sig, Payload = raw, Error = "Bad JSON: " + ex.Message });
                return BadRequest();
            }

            if (dto == null || string.IsNullOrWhiteSpace(dto.EventId))
            {
                await _log.LogAsync(new WebhookLog { EventType = eventType, StatusCode = 400, Signature = sig, Payload = raw, Error = "Missing EventId" });
                return BadRequest();
            }

            if (await _idem.ExistsAsync(dto.EventId))
            {
                await _log.LogAsync(new WebhookLog { EventType = eventType, EventId = dto.EventId, StatusCode = 200, Signature = sig, Payload = raw });
                return Ok();
            }

            // Lấy ảnh chụp booking TRƯỚC khi sync (để xử lý modified)
            Booking? before = null;
            if (!string.IsNullOrWhiteSpace(dto.ExternalBookingId))
            {
                before = await _db.Bookings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(b => b.ExternalBookingId == dto.ExternalBookingId);
            }

            try
            {
                var pid = ResolvePartnerId();

                // Upsert/đồng bộ booking như hiện tại
                await handler(dto, pid);

                // Lấy booking SAU khi sync (để biết RoomType/Ngày/QTY chính xác)
                Booking? after = null;
                if (!string.IsNullOrWhiteSpace(dto.ExternalBookingId))
                {
                    after = await _db.Bookings
                        .AsNoTracking()
                        .FirstOrDefaultAsync(b => b.ExternalBookingId == dto.ExternalBookingId);
                }

                // ====== INVENTORY APPLY ======
                if (after != null && after.RoomTypeID.HasValue && after.HotelID.HasValue &&
                    after.CheckInDate.HasValue && after.CheckOutDate.HasValue)
                {
                    var hId = after.HotelID!.Value;
                    var rtId = after.RoomTypeID!.Value;
                    var newCi = after.CheckInDate!.Value.Date;
                    var newCo = after.CheckOutDate!.Value.Date;
                    var newQty = after.Quantity > 0 ? after.Quantity : 1;

                    if (eventType == "bookings.created")
                    {
                        // TRỪ
                        await _inventory.ReserveAsync(hId, rtId, newCi, newCo, newQty);
                    }
                    else if (eventType == "bookings.canceled")
                    {
                        // CỘNG
                        await _inventory.ReleaseAsync(hId, rtId, newCi, newCo, newQty);
                    }
                    else if (eventType == "bookings.modified")
                    {
                        // Nếu đã có đơn trước đó -> trả lại khoảng cũ
                        if (before != null && before.RoomTypeID.HasValue && before.HotelID.HasValue &&
                            before.CheckInDate.HasValue && before.CheckOutDate.HasValue)
                        {
                            var oldH = before.HotelID!.Value;
                            var oldRt = before.RoomTypeID!.Value;
                            var oldCi = before.CheckInDate!.Value.Date;
                            var oldCo = before.CheckOutDate!.Value.Date;
                            var oldQty = before.Quantity > 0 ? before.Quantity : 1;

                            await _inventory.ReleaseAsync(oldH, oldRt, oldCi, oldCo, oldQty);
                        }

                        // Giữ khoảng mới
                        await _inventory.ReserveAsync(hId, rtId, newCi, newCo, newQty);
                    }
                }
                // =================================

                await _idem.RememberAsync(dto.EventId);
                await _log.LogAsync(new WebhookLog { EventType = eventType, EventId = dto.EventId, StatusCode = 200, Signature = sig, Payload = raw });
                return Ok();
            }
            catch (Exception ex)
            {
                await _log.LogAsync(new WebhookLog { EventType = eventType, EventId = dto.EventId, StatusCode = 500, Signature = sig, Payload = raw, Error = ex.ToString() });
                return StatusCode(500);
            }
        }

        private static async Task<(string raw, string sig, string ts)> ReadRequestAsync(HttpRequest req)
        {
            req.EnableBuffering();
            using var reader = new StreamReader(req.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true);
            var raw = await reader.ReadToEndAsync();
            req.Body.Position = 0;
            var sig = req.Headers["X-Signature"].ToString();
            var ts = req.Headers["X-Timestamp"].ToString();
            return (raw, sig, ts);
        }
    }
}

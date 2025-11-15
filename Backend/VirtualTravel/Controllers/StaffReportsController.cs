// File: Controllers/StaffReportsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using VirtualTravel.Data;
using VirtualTravel.Models;
using VirtualTravel.Hubs;
using VirtualTravel.Integrations.PartnerHotel;

namespace VirtualTravel.Controllers
{
    [ApiController]
    [Route("api/staff")]
    public sealed class StaffReportsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<NotificationHub> _notiHub;                  // staff/admin hub
        private readonly IHubContext<PartnerNotificationHub> _partnerHub;       // ✅ partner hub
        private readonly IPartnerWebhookSender _partnerSender;

        public StaffReportsController(
            AppDbContext db,
            IHubContext<NotificationHub> notiHub,
            IHubContext<PartnerNotificationHub> partnerHub,                      // ✅ inject
            IPartnerWebhookSender partnerSender)
        {
            _db = db;
            _notiHub = notiHub;
            _partnerHub = partnerHub;                                           // ✅
            _partnerSender = partnerSender;
        }

        // =====================================================================
        // GET /api/staff/orders/paged (giữ nguyên logic cũ)
        // =====================================================================
        [HttpGet("orders/paged")]
        public async Task<IActionResult> GetOrdersPaged(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string status = "Pending",
            [FromQuery] string keyword = "",
            [FromQuery] string type = "")
        {
            var query = _db.Bookings
                .Include(b => b.Hotel)
                .Include(b => b.RoomType)
                .Include(b => b.Tour)
                .Where(b => !b.IsDeleted);

            if (!string.IsNullOrWhiteSpace(status) && status != "All")
                query = query.Where(b => b.Status == status);

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(b =>
                    (b.FullName ?? "").Contains(keyword) ||
                    (b.HotelName ?? "").Contains(keyword) ||
                    (b.Location ?? "").Contains(keyword) ||
                    (b.Phone ?? "").Contains(keyword));

            if (!string.IsNullOrWhiteSpace(type))
            {
                if (type.Equals("hotel", StringComparison.OrdinalIgnoreCase))
                    query = query.Where(b => b.HotelID != null);
                else if (type.Equals("tour", StringComparison.OrdinalIgnoreCase))
                    query = query.Where(b => b.TourID != null);
            }

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(b => b.BookingDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new
                {
                    b.BookingID,
                    b.Status,
                    b.FullName,
                    b.Phone,
                    b.BookingDate,
                    b.CheckInDate,
                    b.CheckOutDate,
                    b.TotalPrice,
                    b.Quantity,
                    b.HotelName,
                    b.Location,
                    b.TourID,
                    TourName = b.Tour != null ? b.Tour.Name : null,
                    Hotel = b.Hotel != null ? b.Hotel.Name : null,
                    RoomType = b.RoomType != null ? b.RoomType.Name : null
                })
                .ToListAsync();

            return Ok(new { total, items, page, pageSize });
        }

        // =====================================================================
        // ✅ XÁC NHẬN: tạo BookingNight, trừ tồn mỗi đêm (day-use => 1 đêm)
        // =====================================================================
        [HttpPost("orders/confirm/{id:int}")]
        public async Task<IActionResult> ConfirmBooking(int id, CancellationToken ct)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            var booking = await _db.Bookings.FindAsync(new object[] { id }, ct);
            if (booking == null)
                return NotFound(new { message = $"Không tìm thấy đơn BookingID={id}." });

            if (booking.Status is "Completed" or "Confirmed")
                return BadRequest(new { message = "Đơn đã được xác nhận trước đó." });

            try
            {
                await CreateLedgerAndSubtractInventoryAsync(booking, ct); // ✅ ledger + tồn kho
                booking.Status = "Completed";

                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                await tx.RollbackAsync(ct);
                return Conflict(new { message = "Xác nhận đồng thời. Vui lòng thử lại." });
            }
            catch (InvalidOperationException ex)
            {
                await tx.RollbackAsync(ct);
                return BadRequest(new { message = ex.Message });
            }

            // 🔔 Notifications & SignalR (STAFF/ADMIN)
            var isRoomBooking = booking.RoomTypeID.HasValue || booking.HotelID.HasValue;
            var title = isRoomBooking ? "Đơn đặt phòng đã được xác nhận" : "Đơn tour đã được xác nhận";
            var message = isRoomBooking
                ? $"Đơn #{booking.BookingID} tại {booking.HotelName} ({booking.Location}) đã được xác nhận."
                : $"Đơn tour #{booking.BookingID} (TourID: {booking.TourID}) đã được xác nhận.";

            var notiStaff = new Notification
            {
                Title = title,
                Message = message,
                Type = "BookingConfirmed",
                BookingID = booking.BookingID,
                HotelID = booking.HotelID,
                RoomTypeID = booking.RoomTypeID,
                TargetRole = "Staff",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            var notiAdmin = new Notification
            {
                Title = title,
                Message = message,
                Type = "BookingConfirmed",
                BookingID = booking.BookingID,
                HotelID = booking.HotelID,
                RoomTypeID = booking.RoomTypeID,
                TargetRole = "Admin",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            // ✅ Thêm thông báo cho KHÁCH SẠN ĐỐI TÁC (Partner)
            Notification? notiPartner = null;
            if (booking.HotelID.HasValue)
            {
                notiPartner = new Notification
                {
                    Title = "Đơn đã được xác nhận",
                    Message = $"Đơn #{booking.BookingID} đã được xác nhận.",
                    Type = "BookingUpdated",                 // FE đang nghe "BookingUpdated"
                    BookingID = booking.BookingID,
                    HotelID = booking.HotelID,
                    RoomTypeID = booking.RoomTypeID,
                    TargetHotelId = booking.HotelID,        // ✅ để API lọc theo khách sạn
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
            }

            _db.Notifications.AddRange(notiStaff, notiAdmin);
            if (notiPartner != null) _db.Notifications.Add(notiPartner);
            await _db.SaveChangesAsync(ct);

            await _notiHub.Clients.Group("Staff").SendAsync("BookingStatusChanged", new
            {
                notiId = notiStaff.NotificationID,
                title = notiStaff.Title,
                message = notiStaff.Message,
                bookingId = booking.BookingID,
                status = booking.Status,
                createdAt = notiStaff.CreatedAt
            }, ct);

            await _notiHub.Clients.Group("Admin").SendAsync("BookingStatusChanged", new
            {
                notiId = notiAdmin.NotificationID,
                title = notiAdmin.Title,
                message = notiAdmin.Message,
                bookingId = booking.BookingID,
                status = booking.Status,
                createdAt = notiAdmin.CreatedAt
            }, ct);

            // ✅ BẮN REALTIME CHO PARTNER (nếu có HotelID)
            if (booking.HotelID.HasValue)
            {
                var payload = new
                {
                    type = "BookingUpdated",
                    title = "Đơn đã được xác nhận",
                    message = $"Đơn #{booking.BookingID} đã được xác nhận.",
                    bookingId = booking.BookingID,
                    hotelId = booking.HotelID!.Value,
                    createdAt = DateTime.UtcNow.ToString("o")
                };
                // Server hub sẽ add connection vào group theo hotelId; giả định tên group: "hotel-{id}"
                await _partnerHub.Clients.Group($"hotel-{booking.HotelID!.Value}").SendAsync("BookingUpdated", payload, ct);
            }

            // ✅ Webhook (nếu bật)
            await _partnerSender.SendBookingModifiedAsync(booking.BookingID, ct);

            return Ok(new { message = "✅ Xác nhận đơn thành công.", booking.Status });
        }

        // =====================================================================
        // 🛑 HỦY: chỉ trả tồn các đêm tương lai; ghi penalty (demo 1 đêm)
        // =====================================================================
        [HttpPost("orders/cancel/{id:int}")]
        public async Task<IActionResult> CancelBooking(int id, CancellationToken ct)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            var booking = await _db.Bookings.FindAsync(new object[] { id }, ct);
            if (booking == null)
                return NotFound(new { message = $"Không tìm thấy đơn BookingID={id}." });

            if (booking.Status == "Cancelled")
                return BadRequest(new { message = "Đơn này đã bị hủy trước đó." });

            try
            {
                if (booking.Status is "Completed" or "Confirmed")
                    await ReleaseFutureNightsAndReturnInventoryAsync(booking, ct); // ✅ trả tồn đêm tương lai

                booking.Status = "Cancelled";
                if (string.IsNullOrWhiteSpace(booking.Note))
                    booking.Note = "[Staff cancel]";

                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                await tx.RollbackAsync(ct);
                return Conflict(new { message = "Hủy đồng thời. Vui lòng thử lại." });
            }
            catch (InvalidOperationException ex)
            {
                await tx.RollbackAsync(ct);
                return BadRequest(new { message = ex.Message });
            }

            // 🔔 Notifications (STAFF/ADMIN)
            var isRoomBooking = booking.RoomTypeID.HasValue || booking.HotelID.HasValue;
            var title = isRoomBooking ? "Đơn đặt phòng đã bị hủy" : "Đơn tour đã bị hủy";
            var msg = isRoomBooking
                ? $"Đơn #{booking.BookingID} tại {booking.HotelName} ({booking.Location}) đã bị hủy."
                : $"Đơn tour #{booking.BookingID} (TourID: {booking.TourID}) đã bị hủy.";

            var notiStaff = new Notification
            {
                Title = title,
                Message = msg,
                Type = "BookingCancelled",
                BookingID = booking.BookingID,
                HotelID = booking.HotelID,
                RoomTypeID = booking.RoomTypeID,
                TargetRole = "Staff",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            var notiAdmin = new Notification
            {
                Title = title,
                Message = msg,
                Type = "BookingCancelled",
                BookingID = booking.BookingID,
                HotelID = booking.HotelID,
                RoomTypeID = booking.RoomTypeID,
                TargetRole = "Admin",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            // ✅ Thêm thông báo cho PARTNER (Hotel)
            Notification? notiPartner = null;
            if (booking.HotelID.HasValue)
            {
                notiPartner = new Notification
                {
                    Title = "Khách đã hủy đơn",
                    Message = $"Đơn #{booking.BookingID} đã bị hủy.",
                    Type = "BookingCancelled",              // FE sẽ hiển thị như hủy
                    BookingID = booking.BookingID,
                    HotelID = booking.HotelID,
                    RoomTypeID = booking.RoomTypeID,
                    TargetHotelId = booking.HotelID,        // để API lọc theo khách sạn
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
            }

            _db.Notifications.AddRange(notiStaff, notiAdmin);
            if (notiPartner != null) _db.Notifications.Add(notiPartner);
            await _db.SaveChangesAsync(ct);

            await _notiHub.Clients.Group("Staff").SendAsync("BookingStatusChanged", new
            {
                notiId = notiStaff.NotificationID,
                title = notiStaff.Title,
                message = notiStaff.Message,
                bookingId = booking.BookingID,
                status = booking.Status,
                createdAt = notiStaff.CreatedAt
            }, ct);

            await _notiHub.Clients.Group("Admin").SendAsync("BookingStatusChanged", new
            {
                notiId = notiAdmin.NotificationID,
                title = notiAdmin.Title,
                message = notiAdmin.Message,
                bookingId = booking.BookingID,
                status = booking.Status,
                createdAt = notiAdmin.CreatedAt
            }, ct);

            // ✅ BẮN REALTIME CHO PARTNER (Hotel)
            if (booking.HotelID.HasValue)
            {
                var payload = new
                {
                    type = "BookingCancelled",
                    title = "Khách đã hủy đơn",
                    message = $"Đơn #{booking.BookingID} đã bị hủy.",
                    bookingId = booking.BookingID,
                    hotelId = booking.HotelID!.Value,
                    createdAt = DateTime.UtcNow.ToString("o")
                };
                await _partnerHub.Clients.Group($"hotel-{booking.HotelID!.Value}").SendAsync("BookingCancelled", payload, ct);
            }

            // ✅ Webhook hủy (nếu bật)
            await _partnerSender.SendBookingCanceledAsync(booking.BookingID, reason: "Staff cancelled", ct);

            return Ok(new { message = "🛑 Hủy đơn thành công.", booking.Status });
        }

        // =====================================================================
        // BÁO CÁO (giữ nguyên code của bạn) ...
        // =====================================================================
        [HttpGet("reports/tours")]
        public async Task<IActionResult> GetTourReports(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string keyword = "",
            [FromQuery] int? month = null,
            [FromQuery] int? year = null)
        {
            var query = _db.Bookings
                .Include(b => b.Tour)
                .Where(b => !b.IsDeleted && b.TourID != null && b.Status == "Completed");

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(b => (b.Tour!.Name).Contains(keyword));

            if (month.HasValue)
                query = query.Where(b => b.BookingDate.Month == month.Value);

            if (year.HasValue)
                query = query.Where(b => b.BookingDate.Year == year.Value);

            var total = await query.CountAsync();
            var items = await query
                .GroupBy(b => b.Tour!.Name)
                .Select(g => new
                {
                    TourName = g.Key,
                    TotalBookings = g.Count(),
                    Revenue = g.Sum(x => x.TotalPrice)
                })
                .OrderByDescending(x => x.Revenue)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { total, items });
        }

        [HttpGet("reports/hotels")]
        public async Task<IActionResult> GetHotelReports(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string keyword = "",
            [FromQuery] int? month = null,
            [FromQuery] int? year = null)
        {
            var query = _db.Bookings
                .Include(b => b.Hotel)
                .Where(b => !b.IsDeleted && b.HotelID != null && b.Status == "Completed");

            if (!string.IsNullOrWhiteSpace(keyword))
                query = query.Where(b => (b.Hotel!.Name).Contains(keyword));

            if (month.HasValue)
                query = query.Where(b => b.BookingDate.Month == month.Value);

            if (year.HasValue)
                query = query.Where(b => b.BookingDate.Year == year.Value);

            var total = await query.CountAsync();
            var items = await query
                .GroupBy(b => b.Hotel!.Name)
                .Select(g => new
                {
                    HotelName = g.Key,
                    TotalBookings = g.Count(),
                    Revenue = g.Sum(x => x.TotalPrice)
                })
                .OrderByDescending(x => x.Revenue)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new { total, items });
        }

        [HttpGet("reports/tours/summary")]
        public async Task<IActionResult> GetTourSummary([FromQuery] int year)
        {
            var result = await _db.Bookings
                .Where(b => b.Status == "Completed" && b.TourID != null && b.BookingDate.Year == year)
                .GroupBy(b => b.BookingDate.Month)
                .Select(g => new { Month = g.Key, Revenue = g.Sum(b => b.TotalPrice) })
                .OrderBy(x => x.Month)
                .ToListAsync();

            return Ok(result);
        }

        [HttpGet("reports/hotels/summary")]
        public async Task<IActionResult> GetHotelSummary([FromQuery] int year)
        {
            var result = await _db.Bookings
                .Where(b => b.Status == "Completed" && b.HotelID != null && b.BookingDate.Year == year)
                .GroupBy(b => b.BookingDate.Month)
                .Select(g => new { Month = g.Key, Revenue = g.Sum(b => b.TotalPrice) })
                .OrderBy(x => x.Month)
                .ToListAsync();

            return Ok(result);
        }

        // =====================================================================
        // =============== HELPERS: Ledger + Inventory (HotelAvailability) ======
        // =====================================================================

        private static DateTime D(DateTime t) => t.Date;

        private decimal GetLockedUnitPrice(Booking booking, DateTime night)
        {
            if (booking?.Price is decimal p) return p;
            return 0m;
        }

        private async Task SubtractAvailabilityAsync(int hotelId, int roomTypeId, DateTime nightDate, int qty, CancellationToken ct)
        {
            var totalRooms = await _db.RoomTypes
                .Where(r => r.RoomTypeID == roomTypeId)
                .Select(r => r.TotalRooms)
                .FirstAsync(ct);

            var avail = await _db.HotelAvailabilities.SingleOrDefaultAsync(x =>
                x.HotelID == hotelId && x.RoomTypeID == roomTypeId && x.Date == nightDate, ct);

            if (avail == null)
            {
                avail = new HotelAvailability
                {
                    HotelID = hotelId,
                    RoomTypeID = roomTypeId,
                    Date = nightDate,
                    AvailableRooms = totalRooms,
                    IsDeleted = false,
                    Price = 0m
                };
                _db.HotelAvailabilities.Add(avail);
                await _db.SaveChangesAsync(ct);
            }

            if (avail.AvailableRooms < qty)
                throw new InvalidOperationException($"Ngày {nightDate:yyyy-MM-dd} chỉ còn {avail.AvailableRooms} phòng.");

            avail.AvailableRooms -= qty;
            _db.HotelAvailabilities.Update(avail);
        }

        private async Task AddAvailabilityAsync(int hotelId, int roomTypeId, DateTime nightDate, int qty, CancellationToken ct)
        {
            var totalRooms = await _db.RoomTypes
                .Where(r => r.RoomTypeID == roomTypeId)
                .Select(r => r.TotalRooms)
                .FirstAsync(ct);

            var avail = await _db.HotelAvailabilities.SingleOrDefaultAsync(x =>
                x.HotelID == hotelId && x.RoomTypeID == roomTypeId && x.Date == nightDate, ct);

            if (avail == null)
            {
                avail = new HotelAvailability
                {
                    HotelID = hotelId,
                    RoomTypeID = roomTypeId,
                    Date = nightDate,
                    AvailableRooms = totalRooms,
                    IsDeleted = false,
                    Price = 0m
                };
                _db.HotelAvailabilities.Add(avail);
                await _db.SaveChangesAsync(ct);
            }

            avail.AvailableRooms += qty;
            _db.HotelAvailabilities.Update(avail);
        }

        // Xác nhận: sinh ledger từng đêm, gồm cả day-use (1 đêm)
        private async Task CreateLedgerAndSubtractInventoryAsync(Booking booking, CancellationToken ct)
        {
            if (!booking.HotelID.HasValue || !booking.RoomTypeID.HasValue || booking.CheckInDate is null || booking.CheckOutDate is null)
                return;

            var hotelId = booking.HotelID!.Value;
            var roomTypeId = booking.RoomTypeID!.Value;
            var qty = booking.Quantity <= 0 ? 1 : booking.Quantity;

            var ci = D(booking.CheckInDate.Value);
            var co = D(booking.CheckOutDate.Value);
            if (co < ci) throw new InvalidOperationException("Khoảng ngày CheckIn/CheckOut không hợp lệ.");

            bool isDayUse = (co == ci);
            var end = isDayUse ? ci.AddDays(1) : co;

            for (var d = ci; d < end; d = d.AddDays(1))
            {
                await SubtractAvailabilityAsync(hotelId, roomTypeId, d, qty, ct);

                var exists = await _db.BookingNights.AnyAsync(x => x.BookingID == booking.BookingID && x.NightDate == d, ct);
                if (!exists)
                {
                    _db.BookingNights.Add(new BookingNight
                    {
                        BookingID = booking.BookingID,
                        NightDate = d,
                        Quantity = qty,
                        UnitPrice = GetLockedUnitPrice(booking, d),
                        State = "Held",
                        InventoryAdjusted = true
                    });
                }
            }
        }

        // Hủy: auto-consume đêm quá khứ; đêm tương lai => Released/Penalized (demo phạt 1 đêm)
        private async Task ReleaseFutureNightsAndReturnInventoryAsync(Booking booking, CancellationToken ct)
        {
            if (!booking.HotelID.HasValue || !booking.RoomTypeID.HasValue || booking.CheckInDate is null || booking.CheckOutDate is null)
                return;

            var today = DateTime.UtcNow.Date;

            // Quá khứ: chuyển Held -> Consumed
            var pastHeld = await _db.BookingNights
                .Where(x => x.BookingID == booking.BookingID && x.NightDate < today && x.State == "Held")
                .ToListAsync(ct);

            foreach (var n in pastHeld)
            {
                n.State = "Consumed";
                n.ConsumedAt = DateTime.UtcNow;
                _db.BookingNights.Update(n);
            }

            // Tương lai
            var futureHeld = await _db.BookingNights
                .Where(x => x.BookingID == booking.BookingID && x.NightDate >= today && x.State == "Held")
                .OrderBy(x => x.NightDate)
                .ToListAsync(ct);

            int penaltyNights = futureHeld.Any() ? 1 : 0;

            for (int i = 0; i < futureHeld.Count; i++)
            {
                var n = futureHeld[i];
                if (i < penaltyNights)
                {
                    n.State = "Penalized";
                    n.PenalizedAt = DateTime.UtcNow;
                    n.PenaltyAmount = n.UnitPrice * n.Quantity;

                    if (n.InventoryAdjusted)
                        await AddAvailabilityAsync(booking.HotelID!.Value, booking.RoomTypeID!.Value, n.NightDate, n.Quantity, ct);

                    n.InventoryAdjusted = true;
                    _db.BookingNights.Update(n);
                }
                else
                {
                    n.State = "Released";
                    n.ReleasedAt = DateTime.UtcNow;

                    if (n.InventoryAdjusted)
                        await AddAvailabilityAsync(booking.HotelID!.Value, booking.RoomTypeID!.Value, n.NightDate, n.Quantity, ct);

                    n.InventoryAdjusted = true;
                    _db.BookingNights.Update(n);
                }
            }
        }
    }
}

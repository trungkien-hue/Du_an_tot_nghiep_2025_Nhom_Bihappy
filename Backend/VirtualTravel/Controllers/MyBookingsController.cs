// /Controllers/MyBookingsController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VirtualTravel.Data;
using VirtualTravel.Dtos.Bookings;
using VirtualTravel.Hubs;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MyBookingsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<NotificationHub> _notiHub;

        public MyBookingsController(AppDbContext db, IHubContext<NotificationHub> notiHub)
        {
            _db = db;
            _notiHub = notiHub;
        }

        private int GetUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(id))
                throw new UnauthorizedAccessException();
            return int.Parse(id);
        }

        // ===== helper: tạo 2 noti cho Admin & Staff + đẩy SignalR =====
        private async Task AnnounceToAdminAndStaff(string title, string message, int bookingId, string eventType, string status)
        {
            var notiStaff = new Notification
            {
                Title = title,
                Message = message,
                Type = eventType,
                BookingID = bookingId,
                TargetRole = "Staff",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            var notiAdmin = new Notification
            {
                Title = title,
                Message = message,
                Type = eventType,
                BookingID = bookingId,
                TargetRole = "Admin",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _db.Notifications.AddRange(notiStaff, notiAdmin);
            await _db.SaveChangesAsync();

            var payload = new { bookingId = bookingId, status, title, message };
            await _notiHub.Clients.Group("Staff").SendAsync("OrderUpdated", payload);
            await _notiHub.Clients.Group("Admin").SendAsync("OrderUpdated", payload);
        }

        [HttpGet]
        public async Task<IActionResult> GetMyBookings([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var userId = GetUserId();

            var q = _db.Bookings
                .AsNoTracking()
                .Include(b => b.User)
                .Include(b => b.Tour)
                .Include(b => b.Hotel)
                .Include(b => b.RoomType)
                .Include(b => b.HotelAvailability)
                .Where(b => !b.IsDeleted
                            && !b.IsHiddenByUser
                            && b.UserID == userId);

            var total = await q.CountAsync();

            var items = await q
                .OrderByDescending(b => b.BookingDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new MyBookingListItemDto(
                    b.BookingID,
                    b.Hotel != null ? b.Hotel.Name : b.HotelName,
                    b.Tour != null ? b.Tour.Name : null,
                    b.Location,
                    b.BookingDate,
                    b.CheckInDate,
                    b.CheckOutDate,
                    b.NumberOfGuests,
                    b.Quantity,
                    /* effective price */ b.Price ?? (b.HotelAvailability != null ? b.HotelAvailability.Price : 0m),
                    b.TotalPrice,
                    b.Status,
                    b.User != null ? b.User.FullName : string.Empty,
                    b.Tour != null ? "Tour" : "Hotel"
                ))
                .ToListAsync();

            return Ok(new { total, items });
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetBookingDetail(int id)
        {
            var userId = GetUserId();

            var b = await _db.Bookings
                .AsNoTracking()
                .Include(x => x.RoomType)
                .Include(x => x.Tour)
                .Include(x => x.Hotel)
                .Include(x => x.HotelAvailability)
                .Include(x => x.User)
                .FirstOrDefaultAsync(x => x.BookingID == id
                                           && !x.IsDeleted
                                           && !x.IsHiddenByUser
                                           && x.UserID == userId);

            if (b == null) return NotFound();

            var effectivePrice = b.Price ?? (b.HotelAvailability?.Price ?? 0);

            var dto = new MyBookingDetailDto(
                b.BookingID,
                b.Hotel != null ? b.Hotel.Name : b.HotelName,
                b.Location,
                b.BookingDate,
                b.CheckInDate,
                b.CheckOutDate,
                b.NumberOfGuests,
                b.Quantity,
                effectivePrice,
                b.TotalPrice,
                b.Status,
                b.RoomType?.Name,
                b.Tour?.Name,
                b.User?.FullName ?? string.Empty,
                b.Tour != null ? "Tour" : "Hotel"
            );

            return Ok(dto);
        }

        // ===== NEW: Update đơn hàng =====
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] MyBookingUpdateDto dto)
        {
            var userId = GetUserId();

            var b = await _db.Bookings
                .Include(x => x.HotelAvailability)
                .Include(x => x.Tour)
                .Include(x => x.Hotel)
                .FirstOrDefaultAsync(x => x.BookingID == id
                                           && !x.IsDeleted
                                           && !x.IsHiddenByUser
                                           && x.UserID == userId);
            if (b == null) return NotFound();

            if (b.Status is "Completed" or "Canceled")
                return BadRequest("Đơn đã hoàn tất/đã hủy, không thể cập nhật.");

            // cập nhật an toàn từng trường
            if (dto.CheckInDate.HasValue) b.CheckInDate = dto.CheckInDate;
            if (dto.CheckOutDate.HasValue) b.CheckOutDate = dto.CheckOutDate;
            if (dto.NumberOfGuests.HasValue) b.NumberOfGuests = Math.Max(0, dto.NumberOfGuests.Value);
            if (dto.Quantity.HasValue) b.Quantity = Math.Max(1, dto.Quantity.Value);

            // tính lại thành tiền
            var price = b.Price ?? (b.HotelAvailability?.Price ?? 0m);
            b.TotalPrice = price * b.Quantity;

            await _db.SaveChangesAsync();

            // Thông báo cho Admin & Staff (Tour hoặc Hotel đều thông báo)
            var name = b.TourID != null ? (b.Tour?.Name ?? "(tour)") : (b.Hotel?.Name ?? b.HotelName ?? "(khách sạn)");
            var title = "Khách hàng đã cập nhật đơn";
            var message = $"Đơn #{b.BookingID} - {(b.TourID != null ? "Tour" : "Hotel")}: {name}\n" +
                          $"Ngày: {b.CheckInDate:dd/MM/yyyy} → {b.CheckOutDate:dd/MM/yyyy}, SL: {b.Quantity}, Khách: {b.NumberOfGuests}";
            await AnnounceToAdminAndStaff(title, message, b.BookingID, "OrderUpdated", b.Status ?? "Updated");

            return Ok(new
            {
                b.BookingID,
                b.CheckInDate,
                b.CheckOutDate,
                b.NumberOfGuests,
                b.Quantity,
                Price = price,
                b.TotalPrice,
                b.Status
            });
        }

        [HttpPut("{id:int}/cancel")]
        public async Task<IActionResult> Cancel(int id, [FromBody] CancelBookingDto? dto)
        {
            var userId = GetUserId();

            var b = await _db.Bookings
                .Include(x => x.Tour)
                .Include(x => x.Hotel)
                .FirstOrDefaultAsync(x => x.BookingID == id
                                           && !x.IsDeleted
                                           && !x.IsHiddenByUser
                                           && x.UserID == userId);
            if (b == null) return NotFound();

            if (b.Status is "Completed" or "Canceled")
                return BadRequest("Không thể hủy đơn đã hoàn tất/đã hủy.");

            b.Status = "Canceled";
            await _db.SaveChangesAsync();

            // Thông báo cho cả Admin & Staff, áp dụng cho Tour và Hotel
            var name = b.TourID != null ? (b.Tour?.Name ?? "(tour)") : (b.Hotel?.Name ?? b.HotelName ?? "(khách sạn)");
            var title = b.TourID != null ? "Khách hàng đã hủy tour" : "Khách hàng đã hủy đặt phòng";
            var message = $"Đơn #{b.BookingID} - {(b.TourID != null ? "Tour" : "Hotel")}: {name}\n" +
                          $"Lý do: {dto?.Reason ?? "Không cung cấp"}";
            await AnnounceToAdminAndStaff(title, message, b.BookingID, "OrderUpdated", b.Status);

            return Ok(new { b.BookingID, b.Status });
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> HideForUser(int id)
        {
            var userId = GetUserId();

            var b = await _db.Bookings.FirstOrDefaultAsync(x => x.BookingID == id
                                                                && !x.IsDeleted
                                                                && x.UserID == userId);
            if (b == null) return NotFound();

            if (!b.IsHiddenByUser)
            {
                b.IsHiddenByUser = true;
                await _db.SaveChangesAsync();
            }

            return NoContent();
        }
    }

    public record CancelBookingDto(string? Reason);
}

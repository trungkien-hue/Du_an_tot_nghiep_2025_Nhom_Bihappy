// File: Controllers/AdminBookingsController.cs
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization; // dùng khi cần
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;
using VirtualTravel.Hubs;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers
{
    // Route riêng cho Admin quản lý tất cả booking (hotel + tour)
    // => /api/admin/bookings
    [ApiController]
    [Route("api/admin/bookings")]
    // [Authorize(Roles = "Admin,Staff")] // bật lại khi đã cấu hình auth
    public class AdminBookingsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<NotificationHub> _notiHub;

        public AdminBookingsController(AppDbContext db, IHubContext<NotificationHub> notiHub)
        {
            _db = db;
            _notiHub = notiHub;
        }

        // 1. Lấy danh sách + Tìm kiếm + Lọc
        // GET: /api/admin/bookings?status=Pending&search=...
        [HttpGet]
        [ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<IActionResult> GetAllBookings(
            [FromQuery] string? status,
            [FromQuery] string? search,
            CancellationToken ct)
        {
            var query = _db.Bookings
                .AsNoTracking()
                .Where(b => !b.IsDeleted);

            // Lọc theo trạng thái
            if (!string.IsNullOrWhiteSpace(status) &&
                !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(b => b.Status == status);
            }

            // Tìm kiếm theo tên, phone, mã đơn
            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim().ToLower();
                var hasBookingId = int.TryParse(search, out var bookingId);

                query = query.Where(b =>
                    (b.FullName != null &&
                     EF.Functions.Like(b.FullName.ToLower(), $"%{search}%")) ||
                    (b.Phone != null && b.Phone.Contains(search)) ||
                    (hasBookingId && b.BookingID == bookingId)
                );
            }

            var list = await query
                .OrderByDescending(b => b.BookingDate)
                .Select(b => new AdminBookingDto
                {
                    BookingID = b.BookingID,
                    CustomerName = b.FullName,
                    Phone = b.Phone,
                    // gộp hotel + tour cho dễ nhìn
                    ServiceName = b.HotelName ??
                                  (b.TourID.HasValue ? "Tour du lịch" : "Dịch vụ khác"),
                    Date = b.CheckInDate ?? b.BookingDate,
                    Price = b.TotalPrice,
                    Status = b.Status,
                    IsHourly = b.IsHourly
                })
                .ToListAsync(ct);

            return Ok(list);
        }

        // 2. Thống kê Dashboard
        // GET: /api/admin/bookings/stats
        [HttpGet("stats")]
        [ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<IActionResult> GetStats(CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var startOfMonth = new DateTime(now.Year, now.Month, 1);

            var totalOrders = await _db.Bookings.CountAsync(b => !b.IsDeleted, ct);
            var pendingOrders = await _db.Bookings.CountAsync(
                b => !b.IsDeleted && b.Status == "Pending", ct);
            var completedOrders = await _db.Bookings.CountAsync(
                b => !b.IsDeleted && b.Status == "Completed", ct);

            var revenue = await _db.Bookings
                .Where(b => !b.IsDeleted &&
                            (b.Status == "Completed" || b.Status == "Confirmed") &&
                            b.BookingDate >= startOfMonth)
                .SumAsync(b => b.TotalPrice ?? 0, ct);

            return Ok(new
            {
                Total = totalOrders,
                Pending = pendingOrders,
                Completed = completedOrders,
                Revenue = revenue
            });
        }

        // 3. Cập nhật trạng thái
        // PUT: /api/admin/bookings/{id}/status
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(
            int id,
            [FromBody] UpdateStatusDto payload,
            CancellationToken ct)
        {
            var booking = await _db.Bookings.FindAsync(new object[] { id }, ct);
            if (booking == null)
                return NotFound("Không tìm thấy đơn hàng.");

            var oldStatus = booking.Status;
            booking.Status = payload.Status;

            if (payload.Status == "Cancelled")
            {
                booking.CancelledAt = DateTime.UtcNow;
            }
            else if (payload.Status == "Completed" && !booking.CheckedOutAt.HasValue)
            {
                booking.CheckedOutAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync(ct);

            // bắn realtime cho Staff (nếu đang mở màn hình Staff Orders)
            await _notiHub.Clients.Group("Staff")
                .SendAsync("StatusUpdated",
                    new { bookingId = id, status = payload.Status }, ct);

            return Ok(new
            {
                Message = "Cập nhật thành công",
                OldStatus = oldStatus,
                NewStatus = payload.Status
            });
        }

        // 4. Xóa đơn (soft delete)
        // DELETE: /api/admin/bookings/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var booking = await _db.Bookings.FindAsync(new object[] { id }, ct);
            if (booking == null) return NotFound();

            booking.IsDeleted = true;
            await _db.SaveChangesAsync(ct);

            return Ok(new { Message = "Đã xóa đơn hàng." });
        }
    }

    // DTO trả ra cho FE Admin
    public class AdminBookingDto
    {
        public int BookingID { get; set; }
        public string? CustomerName { get; set; }
        public string? Phone { get; set; }
        public string? ServiceName { get; set; }
        public DateTime? Date { get; set; }
        public decimal? Price { get; set; }
        public string Status { get; set; } = "Pending";
        public bool IsHourly { get; set; }
    }

    public class UpdateStatusDto
    {
        public string Status { get; set; } = "Pending";
    }
}

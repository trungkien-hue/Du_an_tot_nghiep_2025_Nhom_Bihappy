// Controllers/TourBookingsController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VirtualTravel.Data;
using VirtualTravel.Hubs;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TourBookingsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<NotificationHub> _notiHub;

        public TourBookingsController(AppDbContext db, IHubContext<NotificationHub> notiHub)
        {
            _db = db;
            _notiHub = notiHub;
        }

        private int GetUserIdFromToken()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(id))
                throw new UnauthorizedAccessException("Token không chứa UserID hợp lệ.");
            return int.Parse(id);
        }

        // DTO local cho khớp payload hiện có (giống file bạn đang dùng)
        public class TourBookingCreateDto
        {
            public int TourID { get; set; }
            public int? TourAvailabilityID { get; set; }
            public DateTime StartDate { get; set; }

            public int AdultGuests { get; set; }
            public int ChildGuests { get; set; }

            public decimal UnitPriceAdult { get; set; }
            public decimal UnitPriceChild { get; set; }

            public string FullName { get; set; } = "";
            public string Phone { get; set; } = "";
            public string? Requests { get; set; }

            // FE có thể gửi tổng tiền cuối cùng (ví dụ đã trừ 500k nếu thanh toán full)
            public decimal? TotalPrice { get; set; } // optional client
        }

        // POST: api/tourbookings
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TourBookingCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (dto == null) return BadRequest(new { message = "Payload rỗng." });
            if (dto.TourID <= 0) return BadRequest(new { message = "Thiếu TourID." });

            var userId = GetUserIdFromToken();

            // Lấy thông tin tour để hiển thị (Location/Name)
            var tour = await _db.Tours.AsNoTracking().FirstOrDefaultAsync(t => t.TourID == dto.TourID);
            if (tour == null) return NotFound(new { message = "Tour không tồn tại." });

            // Validate & clamp
            var adult = Math.Max(0, dto.AdultGuests);
            var child = Math.Max(0, dto.ChildGuests);
            if (adult + child <= 0)
                return BadRequest(new { message = "Vui lòng chọn ít nhất 1 khách." });

            var unitAdult = Math.Max(0m, dto.UnitPriceAdult);
            var unitChild = Math.Max(0m, dto.UnitPriceChild);

            // ===== TÍNH TỔNG GIÁ TRÊN SERVER (nguồn sự thật) =====
            var baseTotal = (unitAdult * adult) + (unitChild * child);

            // Mặc định dùng baseTotal
            var total = baseTotal;

            // Nếu FE gửi TotalPrice (ví dụ đã trừ 500k khi thanh toán 100%)
            // và giá đó hợp lý ( > 0 và <= baseTotal ) thì ưu tiên dùng
            if (dto.TotalPrice.HasValue && dto.TotalPrice.Value > 0)
            {
                var clientTotal = dto.TotalPrice.Value;

                // không cho phép clientTotal lớn hơn baseTotal để tránh bị chỉnh giá tăng/loạn
                if (clientTotal <= baseTotal)
                {
                    total = clientTotal;
                }
            }

            // Map vào bảng Bookings dùng chung
            var booking = new Booking
            {
                UserID = userId,

                TourID = dto.TourID,
                TourAvailabilityID = dto.TourAvailabilityID,

                // Dùng StartDate làm CheckInDate để thống nhất mốc thời gian
                CheckInDate = dto.StartDate,
                CheckOutDate = null,

                BookingDate = DateTime.UtcNow,
                Status = "Pending",
                IsDeleted = false,

                // Thông tin liên hệ
                FullName = dto.FullName,
                Phone = dto.Phone,

                // Hiển thị
                Location = tour.Location,

                // Tổng giá cuối cùng (có thể đã trừ 500k nếu thanh toán 100%)
                TotalPrice = total,
                NumberOfGuests = adult + child,

                // Không dùng các field bên khách sạn
                Price = null,
                Quantity = 1,
            };

            _db.Bookings.Add(booking);
            await _db.SaveChangesAsync();

            // 🔔 Notification + SignalR (StaffBell đang listen "BookingCreated")
            var msg = $"Khách {booking.FullName} đặt tour \"{tour.Name}\" ({tour.Location}).";
            var notiStaff = new Notification
            {
                Title = "Đơn tour mới",
                Message = msg,
                Type = "BookingCreated",
                BookingID = booking.BookingID,
                TargetRole = "Staff",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            var notiAdmin = new Notification
            {
                Title = notiStaff.Title,
                Message = notiStaff.Message,
                Type = notiStaff.Type,
                BookingID = booking.BookingID,
                TargetRole = "Admin",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _db.Notifications.AddRange(notiStaff, notiAdmin);
            await _db.SaveChangesAsync();

            await _notiHub.Clients.Group("Staff").SendAsync("BookingCreated", new
            {
                notiId = notiStaff.NotificationID,
                title = notiStaff.Title,
                message = notiStaff.Message,
                bookingId = booking.BookingID,
                createdAt = notiStaff.CreatedAt
            });
            await _notiHub.Clients.Group("Admin").SendAsync("BookingCreated", new
            {
                notiId = notiAdmin.NotificationID,
                title = notiAdmin.Title,
                message = notiAdmin.Message,
                bookingId = booking.BookingID,
                createdAt = notiAdmin.CreatedAt
            });

            return Ok(new
            {
                Message = "Đặt tour thành công",
                BookingID = booking.BookingID,
                booking.TotalPrice,
                booking.NumberOfGuests,
                booking.Status
            });
        }

        [HttpGet("user")]
        public async Task<IActionResult> GetByUser()
        {
            var userId = GetUserIdFromToken();
            var tours = await _db.Bookings
                .AsNoTracking()
                .Where(x => x.UserID == userId && x.TourID != null && !x.IsDeleted)
                .OrderByDescending(x => x.BookingDate)
                .ToListAsync();

            return Ok(tours);
        }
    }
}

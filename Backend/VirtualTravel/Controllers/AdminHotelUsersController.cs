using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.ComponentModel.DataAnnotations;
using System.Threading;
using System.Threading.Tasks;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers
{
    [ApiController]
    [Route("api/admin/hotel-users")]
    [Authorize(Roles = "Admin")] // ✅ dùng literal, không phụ thuộc AppRoles
    public class AdminHotelUsersController : ControllerBase
    {
        private readonly AppDbContext _db;
        private const string RoleHotel = "Hotel"; // ✅ role cho tài khoản khách sạn

        public AdminHotelUsersController(AppDbContext db)
        {
            _db = db;
        }

        public class CreateHotelUserDto
        {
            [Required] public int HotelID { get; set; }
            [Required] public string FullName { get; set; } = "";
            [Required, EmailAddress] public string Email { get; set; } = "";
            [Required] public string Password { get; set; } = ""; // TODO: hash
            public string? Phone { get; set; }
        }

        /// <summary>
        /// Tạo tài khoản role=Hotel, gắn đúng HotelID
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateHotelUserDto dto, CancellationToken ct)
        {
            var hotel = await _db.Hotels.FirstOrDefaultAsync(h => h.HotelID == dto.HotelID, ct);
            if (hotel == null) return BadRequest(new { message = "HotelID không tồn tại" });

            var emailExists = await _db.Users.AnyAsync(u => u.Email == dto.Email && !u.IsDeleted, ct);
            if (emailExists) return Conflict(new { message = "Email đã tồn tại" });

            var u = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                Phone = dto.Phone,
                PasswordHash = dto.Password, // TODO: hash
                Role = RoleHotel,            // ✅ "Hotel"
                HotelID = dto.HotelID,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(u);
            await _db.SaveChangesAsync(ct);
            return Ok(new { message = "Tạo tài khoản khách sạn thành công", userId = u.UserID });
        }

        public class SetHotelForUserDto
        {
            [Required] public int HotelID { get; set; }
        }

        /// <summary>
        /// Gán/đổi HotelID cho user role=Hotel
        /// </summary>
        [HttpPut("{userId:int}/set-hotel")]
        public async Task<IActionResult> SetHotel(int userId, [FromBody] SetHotelForUserDto dto, CancellationToken ct)
        {
            var u = await _db.Users.FirstOrDefaultAsync(x => x.UserID == userId && !x.IsDeleted, ct);
            if (u == null) return NotFound();

            if (!string.Equals(u.Role, RoleHotel, StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "User không phải role Hotel" });

            var hotel = await _db.Hotels.FirstOrDefaultAsync(h => h.HotelID == dto.HotelID, ct);
            if (hotel == null) return BadRequest(new { message = "HotelID không tồn tại" });

            u.HotelID = dto.HotelID;
            await _db.SaveChangesAsync(ct);
            return Ok(new { message = "Đã gán HotelID cho user", userId = u.UserID, hotelId = u.HotelID });
        }
    }

    // ❌ ĐỪNG khai báo AppRoles ở đây để tránh trùng.
    // Nếu project bạn có AppRoles dùng chung, giữ 1 file duy nhất cho nó.
}

// File: Controllers/AI/AiCustomerInfoController.cs
using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers.AI
{
    [ApiController]
    [Route("api/ai/customer-info")]
    [AllowAnonymous] // cho phép cả khách chưa đăng nhập
    public class AiCustomerInfoController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AiCustomerInfoController(AppDbContext db)
        {
            _db = db;
        }

        public class CustomerInfoDto
        {
            [Required]
            public string FullName { get; set; } = string.Empty;

            [Required]
            public string Phone { get; set; } = string.Empty;

            public string? Email { get; set; }

            // Có thể thêm nếu sau này cần
            public int? People { get; set; }
            public string? Note { get; set; }
            public string? Source { get; set; } = "AI_CHAT";
        }

        [HttpPost]
        public async Task<IActionResult> SaveFromChat(
            [FromBody] CustomerInfoDto dto,
            CancellationToken ct)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var fullName = dto.FullName?.Trim();
            var phone = dto.Phone?.Trim();
            var email = dto.Email?.Trim();

            if (string.IsNullOrWhiteSpace(fullName) || string.IsNullOrWhiteSpace(phone))
            {
                return BadRequest(new { message = "Vui lòng nhập họ tên và số điện thoại." });
            }

            // Tìm user theo Phone (ưu tiên) hoặc Email (nếu có)
            var existing = await _db.Users
                .Where(u => !u.IsDeleted)
                .Where(u =>
                    u.Phone == phone ||
                    (!string.IsNullOrEmpty(email) && u.Email == email))
                .OrderBy(u => u.UserID)
                .FirstOrDefaultAsync(ct);

            if (existing != null)
            {
                // Cập nhật lại thông tin cơ bản nếu cần
                if (!string.IsNullOrWhiteSpace(fullName) && existing.FullName != fullName)
                {
                    existing.FullName = fullName;
                }

                if (!string.IsNullOrWhiteSpace(email) && string.IsNullOrEmpty(existing.Email))
                {
                    existing.Email = email;
                }

                // Nếu trước đây là Lead thì giữ nguyên Role = "Lead"
                // Nếu đã là User/Admin/Hotel thì không đổi Role
                existing.CreatedAt = existing.CreatedAt == default
                    ? DateTime.UtcNow
                    : existing.CreatedAt;

                await _db.SaveChangesAsync(ct);

                return Ok(new
                {
                    userId = existing.UserID,
                    role = existing.Role,
                    existed = true
                });
            }

            // Chưa tồn tại => tạo mới user Lead
            var lead = new User
            {
                FullName = fullName!,
                Phone = phone!,
                Email = email ?? string.Empty,
                Role = "Lead",              // ⭐ khách tiềm năng
                PasswordHash = string.Empty,
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false,
                HotelID = null
            };

            _db.Users.Add(lead);
            await _db.SaveChangesAsync(ct);

            return Ok(new
            {
                userId = lead.UserID,
                role = lead.Role,
                existed = false
            });
        }
    }
}

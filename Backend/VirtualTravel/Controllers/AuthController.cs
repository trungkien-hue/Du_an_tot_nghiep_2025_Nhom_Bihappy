using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using VirtualTravel.Data;
using VirtualTravel.DTOs.Account;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers
{
    // tiện: gom tên role 1 chỗ
    public static class AppRoles
    {
        public const string Admin = "Admin";
        public const string Staff = "Staff";
        public const string User = "User";
        public const string AdminOrStaff = Admin + "," + Staff;
    }

    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        // ===== REGISTER =====
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (!Regex.IsMatch(request.Email, @"^[\w\.\-]+@gmail\.com$", RegexOptions.IgnoreCase))
                return BadRequest(new { message = "Email phải có định dạng @gmail.com" });

            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
                return BadRequest(new { message = "Email đã được sử dụng." });

            var user = new User
            {
                FullName = request.FullName,
                Email = request.Email,
                Phone = request.Phone,
                PasswordHash = request.Password,
                Role = AppRoles.User,              // mặc định: User
                CreatedAt = DateTime.Now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đăng ký thành công" });
        }

        // ===== LOGIN =====
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.Email == request.LoginIdentifier ||
                u.Phone == request.LoginIdentifier ||
                u.FullName == request.LoginIdentifier
            );

            if (user == null || user.IsDeleted)
                return Unauthorized(new { message = "Tài khoản không tồn tại hoặc đã bị khóa" });

            if (request.Password != user.PasswordHash)
                return Unauthorized(new { message = "Mật khẩu không đúng" });

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_config["Jwt:Key"]);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
                    new Claim(ClaimTypes.Name, user.FullName),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role) // có thể là Admin/Staff/User
                }),
                Expires = DateTime.UtcNow.AddMinutes(double.Parse(_config["Jwt:DurationInMinutes"])),
                Issuer = _config["Jwt:Issuer"],
                Audience = _config["Jwt:Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);

            return Ok(new
            {
                token = tokenHandler.WriteToken(token),
                user = new
                {
                    user.UserID,
                    user.FullName,
                    user.Email,
                    user.Role,
                    user.Phone
                }
            });
        }

        // ===== ADMIN + STAFF: Xem danh sách người dùng =====
        [HttpGet("all")]
        [Authorize(Roles = AppRoles.AdminOrStaff)]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _context.Users
                .Select(u => new
                {
                    u.UserID,
                    u.FullName,
                    u.Email,
                    u.Phone,
                    u.Role,
                    u.IsDeleted,
                    u.CreatedAt
                })
                .ToListAsync();

            return Ok(users);
        }

        // ===== ADMIN: Xóa mềm tài khoản =====
        [HttpPut("soft-delete/{id}")]
        [Authorize(Roles = AppRoles.Admin)]
        public async Task<IActionResult> SoftDeleteUser(int id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserID == id);
            if (user == null)
                return NotFound(new { message = "User không tồn tại" });

            user.IsDeleted = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã khóa tài khoản người dùng" });
        }

        // ===== ADMIN: Khôi phục tài khoản =====
        [HttpPut("restore/{id}")]
        [Authorize(Roles = AppRoles.Admin)]
        public async Task<IActionResult> RestoreUser(int id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserID == id);
            if (user == null)
                return NotFound(new { message = "User không tồn tại" });

            user.IsDeleted = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Khôi phục tài khoản thành công" });
        }

        // ===== ADMIN: Đổi vai trò người dùng =====
        [HttpPut("role/{id}")]
        [Authorize(Roles = AppRoles.Admin)]
        public async Task<IActionResult> ChangeUserRole(int id, [FromBody] string newRole)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserID == id);
            if (user == null)
                return NotFound(new { message = "User không tồn tại" });

            user.Role = newRole; // "Admin" | "Staff" | "User"
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Đã đổi vai trò của {user.FullName} thành {newRole}" });
        }

        // ===== ADMIN: Reset password =====
        [HttpPost("reset-password")]
        [Authorize(Roles = AppRoles.Admin)]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserID == request.UserID);
            if (user == null)
                return NotFound(new { message = "User không tồn tại" });

            user.PasswordHash = request.NewPassword;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Reset password thành công" });
        }

        // ===== USER: Đổi mật khẩu của chính mình =====
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                return Unauthorized(new { message = "Token không hợp lệ" });

            int userId = int.Parse(userIdClaim.Value);
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserID == userId);

            if (user == null)
                return NotFound(new { message = "User không tồn tại" });

            if (request.OldPassword != user.PasswordHash)
                return BadRequest(new { message = "Mật khẩu cũ không đúng" });

            user.PasswordHash = request.NewPassword;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đổi mật khẩu thành công" });
        }
    }
}

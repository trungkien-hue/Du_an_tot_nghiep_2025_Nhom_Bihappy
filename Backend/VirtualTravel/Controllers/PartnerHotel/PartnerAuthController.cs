using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using VirtualTravel.Data;

namespace VirtualTravel.Controllers.PartnerHotel
{
    [ApiController]
    [Route("api/partner/auth")]
    public class PartnerAuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _cfg;

        public PartnerAuthController(AppDbContext db, IConfiguration cfg)
        {
            _db = db;
            _cfg = cfg;
        }

        public class PartnerLoginDto
        {
            public string Email { get; set; } = "";
            public string Password { get; set; } = "";
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] PartnerLoginDto dto, CancellationToken ct)
        {
            var user = await _db.Users
                .FirstOrDefaultAsync(x => x.Email == dto.Email && !x.IsDeleted, ct);

            if (user == null) return Unauthorized(new { message = "Tài khoản không tồn tại" });
            if (!string.Equals(user.Role, AppRoles.Hotel, StringComparison.OrdinalIgnoreCase))
                return Unauthorized(new { message = "Không phải tài khoản khách sạn" });

            // TODO: thay bằng verify hash
            if (!string.Equals(user.PasswordHash, dto.Password))
                return Unauthorized(new { message = "Mật khẩu không đúng" });

            if (!user.HotelID.HasValue)
                return Unauthorized(new { message = "Tài khoản khách sạn chưa gắn HotelID" });

            // Build JWT theo cấu hình Program.cs
            var issuer = _cfg["Jwt:Issuer"] ?? "VirtualTravelAPI";
            var audience = _cfg["Jwt:Audience"] ?? "VirtualTravelClient";
            var key = _cfg["Jwt:Key"] ?? throw new InvalidOperationException("Missing Jwt:Key");
            var minutes = int.TryParse(_cfg["Jwt:DurationInMinutes"], out var d) ? d : 60;

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
                new Claim(ClaimTypes.Name, user.FullName ?? user.Email),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, AppRoles.Hotel),
                new Claim("hotelId", user.HotelID.Value.ToString())
            };

            var creds = new SigningCredentials(new SymmetricSecurityKey(Encoding.ASCII.GetBytes(key)), SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                notBefore: DateTime.UtcNow,
                expires: DateTime.UtcNow.AddMinutes(minutes),
                signingCredentials: creds
            );

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);
            return Ok(new { token = jwt, role = AppRoles.Hotel, hotelId = user.HotelID });
        }
    }

    // LƯU Ý: AppRoles phải chỉ có 1 bản duy nhất trong toàn project
    public static class AppRoles
    {
        public const string Admin = "Admin";
        public const string Staff = "Staff";
        public const string User = "User";
        public const string Hotel = "Hotel";
    }
}

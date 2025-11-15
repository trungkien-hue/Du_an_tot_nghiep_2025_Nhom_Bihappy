using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers.Admin;

[ApiController]
[Route("api/admin/users")]
public class AdminUsersController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminUsersController(AppDbContext db) => _db = db;

    // GET /api/admin/users?keyword=&page=&pageSize=
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? keyword, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var q = _db.Users.AsNoTracking(); // Global filter đã ẩn IsDeleted = true

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.ToLower();
            q = q.Where(x =>
                x.FullName.ToLower().Contains(kw) ||
                x.Email.ToLower().Contains(kw) ||
                (x.Phone ?? string.Empty).ToLower().Contains(kw));
        }

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(x => x.UserID)
                           .Skip((page - 1) * pageSize)
                           .Take(pageSize)
                           .ToListAsync();
        return Ok(new { total, items, page, pageSize });
    }

    // GET /api/admin/users/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var u = await _db.Users.FirstOrDefaultAsync(x => x.UserID == id); // ẩn bản ghi đã xoá
        return u == null ? NotFound() : Ok(u);
    }

    public class AdminUserDto
    {
        [Required] public string FullName { get; set; } = "";
        [Required, EmailAddress] public string Email { get; set; } = "";
        public string? Phone { get; set; }
        public string Role { get; set; } = "User";
        public string? Password { get; set; }
    }

    // POST /api/admin/users
    [HttpPost]
    public async Task<IActionResult> Create(AdminUserDto dto)
    {
        if (await _db.Users.IgnoreQueryFilters().AnyAsync(x => x.Email == dto.Email && !x.IsDeleted))
            return Conflict(new { message = "Email đã tồn tại" });

        var u = new User
        {
            FullName = dto.FullName,
            Email = dto.Email,
            Phone = dto.Phone ?? "",
            Role = string.IsNullOrWhiteSpace(dto.Role) ? "User" : dto.Role,
            PasswordHash = dto.Password ?? "",
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };
        _db.Users.Add(u);
        await _db.SaveChangesAsync();
        return Ok(u);
    }

    // PUT /api/admin/users/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, AdminUserDto dto)
    {
        var u = await _db.Users.FirstOrDefaultAsync(x => x.UserID == id);
        if (u == null) return NotFound();

        u.FullName = dto.FullName;
        u.Email = dto.Email;
        u.Phone = dto.Phone ?? "";
        u.Role = string.IsNullOrWhiteSpace(dto.Role) ? u.Role : dto.Role;
        if (!string.IsNullOrEmpty(dto.Password))
            u.PasswordHash = dto.Password;

        await _db.SaveChangesAsync();
        return Ok(u);
    }

    // DELETE (SOFT) /api/admin/users/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        // Bỏ filter để chắc chắn lấy được nếu trước đó đã bị soft delete
        var u = await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.UserID == id);
        if (u == null) return NotFound();

        u.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST (SOFT) /api/admin/users/bulk-delete
    [HttpPost("bulk-delete")]
    public async Task<IActionResult> BulkDelete([FromBody] List<int> ids)
    {
        var users = await _db.Users.IgnoreQueryFilters()
            .Where(x => ids.Contains(x.UserID))
            .ToListAsync();

        foreach (var u in users) u.IsDeleted = true;
        await _db.SaveChangesAsync();
        return Ok(new { deleted = users.Count });
    }

    // POST /api/admin/users/reset-password
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] dynamic body)
    {
        int id = (int)body.userId;
        string newPass = (string)body.newPassword;
        var u = await _db.Users.FirstOrDefaultAsync(x => x.UserID == id);
        if (u == null) return NotFound();

        u.PasswordHash = newPass;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Đặt lại mật khẩu thành công" });
    }

    // (Tuỳ chọn) RESTORE /api/admin/users/{id}/restore
    [HttpPost("{id:int}/restore")]
    public async Task<IActionResult> Restore(int id)
    {
        var u = await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.UserID == id);
        if (u == null) return NotFound();
        u.IsDeleted = false;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Khôi phục user thành công" });
    }

    // (Tuỳ chọn) GET DELETED /api/admin/users/deleted
    [HttpGet("deleted")]
    public async Task<IActionResult> GetDeleted([FromQuery] string? keyword)
    {
        var q = _db.Users.IgnoreQueryFilters().Where(x => x.IsDeleted).AsNoTracking();
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.ToLower();
            q = q.Where(x => x.FullName.ToLower().Contains(kw) || x.Email.ToLower().Contains(kw));
        }
        var items = await q.OrderByDescending(x => x.UserID).ToListAsync();
        return Ok(items);
    }
}

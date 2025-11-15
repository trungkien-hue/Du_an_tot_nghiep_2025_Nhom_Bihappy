using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using VirtualTravel.Data;
using VirtualTravel.Hubs;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers
{
    [ApiController]
    [Route("api/staff/notifications")]
    [Authorize(Roles = "Admin,Staff")]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<NotificationHub> _notiHub;

        public NotificationsController(AppDbContext db, IHubContext<NotificationHub> notiHub)
        {
            _db = db;
            _notiHub = notiHub;
        }

        private IEnumerable<string> GetUserRoles() =>
            User.Claims.Where(c => c.Type == ClaimTypes.Role || c.Type == "role").Select(c => c.Value);

        private string? GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier);

        private IQueryable<Notification> VisibleQuery()
        {
            var roles = GetUserRoles().ToList();
            var userId = GetUserId();

            return _db.Notifications.AsNoTracking()
                .Where(n =>
                    (n.TargetRole == null && n.TargetUserID == null) ||
                    (n.TargetRole != null && roles.Contains(n.TargetRole)) ||
                    (n.TargetUserID != null && userId != null && n.TargetUserID.ToString() == userId)
                );
        }

        [HttpGet]
        public async Task<IActionResult> GetList([FromQuery] bool unreadOnly = false, [FromQuery] int take = 20)
        {
            var q = VisibleQuery().OrderByDescending(n => n.CreatedAt);
            if (unreadOnly) q = q.Where(n => !n.IsRead).OrderByDescending(n => n.CreatedAt);
            var list = await q.Take(take).ToListAsync();
            return Ok(list);
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var count = await VisibleQuery().Where(n => !n.IsRead).CountAsync();
            return Ok(new { count });
        }

        [HttpPost("read/{id:int}")]
        public async Task<IActionResult> MarkRead(int id)
        {
            var noti = await _db.Notifications.FirstOrDefaultAsync(n => n.NotificationID == id);
            if (noti == null) return NotFound();
            noti.IsRead = true;
            await _db.SaveChangesAsync();
            return Ok();
        }

        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllRead()
        {
            var roles = GetUserRoles().ToList();
            var userId = GetUserId();

            var list = await _db.Notifications
                .Where(n => !n.IsRead &&
                    (
                        (n.TargetRole == null && n.TargetUserID == null) ||
                        (n.TargetRole != null && roles.Contains(n.TargetRole)) ||
                        (n.TargetUserID != null && userId != null && n.TargetUserID.ToString() == userId)
                    ))
                .ToListAsync();

            foreach (var n in list) n.IsRead = true;
            await _db.SaveChangesAsync();
            return Ok();
        }

        // ===== NEW: tiện ích để staff/admin tự bắn thông báo nội bộ (không bắt buộc cho KH)
        public record EmitOrderEventDto(string Title, string Message, int BookingID, string EventType = "OrderUpdated");

        [HttpPost("emit-order-event")]
        public async Task<IActionResult> EmitOrderEvent([FromBody] EmitOrderEventDto dto)
        {
            // Tạo 2 notification cho Staff & Admin
            var nStaff = new Notification
            {
                Title = dto.Title,
                Message = dto.Message,
                Type = dto.EventType,
                BookingID = dto.BookingID,
                TargetRole = "Staff",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            var nAdmin = new Notification
            {
                Title = dto.Title,
                Message = dto.Message,
                Type = dto.EventType,
                BookingID = dto.BookingID,
                TargetRole = "Admin",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _db.Notifications.AddRange(nStaff, nAdmin);
            await _db.SaveChangesAsync();

            // Realtime qua SignalR
            var payload = new { bookingId = dto.BookingID, title = dto.Title, message = dto.Message };
            await _notiHub.Clients.Group("Staff").SendAsync("OrderUpdated", payload);
            await _notiHub.Clients.Group("Admin").SendAsync("OrderUpdated", payload);

            return Ok();
        }
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;
using VirtualTravel.Hubs;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminNotificationsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<NotificationHub> _hub;

        public AdminNotificationsController(AppDbContext db, IHubContext<NotificationHub> hub)
        {
            _db = db;
            _hub = hub;
        }

        // ✅ Lấy danh sách thông báo dành cho Admin
        // GET: api/admin/AdminNotifications?unreadOnly=false&take=50
        [HttpGet]
        public async Task<IActionResult> List([FromQuery] bool unreadOnly = false, [FromQuery] int take = 50)
        {
            take = Math.Clamp(take, 1, 200);

            var query = _db.Notifications
                .Where(n => n.TargetRole == "Admin" || n.TargetRole == null)
                .OrderByDescending(n => n.CreatedAt);

            if (unreadOnly)
                query = query.Where(n => !n.IsRead).OrderByDescending(n => n.CreatedAt);

            var list = await query.Take(take).ToListAsync();

            return Ok(list);
        }

        // ✅ Đánh dấu đã đọc
        // PUT: api/admin/AdminNotifications/{id}/read
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var noti = await _db.Notifications.FindAsync(id);
            if (noti == null)
                return NotFound();

            noti.IsRead = true;
            await _db.SaveChangesAsync();

            return Ok(noti);
        }

        // ✅ Xoá thông báo
        // DELETE: api/admin/AdminNotifications/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var noti = await _db.Notifications.FindAsync(id);
            if (noti == null)
                return NotFound();

            _db.Notifications.Remove(noti);
            await _db.SaveChangesAsync();

            return NoContent();
        }

        // ✅ Gửi test thông báo cho Admin (đồng thời lưu DB và bắn SignalR)
        // POST: api/admin/AdminNotifications/test?title=...&message=...
        [HttpPost("test")]
        public async Task<IActionResult> SendTest(
            [FromQuery] string title = "Test thông báo",
            [FromQuery] string message = "Đây là thông báo thử nghiệm cho Admin")
        {
            var noti = new Notification
            {
                Title = title,
                Message = message,
                Type = "Info",
                TargetRole = "Admin",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _db.Notifications.Add(noti);
            await _db.SaveChangesAsync();

            // 🔔 Gửi realtime cho group "Admin"
            await _hub.Clients.Group("Admin").SendAsync(
                "ReceiveNotification",
                noti.Title,
                noti.Message,
                noti.Type,
                noti.NotificationID,
                noti.CreatedAt);

            return Ok(noti);
        }
    }
}

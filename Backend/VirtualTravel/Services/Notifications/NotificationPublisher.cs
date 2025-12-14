using Microsoft.AspNetCore.SignalR;
using VirtualTravel.Data;
using VirtualTravel.Models;
using VirtualTravel.Hubs;

namespace VirtualTravel.Services.Notifications
{
    public interface INotificationPublisher
    {
        Task AddAndBroadcastAsync(string title, string message, string? targetRole = null, int? targetUserId = null);
    }

    public sealed class NotificationPublisher : INotificationPublisher
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<NotificationHub> _hub;

        public NotificationPublisher(AppDbContext db, IHubContext<NotificationHub> hub)
        {
            _db = db;
            _hub = hub;
        }

        public async Task AddAndBroadcastAsync(string title, string message, string? targetRole = null, int? targetUserId = null)
        {
            var noti = new Notification
            {
                Title = title,
                Message = message,
                TargetRole = targetRole,
                TargetUserID = targetUserId,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            _db.Notifications.Add(noti);
            await _db.SaveChangesAsync();

            var payload = new
            {
                noti.NotificationID,
                noti.Title,
                noti.Message,
                noti.TargetRole,
                noti.TargetUserID,
                noti.CreatedAt,
                Type = "NewNotification"
            };

            if (targetUserId.HasValue)
            {
                await _hub.Clients.Group($"user:{targetUserId.Value}")
                    .SendAsync("NewNotification", payload);
            }
            else if (!string.IsNullOrWhiteSpace(targetRole))
            {
                // ⭐ CHỈ GỬI ĐẾN "Staff" hoặc "Admin"
                await _hub.Clients.Group(targetRole)
                    .SendAsync("NewNotification", payload);
            }
            else
            {
                // Gửi chung Staff + Admin
                await _hub.Clients.Groups("Staff", "Admin")
                    .SendAsync("NewNotification", payload);
            }
        }
    }
}

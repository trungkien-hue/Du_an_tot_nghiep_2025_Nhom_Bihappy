using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace VirtualTravel.Hubs
{
    [Authorize] // chỉ user đăng nhập mới nhận
    public class NotificationHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var user = Context.User;
            if (user != null)
            {
                var roles = user.Claims
                    .Where(c => c.Type == ClaimTypes.Role || c.Type == "role")
                    .Select(c => c.Value)
                    .ToList();

                foreach (var role in roles)
                {
                    if (!string.IsNullOrWhiteSpace(role))
                        await Groups.AddToGroupAsync(Context.ConnectionId, role);
                }
            }
            await base.OnConnectedAsync();
        }
    }
}

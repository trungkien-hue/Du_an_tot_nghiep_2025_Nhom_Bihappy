using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace VirtualTravel.Hubs
{
    // Chỉ hotel (partner) được kết nối Hub này
    [Authorize(Roles = "Hotel")]
    public class PartnerNotificationHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            // Lấy hotelId từ JWT claim (ví dụ bạn đã phát hành claim "hotelId")
            var hotelId = Context.User?.FindFirst("hotelId")?.Value;
            if (!string.IsNullOrEmpty(hotelId))
            {
                // Join group theo khách sạn
                await Groups.AddToGroupAsync(Context.ConnectionId, $"hotel:{hotelId}");
            }

            await base.OnConnectedAsync();
        }
    }
}

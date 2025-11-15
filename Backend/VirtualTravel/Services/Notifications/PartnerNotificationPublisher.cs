using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using VirtualTravel.Hubs;

namespace VirtualTravel.Services.Notifications
{
    public interface IPartnerNotificationPublisher
    {
        Task NotifyHotelAsync(int hotelId, string method, object payload);
        Task BookingCreatedAsync(int hotelId, object payload);
        Task BookingUpdatedAsync(int hotelId, object payload);
    }

    public sealed class PartnerNotificationPublisher : IPartnerNotificationPublisher
    {
        private readonly IHubContext<PartnerNotificationHub> _hub;

        public PartnerNotificationPublisher(IHubContext<PartnerNotificationHub> hub)
        {
            _hub = hub;
        }

        public Task NotifyHotelAsync(int hotelId, string method, object payload)
            => _hub.Clients.Group($"hotel:{hotelId}").SendAsync(method, payload);

        public Task BookingCreatedAsync(int hotelId, object payload)
            => NotifyHotelAsync(hotelId, "BookingCreated", payload);

        public Task BookingUpdatedAsync(int hotelId, object payload)
            => NotifyHotelAsync(hotelId, "BookingUpdated", payload);
    }
}

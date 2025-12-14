// File: Services/Notifications/PartnerNotificationPublisher.cs
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using VirtualTravel.Hubs;

namespace VirtualTravel.Services.Notifications
{
    public interface IPartnerNotificationPublisher
    {
        Task NotifyHotelAsync(int hotelId, string method, object payload);

        /// <summary>
        /// Đơn mới được tạo.
        /// </summary>
        Task BookingCreatedAsync(int hotelId, object payload);

        /// <summary>
        /// Đơn được khách cập nhật (đổi ngày, đổi số lượng, …).
        /// </summary>
        Task BookingUpdatedAsync(int hotelId, object payload);

        /// <summary>
        /// Đơn bị khách hủy.
        /// </summary>
        Task BookingCancelledAsync(int hotelId, object payload);
    }

    public sealed class PartnerNotificationPublisher : IPartnerNotificationPublisher
    {
        private readonly IHubContext<PartnerNotificationHub> _hub;

        public PartnerNotificationPublisher(IHubContext<PartnerNotificationHub> hub)
        {
            _hub = hub;
        }

        /// <summary>
        /// Gửi thông điệp bất kỳ tới group hotel:{hotelId}
        /// </summary>
        public Task NotifyHotelAsync(int hotelId, string method, object payload)
            => _hub.Clients.Group($"hotel:{hotelId}").SendAsync(method, payload);

        /// <summary>
        /// Gửi event BookingCreated cho hotel.
        /// </summary>
        public Task BookingCreatedAsync(int hotelId, object payload)
            => NotifyHotelAsync(hotelId, "BookingCreated", payload);

        /// <summary>
        /// Gửi event BookingUpdated cho hotel.
        /// </summary>
        public Task BookingUpdatedAsync(int hotelId, object payload)
            => NotifyHotelAsync(hotelId, "BookingUpdated", payload);

        /// <summary>
        /// Gửi event BookingCancelled cho hotel.
        /// </summary>
        public Task BookingCancelledAsync(int hotelId, object payload)
            => NotifyHotelAsync(hotelId, "BookingCancelled", payload);
    }
}

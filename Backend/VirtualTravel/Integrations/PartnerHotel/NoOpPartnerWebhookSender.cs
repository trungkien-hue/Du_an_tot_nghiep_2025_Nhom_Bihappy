// File: Integrations/PartnerHotel/NoOpPartnerWebhookSender.cs
using System.Threading;
using System.Threading.Tasks;

namespace VirtualTravel.Integrations.PartnerHotel
{
    /// <summary>
    /// Sender "rỗng" – không gọi ra ngoài. Dùng khi PartnerWebhook.Enabled = false
    /// </summary>
    public sealed class NoOpPartnerWebhookSender : IPartnerWebhookSender
    {
        public Task SendBookingCreatedAsync(int bookingId, CancellationToken ct = default)
            => Task.CompletedTask;

        public Task SendBookingModifiedAsync(int bookingId, CancellationToken ct = default)
            => Task.CompletedTask;

        public Task SendBookingCanceledAsync(int bookingId, string reason, CancellationToken ct = default)
            => Task.CompletedTask;
    }
}

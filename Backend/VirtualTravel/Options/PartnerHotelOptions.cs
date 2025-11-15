// File: Options/PartnerHotelOptions.cs
namespace VirtualTravel.Options
{
    public class PartnerHotelOptions
    {
        public string BaseUrl { get; set; } = "";
        public string? ApiKey { get; set; }
        public string WebhookSecret { get; set; } = "super_secret_shared_key";
        public int PartnerId { get; set; } = 1;

        // ✅ outbound webhook (gửi ngược tới khách sạn gốc khi Staff xác nhận / khách đặt)
        public string? OutboundWebhookBaseUrl { get; set; }   // ví dụ: http://localhost:6060
        public string OutboundWebhookSecret { get; set; } = "super_secret_shared_key";
    }
}

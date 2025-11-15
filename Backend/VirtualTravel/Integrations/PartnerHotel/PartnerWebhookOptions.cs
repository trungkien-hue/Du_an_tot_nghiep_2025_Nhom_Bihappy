// File: Integrations/PartnerHotel/PartnerWebhookOptions.cs
namespace VirtualTravel.Integrations.PartnerHotel
{
    public class PartnerWebhookOptions
    {
        public bool Enabled { get; set; } = false;
        public string? BaseUrl { get; set; }
        public int TimeoutSeconds { get; set; } = 5;
    }
}


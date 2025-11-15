namespace VirtualTravel.Models;

public class UnmappedWebhook
{
    public int UnmappedWebhookID { get; set; }
    public int PartnerID { get; set; }
    public string EventType { get; set; } = "";

    public string? ExternalHotelCode { get; set; }
    public string? ExternalRoomTypeCode { get; set; }
    public string? ExternalRatePlanCode { get; set; }
    public string? ExternalBookingId { get; set; }

    public string PayloadJson { get; set; } = "";
    public string Status { get; set; } = "Pending"; // Pending, Replayed, Ignored, Failed
    public int RetryCount { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

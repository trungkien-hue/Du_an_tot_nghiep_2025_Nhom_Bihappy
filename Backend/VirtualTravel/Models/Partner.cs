namespace VirtualTravel.Models;

public class Partner
{
    public int PartnerID { get; set; }
    public string Name { get; set; } = "";
    public string? ApiBase { get; set; }
    public string? WebhookSecret { get; set; }
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

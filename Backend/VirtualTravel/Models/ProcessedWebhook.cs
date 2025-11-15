using System;
using System.ComponentModel.DataAnnotations;

namespace VirtualTravel.Models
{
    public class ProcessedWebhook
    {
        [Key, MaxLength(128)]
        public string Id { get; set; } = string.Empty; // EventId/WebhookId

        public DateTime ProcessedUtc { get; set; } = DateTime.UtcNow;

        [MaxLength(50)]
        public string Provider { get; set; } = "hotel";
    }
}

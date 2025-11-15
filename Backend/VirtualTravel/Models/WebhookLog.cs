using System;
using System.ComponentModel.DataAnnotations;

namespace VirtualTravel.Models
{
    public class WebhookLog
    {
        public long WebhookLogID { get; set; }

        [MaxLength(50)]
        public string Provider { get; set; } = "hotel";

        [MaxLength(100)]
        public string EventType { get; set; } = string.Empty;

        [MaxLength(128)]
        public string? EventId { get; set; }

        public int StatusCode { get; set; }

        [MaxLength(256)]
        public string? Signature { get; set; }

        public string Payload { get; set; } = string.Empty;

        public string? Error { get; set; }

        public DateTime ReceivedUtc { get; set; } = DateTime.UtcNow;
    }
}

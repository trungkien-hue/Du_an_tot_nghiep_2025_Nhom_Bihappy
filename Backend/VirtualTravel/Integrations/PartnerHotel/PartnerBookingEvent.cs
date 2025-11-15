namespace VirtualTravel.Integrations.PartnerHotel
{
    // Payload chuẩn mà mock khách sạn gốc đang bắn
    public sealed class PartnerBookingEvent
    {
        public string EventId { get; set; } = "";
        public string ExternalBookingId { get; set; } = "";

        public string HotelCode { get; set; } = "";
        public string RoomTypeCode { get; set; } = "";
        public string? RatePlanCode { get; set; }

        public string Status { get; set; } = "";
        public string CheckIn { get; set; } = "";
        public string CheckOut { get; set; } = "";
        public int Adults { get; set; }
        public int Children { get; set; }

        public string? PolicySnapshotJson { get; set; }
        public string? PriceBreakdownJson { get; set; }
    }
}

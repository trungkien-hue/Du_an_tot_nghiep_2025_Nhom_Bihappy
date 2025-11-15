namespace VirtualTravel.DTOs.Hotel
{
    public class RatePlanDto
    {
        public int RatePlanID { get; set; }
        public int HotelID { get; set; }
        public int? RoomTypeID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal BasePrice { get; set; }
        public string Currency { get; set; } = "VND";
        public bool IsActive { get; set; } = true;
        public string? ExternalRatePlanCode { get; set; }
    }
}

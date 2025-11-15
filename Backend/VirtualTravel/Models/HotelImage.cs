using System;

namespace VirtualTravel.Models
{
    public class HotelImage
    {
        public int HotelImageID { get; set; }
        public int HotelID { get; set; }
        public Hotel Hotel { get; set; } = null!;

        public string ImageUrl { get; set; } = string.Empty; // /uploads/hotels/{hotelId}/xxx.jpg hoặc URL tuyệt đối
        public string? Caption { get; set; }
        public string? Tag { get; set; }     // "room", "lobby", "pool", ...
        public int SortOrder { get; set; } = 0;
        public bool IsPrimary { get; set; } = false;

        // ✅ Soft delete cho từng ảnh
        public bool IsDeleted { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? CreatedBy { get; set; }
    }
}

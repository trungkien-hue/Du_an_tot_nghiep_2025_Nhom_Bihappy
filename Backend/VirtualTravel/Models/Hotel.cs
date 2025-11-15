using System.Collections.Generic;

namespace VirtualTravel.Models
{
    public class Hotel
    {
        public int HotelID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        public decimal PricePerNight { get; set; }
        public float Rating { get; set; } = 0;
        public string? ImageURL { get; set; }

        // Mapping 2 chiều với hệ thống đối tác
        public string? ExternalHotelCode { get; set; }

        // Soft delete
        public bool IsDeleted { get; set; } = false;

        // Navs có sẵn trong DB của bạn
        public ICollection<HotelImage> Images { get; set; } = new List<HotelImage>();
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        public ICollection<HotelAvailability> AvailableDates { get; set; } = new List<HotelAvailability>();
        public ICollection<RoomType> RoomTypes { get; set; } = new List<RoomType>();

        // ✅ Thêm RatePlans cho đồng bộ giá/chính sách
        public ICollection<RatePlan> RatePlans { get; set; } = new List<RatePlan>();
    }
}

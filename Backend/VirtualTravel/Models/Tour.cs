using System.Collections.Generic;

namespace VirtualTravel.Models
{
    public class Tour
    {
        public int TourID { get; set; }

        // non-nullable strings -> gán mặc định
        public string Name { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;

        // Thông tin hành trình
        public string StartLocation { get; set; } = string.Empty;
        public string EndLocation { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Itinerary { get; set; } = string.Empty;
        public string Includes { get; set; } = string.Empty;
        public string Excludes { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public string Highlights { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;

        // Thời gian & nhóm
        public int DurationDays { get; set; }
        public int MaxGroupSize { get; set; }
        public string TransportType { get; set; } = string.Empty;
        public bool GuideIncluded { get; set; }

        // Giá cả
        public decimal Price { get; set; }
        public decimal? PriceAdult { get; set; }
        public decimal? PriceChild { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string CancellationPolicy { get; set; } = string.Empty;
        public decimal? DepositPercent { get; set; }

        // Khác
        public double Rating { get; set; }
        public string ImageURL { get; set; } = string.Empty;

        // ✅ Soft delete
        public bool IsDeleted { get; set; } = false;

        // Quan hệ
        public ICollection<TourAvailability> TourAvailabilities { get; set; } = new List<TourAvailability>();
        public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
    }
}

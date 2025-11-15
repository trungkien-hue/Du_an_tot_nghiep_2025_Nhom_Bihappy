using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace VirtualTravel.Models
{
    public class Review
    {
        public int ReviewID { get; set; }

        public int? UserID { get; set; }
        public int? HotelID { get; set; }
        public int? TourID { get; set; }

        [Range(1, 5)]
        public int Rating { get; set; } // 1-5

        [Required]
        [MaxLength(4000)]
        public string Comment { get; set; } = string.Empty;

        // Khuyến nghị dùng UTC để đồng bộ
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(200)]
        public string? ReviewerName { get; set; }

        // Navigation
        public User? User { get; set; }
        public Hotel? Hotel { get; set; }
        public Tour? Tour { get; set; }

        // ⭐ THÊM: danh sách ảnh của review
        public ICollection<ReviewImage> Images { get; set; } = new List<ReviewImage>();
    }
}

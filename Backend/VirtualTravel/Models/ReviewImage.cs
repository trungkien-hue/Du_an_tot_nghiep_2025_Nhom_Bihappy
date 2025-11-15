using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VirtualTravel.Models
{
    public class ReviewImage
    {
        public int ReviewImageID { get; set; }

        [Required]
        public int ReviewID { get; set; }

        [ForeignKey(nameof(ReviewID))]
        public Review Review { get; set; } = null!;

        // Lưu đường dẫn web (ví dụ: /uploads/reviews/2025/10/xxx.jpg)
        [Required, MaxLength(500)]
        public string ImageURL { get; set; } = string.Empty;
    }
}

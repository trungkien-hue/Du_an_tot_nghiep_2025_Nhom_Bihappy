using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VirtualTravel.Models
{
    [Table("RatePlan")]
    public class RatePlan
    {
        [Key]
        public int RatePlanID { get; set; }

        public int HotelID { get; set; }
        public Hotel? Hotel { get; set; }

        public int? RoomTypeID { get; set; }
        public RoomType? RoomType { get; set; }

        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal BasePrice { get; set; } = 0;

        [MaxLength(10)]
        public string Currency { get; set; } = "VND";

        public bool IsActive { get; set; } = true;

        // Mapping 2 chiều
        public string? ExternalRatePlanCode { get; set; }
    }
}

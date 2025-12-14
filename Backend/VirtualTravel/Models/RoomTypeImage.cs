// Models/RoomTypeImage.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VirtualTravel.Models
{
    public class RoomTypeImage
    {
        [Key]
        public int RoomTypeImageID { get; set; }

        [ForeignKey(nameof(RoomType))]
        public int RoomTypeID { get; set; }

        [Required, MaxLength(512)]
        public string ImageUrl { get; set; } = string.Empty;

        public bool IsPrimary { get; set; } = false;
        public bool IsDeleted { get; set; } = false;
        public int SortOrder { get; set; } = 0;

        public RoomType RoomType { get; set; } = null!;
    }
}

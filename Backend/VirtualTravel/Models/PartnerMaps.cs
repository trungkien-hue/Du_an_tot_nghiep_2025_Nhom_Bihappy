using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VirtualTravel.Models
{
    // Ánh xạ HotelCode (đối tác) -> HotelID (nội bộ)
    [Table("PartnerHotelMaps")]
    public class PartnerHotelMap
    {
        [Key] public int PartnerHotelMapID { get; set; }
        public int PartnerID { get; set; }
        public int HotelID { get; set; }

        [MaxLength(100)]
        public string ExternalHotelCode { get; set; } = "";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    // Ánh xạ RoomTypeCode (đối tác) -> RoomTypeID (nội bộ)
    [Table("PartnerRoomTypeMaps")]
    public class PartnerRoomTypeMap
    {
        [Key] public int PartnerRoomTypeMapID { get; set; }
        public int PartnerID { get; set; }
        public int HotelID { get; set; }      // để tránh trùng code giữa các KS
        public int RoomTypeID { get; set; }

        [MaxLength(100)]
        public string ExternalRoomTypeCode { get; set; } = "";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    // Ánh xạ RatePlanCode (đối tác) -> RatePlanID (nội bộ)
    [Table("PartnerRatePlanMaps")]
    public class PartnerRatePlanMap
    {
        [Key] public int PartnerRatePlanMapID { get; set; }
        public int PartnerID { get; set; }
        public int HotelID { get; set; }
        public int RatePlanID { get; set; }

        [MaxLength(100)]
        public string ExternalRatePlanCode { get; set; } = "";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

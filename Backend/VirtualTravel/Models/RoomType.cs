using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace VirtualTravel.Models
{
    [Table("RoomType")]
    public class RoomType
    {
        public int RoomTypeID { get; set; }

        public int HotelID { get; set; }
        public Hotel? Hotel { get; set; }

        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int Capacity { get; set; }

        // Tổng số phòng vật lý của loại phòng này (KHÔNG phải số trống)
        public int TotalRooms { get; set; } = 0;

        // Mapping 2 chiều
        public string? ExternalRoomTypeCode { get; set; }

        public ICollection<HotelAvailability>? HotelAvailabilities { get; set; }
    }
}

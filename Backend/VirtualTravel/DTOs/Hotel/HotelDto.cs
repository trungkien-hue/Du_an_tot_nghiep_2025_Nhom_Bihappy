// /DTOs/Hotel/HotelDto.cs
namespace VirtualTravel.DTOs.Hotel
{
    public class HotelDto
    {
        public int HotelID { get; set; }
        public string Name { get; set; } = "";
        public string Location { get; set; } = "";
        public string Description { get; set; } = "";
        public string ImageURL { get; set; } = "";
        public double Rating { get; set; }
        public decimal PricePerNight { get; set; }
        public decimal MinPrice { get; set; } // giá thấp nhất theo availability

        public List<RoomTypeDto> RoomTypes { get; set; } = new();
    }

    public class RoomTypeDto
    {
        public int RoomTypeID { get; set; }
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
        public int Capacity { get; set; }

        public decimal Price { get; set; }               // giá min trong range
        public int AvailableRooms { get; set; }          // tồn hiệu lực (min theo từng ngày trong range)
        public List<HotelAvailabilityDto> Availabilities { get; set; } = new();
    }

    public class RoomTypeBriefDto
    {
        public int RoomTypeID { get; set; }
        public string Name { get; set; } = "";
        public decimal MinPrice { get; set; }
        public int TotalAvailable { get; set; }
    }

    public class HotelAvailabilityDto
    {
        public int AvailabilityID { get; set; }
        public DateTime Date { get; set; }
        public int AvailableRooms { get; set; }
        public decimal Price { get; set; }
    }

    public class SearchAvailabilityDto
    {
        public string? Name { get; set; }
        public string? Location { get; set; }
        public DateTime? Checkin { get; set; }
        public DateTime? Checkout { get; set; }

        public decimal? PriceMin { get; set; }
        public decimal? PriceMax { get; set; }
    }
}

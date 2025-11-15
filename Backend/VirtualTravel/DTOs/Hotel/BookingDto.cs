namespace VirtualTravel.DTOs.Hotel
{
    public class BookingDto
    {
        public int BookingID { get; set; }
        public int UserID { get; set; }
        public int? HotelID { get; set; }
        public int? TourID { get; set; }
        public int? RoomTypeID { get; set; }     // ✅ bổ sung

        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
        public DateTime BookingDate { get; set; }
        public string Status { get; set; } = "";
        public int Quantity { get; set; } = 1;
    }

    public class CreateBookingRequest
    {
        public int UserID { get; set; }
        public int? HotelID { get; set; }
        public int? TourID { get; set; }
        public int? RoomTypeID { get; set; }     // ✅ bổ sung

        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
        public int Quantity { get; set; } = 1;
    }
}

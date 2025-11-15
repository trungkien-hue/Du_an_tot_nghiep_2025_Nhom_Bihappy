namespace VirtualTravel.DTOs
{
    public class BookingRequest
    {
        public int? UserID { get; set; }
        public int? HotelID { get; set; }
        public int? TourID { get; set; }

        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }

        // Thông tin thêm
        public string FullName { get; set; }
        public string Phone { get; set; }
        public string HotelName { get; set; }
        public string Location { get; set; }

        public int? RoomTypeID { get; set; }
    }
}

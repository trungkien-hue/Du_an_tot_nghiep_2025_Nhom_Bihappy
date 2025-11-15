namespace VirtualTravel.DTOs
{
    public class ReviewDto
    {
        public int ReviewID { get; set; }
        public int UserID { get; set; }
        public int? HotelID { get; set; }
        public int? TourID { get; set; }
        public int Rating { get; set; }
        public string Comment { get; set; }
        public DateTime CreatedAt { get; set; }
    }

}

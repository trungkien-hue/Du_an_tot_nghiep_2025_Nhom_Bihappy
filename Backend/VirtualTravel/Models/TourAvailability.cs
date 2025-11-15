using System;

namespace VirtualTravel.Models
{
    public class TourAvailability
    {
        public int TourAvailabilityID { get; set; }
        public int TourID { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int AvailableSlots { get; set; }
        public decimal PriceAdult { get; set; }
        public decimal PriceChild { get; set; }

        public Tour Tour { get; set; }
    }
}

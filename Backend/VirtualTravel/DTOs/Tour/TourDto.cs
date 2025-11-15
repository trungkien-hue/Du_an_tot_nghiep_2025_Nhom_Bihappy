using System;
using System.Collections.Generic;

namespace VirtualTravel.DTOs.Tour
{
    public class TourDto
    {
        public int TourID { get; set; }
        public string Name { get; set; }
        public string Location { get; set; }
        public string Description { get; set; }
        public int DurationDays { get; set; }
        public decimal Price { get; set; }
        public string ImageURL { get; set; }

        public List<TourAvailabilityDto> Availabilities { get; set; }
    }

    public class TourAvailabilityDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int AvailableSlots { get; set; }
        public decimal PriceAdult { get; set; }
        public decimal PriceChild { get; set; }
    }
}

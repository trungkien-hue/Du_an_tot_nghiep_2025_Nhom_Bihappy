using System;

namespace VirtualTravel.DTOs.Tour
{
    public class SearchTourAvailabilityDto
    {
        public string Name { get; set; } = "";
        public string Location { get; set; } = "";
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public int? MinSlots { get; set; }
    }
}

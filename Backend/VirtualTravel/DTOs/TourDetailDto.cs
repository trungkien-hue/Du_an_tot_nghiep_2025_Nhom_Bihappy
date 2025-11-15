// Dtos/TourDetailDto.cs
namespace VirtualTravel.Dtos
{
    public class TourDetailDto
    {
        public int TourID { get; set; }
        public string Name { get; set; }
        public string Location { get; set; }
        public string StartLocation { get; set; }
        public string EndLocation { get; set; }
        public string Description { get; set; }
        public string Itinerary { get; set; }
        public string Includes { get; set; }
        public string Excludes { get; set; }
        public string Notes { get; set; }
        public string Highlights { get; set; }
        public string Category { get; set; }
        public int DurationDays { get; set; }
        public int MaxGroupSize { get; set; }
        public string TransportType { get; set; }
        public bool GuideIncluded { get; set; }
        public decimal Price { get; set; }
        public decimal? PriceAdult { get; set; }
        public decimal? PriceChild { get; set; }
        public string Currency { get; set; }
        public string CancellationPolicy { get; set; }
        public decimal? DepositPercent { get; set; }
        public double? Rating { get; set; }
        public string ImageURL { get; set; }
    }
}

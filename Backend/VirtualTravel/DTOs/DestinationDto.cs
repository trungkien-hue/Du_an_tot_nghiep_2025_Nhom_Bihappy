namespace VirtualTravel.DTOs
{
    public class DestinationDto
    {
        public int DestinationID { get; set; }
        public string Name { get; set; }
        public string Location { get; set; }
        public string Description { get; set; }
        public string SceneType { get; set; }
        public string SceneURL { get; set; }
        public string ThumbnailURL { get; set; }
    }

    public class CreateDestinationRequest
    {
        public string Name { get; set; }
        public string Location { get; set; }
        public string Description { get; set; }
        public string SceneType { get; set; }
        public string SceneURL { get; set; }
        public string ThumbnailURL { get; set; }
    }
}

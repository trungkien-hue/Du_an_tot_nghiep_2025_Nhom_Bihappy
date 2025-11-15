namespace VirtualTravel.DTOs
{
    public class ARVRSceneDto
    {
        public int SceneID { get; set; }
        public string Name { get; set; }
        public string Type { get; set; }
        public string FileURL { get; set; }
        public string Location { get; set; }
    }

    public class CreateARVRSceneRequest
    {
        public string Name { get; set; }
        public string Type { get; set; }
        public string FileURL { get; set; }
        public string Location { get; set; }
    }
}

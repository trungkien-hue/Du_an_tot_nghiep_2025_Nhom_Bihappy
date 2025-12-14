using VirtualTravel.Models;

public class RoomTypeAmenity
{
    public int RoomTypeID { get; set; }
    public int AmenityID { get; set; }

    public RoomType RoomType { get; set; } = null!;
    public Amenity Amenity { get; set; } = null!;
}

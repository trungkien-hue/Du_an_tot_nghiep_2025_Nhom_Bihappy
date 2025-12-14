using System.ComponentModel.DataAnnotations;

public class Amenity
{
    public int AmenityID { get; set; }
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Icon { get; set; }

    public ICollection<RoomTypeAmenity> RoomTypeAmenities { get; set; } = new List<RoomTypeAmenity>();
}

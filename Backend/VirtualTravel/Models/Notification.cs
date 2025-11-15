// ...
public class Notification
{
    public int NotificationID { get; set; }
    public string Title { get; set; } = "";
    public string Message { get; set; } = "";
    public string Type { get; set; } = "BookingCreated";
    public int? BookingID { get; set; }
    public int? HotelID { get; set; }
    public int? RoomTypeID { get; set; }

    public string? TargetRole { get; set; }
    public int? TargetUserID { get; set; }

    // ✅ NEW: đích đến theo khách sạn (portal)
    public int? TargetHotelId { get; set; }

    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

using System;

namespace VirtualTravel.Dtos.Bookings
{
    public record MyBookingListItemDto(
        int BookingID,
        string? HotelName,
        string? TourName,
        string? Location,
        DateTime BookingDate,
        DateTime? CheckInDate,
        DateTime? CheckOutDate,
        int? NumberOfGuests,
        int Quantity,
        decimal? Price,
        decimal? TotalPrice,
        string Status,
        string UserFullName,
        string BookingType // 👈 NEW (Tour | Hotel)
    );

    public record MyBookingDetailDto(
        int BookingID,
        string? HotelName,
        string? Location,
        DateTime BookingDate,
        DateTime? CheckInDate,
        DateTime? CheckOutDate,
        int? NumberOfGuests,
        int Quantity,
        decimal? Price,
        decimal? TotalPrice,
        string Status,
        string? RoomTypeName,
        string? TourName,
        string UserFullName,
        string BookingType // 👈 NEW
    );

    // Dùng cho cập nhật
    public record MyBookingUpdateDto(
        DateTime? CheckInDate,
        DateTime? CheckOutDate,
        int? NumberOfGuests,
        int? Quantity
    );
}

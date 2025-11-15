using System;
using System.Collections.Generic;

namespace VirtualTravel.DTOs.Detail
{
    public class HotelTourDetailDto
    {
        public int HotelID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal PricePerNight { get; set; }
        public float Rating { get; set; }
        public string? ImageURL { get; set; }

        public List<HotelRoomTypeDetailDto> RoomTypes { get; set; } = new();
        public List<HotelReviewDetailDto> Reviews { get; set; } = new();
        public List<HotelAvailabilityDetailDto> AvailableDates { get; set; } = new();
        public List<HotelBookingDetailDto> Bookings { get; set; } = new();
    }

    public class HotelRoomTypeDetailDto
    {
        public int RoomTypeID { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int Capacity { get; set; }
        public List<HotelAvailabilityDetailDto> Availabilities { get; set; } = new();
    }

    public class HotelAvailabilityDetailDto
    {
        public int HotelAvailabilityID { get; set; }
        public DateTime Checkin { get; set; }
        public DateTime Checkout { get; set; }
        public int AvailableRooms { get; set; }
        public decimal Price { get; set; }
        public int? RoomTypeID { get; set; }
    }

    public class HotelReviewDetailDto
    {
        public int ReviewID { get; set; }
        public string? UserName { get; set; }
        public string? Comment { get; set; }
        public DateTime? CreatedAt { get; set; }
        public float? Rating { get; set; }
    }

    public class HotelBookingDetailDto
    {
        public int BookingID { get; set; }
        public string? UserName { get; set; }
        public int? RoomTypeID { get; set; }
        public string? RoomTypeName { get; set; }
        public DateTime CheckinDate { get; set; }
        public DateTime CheckoutDate { get; set; }
        public int Guests { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "Pending";
    }
}

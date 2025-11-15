// File: Models/Booking.cs
using System;

namespace VirtualTravel.Models
{
    public class Booking
    {
        public int BookingID { get; set; }

        // Khóa ngoại (nullable hợp lý)
        public int? UserID { get; set; }
        public int? HotelID { get; set; }
        public int? TourID { get; set; }
        public int? HotelAvailabilityID { get; set; }
        public int? TourAvailabilityID { get; set; }

        // Thông tin đặt chỗ
        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }
        public DateTime BookingDate { get; set; } = DateTime.Now;
        public string Status { get; set; } = "Pending";

        // Thông tin liên hệ
        public string? FullName { get; set; }
        public string? Phone { get; set; }
        public string? HotelName { get; set; }
        public string? Location { get; set; }

        // Thông tin thêm
        public int? RoomTypeID { get; set; }
        public decimal? Price { get; set; }
        public int? AvailableRooms { get; set; }
        public int? NumberOfGuests { get; set; }
        public decimal? TotalPrice { get; set; }
        public int Quantity { get; set; } = 1;

        // ✅ Đồng bộ 2 chiều
        public string? ExternalBookingId { get; set; }
        public string? PolicySnapshotJson { get; set; }
        public string? PriceBreakdownJson { get; set; }

        // ✅ Soft delete / ẩn
        public bool IsDeleted { get; set; } = false;
        public bool IsHiddenByUser { get; set; } = false;
        public string? Note { get; set; }

        // ✅ Day-use (đặt theo giờ): nếu cùng ngày CI/CO thì IsHourly có thể true (không bắt buộc)
        public bool IsHourly { get; set; } = false;     // chỉ là cờ tiện tra cứu; inventory vẫn tính theo ngày
        public int? Hours { get; set; }                 // tổng số giờ (optional)

        // ✅ Dấu mốc lifecycle & phạt
        public DateTime? CheckedInAt { get; set; }
        public DateTime? CheckedOutAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public decimal? PenaltyAmount { get; set; }     // tổng phạt cấp booking (tổng các đêm Penalized)

        // Navigation
        public User? User { get; set; }
        public Hotel? Hotel { get; set; }
        public Tour? Tour { get; set; }
        public RoomType? RoomType { get; set; }
        public HotelAvailability? HotelAvailability { get; set; }
        public TourAvailability? TourAvailability { get; set; }
    }
}

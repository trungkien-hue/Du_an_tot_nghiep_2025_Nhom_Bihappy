// DTOs/TourBookingCreateDto.cs
using System;

namespace VirtualTravel.Models
{
    public class TourBookingCreateDto
    {
        public int TourID { get; set; }
        public int? TourAvailabilityID { get; set; }

        // Ngày khởi hành người dùng chọn trên UI
        public DateTime? StartDate { get; set; }

        // Khách theo từng nhóm
        public int AdultGuests { get; set; }
        public int ChildGuests { get; set; }

        // Đơn giá theo nhóm
        public decimal UnitPriceAdult { get; set; }
        public decimal UnitPriceChild { get; set; }

        // Liên hệ
        public string? FullName { get; set; }
        public string? Phone { get; set; }

        // Ghi chú thêm (UI có thể gửi, BE hiện chưa lưu vì không có cột phù hợp)
        public string? Requests { get; set; }
    }
}

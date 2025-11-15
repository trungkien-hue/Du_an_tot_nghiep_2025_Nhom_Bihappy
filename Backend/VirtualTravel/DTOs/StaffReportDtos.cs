using System;

namespace VirtualTravel.Dtos
{
    public class BookingListItemDto
    {
        public int BookingID { get; set; }

        // "Tour" | "Hotel"
        public string Type { get; set; } = "";

        // Tour.Name hoặc Hotel.Name (fallback HotelName trong booking)
        public string Name { get; set; } = "";

        public string Location { get; set; } = "";
        public string Status { get; set; } = "";

        public DateTime BookingDate { get; set; }
        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }

        public int? NumberOfGuests { get; set; }

        // ✅ Giá cuối cùng hiển thị nhất quán
        public decimal TotalPrice { get; set; }

        // ✅ Thêm để FE có thể hiển thị breakdown
        public decimal? Price { get; set; }    // đơn giá/đêm (Hotel) hoặc null (Tour)
        public int Quantity { get; set; }      // số phòng đã đặt (Hotel), mặc định 1

        public string? FullName { get; set; }
        public string? Phone { get; set; }
    }

    public class TourAggregateDto
    {
        public int TourID { get; set; }
        public string Name { get; set; } = "";
        public double Rating { get; set; }
        public decimal TotalRevenue { get; set; } // tổng doanh thu (Completed/Paid)
    }

    public class HotelAggregateDto
    {
        public int HotelID { get; set; }
        public string Name { get; set; } = "";
        public string Location { get; set; } = "";
        public double Rating { get; set; }
        public decimal TotalRevenue { get; set; } // tổng doanh thu (Completed/Paid)
    }
}

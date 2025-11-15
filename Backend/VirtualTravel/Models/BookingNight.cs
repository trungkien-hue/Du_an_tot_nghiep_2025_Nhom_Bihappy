// File: Models/BookingNight.cs
using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace VirtualTravel.Models
{
    // Ghi sổ theo từng đêm, duy nhất theo (BookingID, NightDate)
    [Index(nameof(BookingID), nameof(NightDate), IsUnique = true)]
    public class BookingNight
    {
        public int BookingNightID { get; set; }

        public int BookingID { get; set; }
        public Booking Booking { get; set; } = default!;

        // Đêm lưu trú: đêm 2025-11-10 nghĩa là từ 10->11
        public DateTime NightDate { get; set; } // luôn .Date

        // Số phòng (thường = booking.Quantity)
        public int Quantity { get; set; }

        // Giá mỗi phòng/đêm chốt tại thời điểm xác nhận
        public decimal UnitPrice { get; set; }

        // Trạng thái đêm:
        // Held (đang giữ tồn), Consumed (đã lưu trú),
        // Released (được hoàn), Penalized (bị phạt, vẫn trả tồn nhưng giữ tiền phạt)
        [MaxLength(20)]
        public string State { get; set; } = "Held";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ConsumedAt { get; set; }
        public DateTime? ReleasedAt { get; set; }
        public DateTime? PenalizedAt { get; set; }

        // Số tiền phạt gắn vào đêm (nếu có)
        public decimal PenaltyAmount { get; set; } = 0m;

        // Đã phản ánh điều chỉnh tồn kho cho trạng thái hiện hành
        public bool InventoryAdjusted { get; set; } = true;
    }
}

// File: Models/RoomTypeVoucher.cs
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VirtualTravel.Models
{
    public class RoomTypeVoucher
    {
        [Key]
        public int RoomTypeVoucherID { get; set; }

        [Required]
        [ForeignKey(nameof(RoomType))]
        public int RoomTypeID { get; set; }

        [Required]
        public int HotelID { get; set; }

        [MaxLength(50)]
        public string? Code { get; set; } // nếu muốn dùng mã giảm giá

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = "";

        /// <summary>
        /// Giảm theo % (0-100). Có thể null nếu dùng DiscountAmount.
        /// </summary>
        public decimal? DiscountPercent { get; set; }

        /// <summary>
        /// Giảm cố định theo số tiền. Có thể null nếu dùng DiscountPercent.
        /// </summary>
        public decimal? DiscountAmount { get; set; }

        /// <summary>
        /// Ngày bắt đầu áp dụng
        /// </summary>
        public DateTime FromDate { get; set; }

        /// <summary>
        /// Ngày kết thúc áp dụng (có thể null)
        /// </summary>
        public DateTime? ToDate { get; set; }

        public bool IsActive { get; set; } = true;

        public bool IsDeleted { get; set; } = false;

        // Navigation
        public RoomType? RoomType { get; set; }
    }
}

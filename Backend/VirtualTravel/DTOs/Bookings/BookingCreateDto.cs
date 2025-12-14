// File: Models/Dto/BookingCreateDto.cs
using System;

namespace VirtualTravel.Models.Dto
{
    public class BookingCreateDto
    {
        public int? HotelID { get; set; }
        public int? RoomTypeID { get; set; }
        public int? TourID { get; set; }

        public DateTime? CheckInDate { get; set; }
        public DateTime? CheckOutDate { get; set; }

        public string? FullName { get; set; }
        public string? Phone { get; set; }
        public string? Requests { get; set; }

        public int Quantity { get; set; }
        public int Nights { get; set; }

        // FE gửi giá gốc & giá giảm
        public decimal? OriginalPrice { get; set; }
        public decimal? FinalPrice { get; set; }
        public decimal? TotalFinal { get; set; }
        public string? VoucherApplied { get; set; }

        public string? PaymentTiming { get; set; }
        public string? PaymentProvider { get; set; }
    }
}

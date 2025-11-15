// /Models/HotelAvailability.cs
using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace VirtualTravel.Models
{
    // Mỗi ngày 1 record, duy nhất theo (HotelID, RoomTypeID, Date)
    [Index(nameof(HotelID), nameof(RoomTypeID), nameof(Date), IsUnique = true)]
    public class HotelAvailability
    {
        public int HotelAvailabilityID { get; set; }

        // Liên kết đến khách sạn
        public int HotelID { get; set; }
        public Hotel? Hotel { get; set; }

        // Liên kết đến loại phòng
        public int RoomTypeID { get; set; }
        public RoomType? RoomType { get; set; }

        // Ngày áp dụng tồn kho/giá
        public DateTime Date { get; set; } // lưu Date.Date

        public bool IsDeleted { get; set; } = false;

        // Thông tin quản lý phòng
        public int AvailableRooms { get; set; }   // Số phòng còn lại trong ngày
        public decimal Price { get; set; }        // Giá theo ngày

        // Chống ghi đè khi xác nhận đơn đồng thời
        [Timestamp]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();
    }
}

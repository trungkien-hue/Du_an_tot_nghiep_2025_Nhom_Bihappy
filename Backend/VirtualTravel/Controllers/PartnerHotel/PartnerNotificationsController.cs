// File: Controllers/Partner/PartnerNotificationsController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using VirtualTravel.Data;

namespace VirtualTravel.Controllers.PartnerHotel
{
    [ApiController]
    [Route("api/partner/notifications")]
    [Authorize(Roles = "Hotel")]
    [Authorize(Roles = "Hotel")]
    public class PartnerNotificationsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public PartnerNotificationsController(AppDbContext db) { _db = db; }

        private int CurrentHotelId => int.Parse(User.FindFirst("hotelId")!.Value);

        public sealed class PartnerNotiDto
        {
            public int NotificationID { get; set; }
            public string? Type { get; set; }
            public string? Title { get; set; }
            public string? Message { get; set; }
            public DateTime CreatedAt { get; set; }
            public bool IsRead { get; set; }
            public int? BookingID { get; set; }
            public int? HotelID { get; set; }
            public int? TargetHotelId { get; set; }

            public ExtraPayload? Extra { get; set; }
            public sealed class ExtraPayload
            {
                public CustomerPayload? Customer { get; set; }
                public StayPayload? Stay { get; set; }
                public PricesPayload? Prices { get; set; }
                public int? RoomTypeId { get; set; }
            }
            public sealed class CustomerPayload
            {
                public string? Name { get; set; }
                public string? Phone { get; set; }
            }
            public sealed class StayPayload
            {
                public DateTime? CheckIn { get; set; }
                public DateTime? CheckOut { get; set; }
                public int? Quantity { get; set; }
            }
            public sealed class PricesPayload
            {
                public decimal? PricePerNight { get; set; }
                public decimal? Total { get; set; }
            }
        }

        [HttpGet]
        public async Task<IActionResult> List(
            [FromQuery] bool unreadOnly = false,
            [FromQuery] int take = 50,
            CancellationToken ct = default)
        {
            take = take < 1 ? 50 : take > 200 ? 200 : take;

            var q = from n in _db.Notifications.AsNoTracking()
                    where n.TargetHotelId == CurrentHotelId
                    join b in _db.Bookings.AsNoTracking()
                         on n.BookingID equals b.BookingID into bj
                    from b in bj.DefaultIfEmpty()
                    select new PartnerNotiDto
                    {
                        NotificationID = n.NotificationID,
                        Type = n.Type,
                        Title = n.Title,
                        Message = n.Message,
                        CreatedAt = n.CreatedAt,
                        IsRead = n.IsRead,
                        BookingID = n.BookingID,
                        HotelID = n.HotelID,
                        TargetHotelId = n.TargetHotelId,
                        Extra = b == null ? null : new PartnerNotiDto.ExtraPayload
                        {
                            Customer = new PartnerNotiDto.CustomerPayload
                            {
                                Name = b.FullName,
                                Phone = b.Phone
                            },
                            Stay = new PartnerNotiDto.StayPayload
                            {
                                CheckIn = b.CheckInDate,
                                CheckOut = b.CheckOutDate,
                                Quantity = b.Quantity
                            },
                            Prices = new PartnerNotiDto.PricesPayload
                            {
                                PricePerNight = b.Price,
                                Total = b.TotalPrice
                            },
                            RoomTypeId = b.RoomTypeID
                        }
                    };

            if (unreadOnly) q = q.Where(n => !n.IsRead);

            var data = await q
                .OrderByDescending(n => n.CreatedAt)
                .Take(take)
                .ToListAsync(ct);

            return Ok(data);
        }

        [HttpPut("{notificationId:int}/read")]
        public async Task<IActionResult> MarkRead(int notificationId, CancellationToken ct)
        {
            var n = await _db.Notifications
                .FirstOrDefaultAsync(x =>
                    x.NotificationID == notificationId &&
                    x.TargetHotelId == CurrentHotelId, ct);

            if (n == null) return NotFound();

            if (!n.IsRead)
            {
                n.IsRead = true;
                await _db.SaveChangesAsync(ct);
            }

            return Ok(new { message = "Đã đánh dấu đã đọc", id = notificationId });
        }

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllRead(CancellationToken ct)
        {
            var list = await _db.Notifications
                .Where(x => x.TargetHotelId == CurrentHotelId && !x.IsRead)
                .ToListAsync(ct);

            foreach (var n in list) n.IsRead = true;
            await _db.SaveChangesAsync(ct);

            return Ok(new { message = "Đã đánh dấu tất cả là đã đọc", count = list.Count });
        }
    }
}

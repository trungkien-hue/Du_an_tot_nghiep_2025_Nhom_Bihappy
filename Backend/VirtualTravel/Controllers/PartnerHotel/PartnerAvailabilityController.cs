using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers.PartnerHotel
{
    [ApiController]
    [Route("api/partner/availability")]
    [Authorize(Roles = AppRoles.Hotel)]
    public class PartnerAvailabilityController : ControllerBase
    {
        private readonly AppDbContext _db;

        public PartnerAvailabilityController(AppDbContext db)
        {
            _db = db;
        }

        private int CurrentHotelId =>
            int.Parse(User.FindFirst("hotelId")!.Value);

        // ================================
        // DTO
        // ================================
        public class AvailabilityDto
        {
            public int HotelAvailabilityID { get; set; }
            public int RoomTypeID { get; set; }
            public DateTime Date { get; set; }
            public int AvailableRooms { get; set; }
            public decimal Price { get; set; }
        }

        public class UpdateAvailabilityDto
        {
            public int RoomTypeID { get; set; }
            public DateTime From { get; set; }
            public DateTime To { get; set; }
            public int? AvailableRooms { get; set; }
            public decimal? Price { get; set; }
        }

        // ================================
        // GET CALENDAR (1 tháng)
        // ================================
        [HttpGet]
        public async Task<IActionResult> GetCalendar(
            int roomTypeId,
            int year,
            int month,
            CancellationToken ct)
        {
            var hotelId = CurrentHotelId;

            var start = new DateTime(year, month, 1);
            var end = start.AddMonths(1).AddDays(-1);

            var data = await _db.HotelAvailabilities
                .Where(a => a.HotelID == hotelId
                            && a.RoomTypeID == roomTypeId
                            && a.Date >= start && a.Date <= end)
                .OrderBy(a => a.Date)
                .Select(a => new AvailabilityDto
                {
                    HotelAvailabilityID = a.HotelAvailabilityID,
                    RoomTypeID = a.RoomTypeID,
                    Date = a.Date,
                    AvailableRooms = a.AvailableRooms,
                    Price = a.Price
                })
                .ToListAsync(ct);

            return Ok(data);
        }

        // ================================
        // BULK UPDATE (update block ngày)
        // ================================
        [HttpPost("bulk-update")]
        public async Task<IActionResult> BulkUpdate(
            [FromBody] UpdateAvailabilityDto dto,
            CancellationToken ct)
        {
            if (dto.From > dto.To)
                return BadRequest("Ngày bắt đầu phải nhỏ hơn ngày kết thúc.");

            var hotelId = CurrentHotelId;

            var days = Enumerable.Range(0, (dto.To - dto.From).Days + 1)
                                 .Select(d => dto.From.AddDays(d));

            foreach (var d in days)
            {
                var entity = await _db.HotelAvailabilities
                    .FirstOrDefaultAsync(a =>
                        a.HotelID == hotelId &&
                        a.RoomTypeID == dto.RoomTypeID &&
                        a.Date == d,
                        ct);

                if (entity == null)
                {
                    entity = new HotelAvailability
                    {
                        HotelID = hotelId,
                        RoomTypeID = dto.RoomTypeID,
                        Date = d,
                        AvailableRooms = dto.AvailableRooms ?? 0,
                        Price = dto.Price ?? 0
                    };
                    _db.HotelAvailabilities.Add(entity);
                }
                else
                {
                    if (dto.AvailableRooms.HasValue)
                        entity.AvailableRooms = dto.AvailableRooms.Value;

                    if (dto.Price.HasValue)
                        entity.Price = dto.Price.Value;
                }
            }

            await _db.SaveChangesAsync(ct);

            return Ok(new { message = "Updated" });
        }
    }
}

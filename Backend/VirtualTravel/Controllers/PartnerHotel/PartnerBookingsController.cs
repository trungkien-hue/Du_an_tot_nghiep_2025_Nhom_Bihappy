using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers.PartnerHotel
{
    [ApiController]
    [Route("api/partner/bookings")]
    [Authorize(Roles = AppRoles.Hotel)]
    public class PartnerBookingsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public PartnerBookingsController(AppDbContext db)
        {
            _db = db;
        }

        private int CurrentHotelId => int.Parse(User.FindFirst("hotelId")!.Value);


        // =====================================================================
        // AUTO COMPLETE EXPIRED
        // =====================================================================
        private async Task AutoCompleteExpiredBookingsAsync(CancellationToken ct)
        {
            var now = DateTime.Now;

            var candidates = await _db.Bookings
                .Where(b =>
                    !b.IsDeleted &&
                    b.HotelID == CurrentHotelId &&
                    b.Status == "Confirmed" &&
                    b.CheckOutDate.HasValue)
                .ToListAsync(ct);

            foreach (var b in candidates)
            {
                var checkoutBoundary = b.CheckOutDate.Value.Date.AddHours(18);
                if (now >= checkoutBoundary)
                {
                    b.Status = "Completed";
                    _db.Bookings.Update(b);
                }
            }

            await _db.SaveChangesAsync(ct);
        }


        // =====================================================================
        // GET LIST
        // =====================================================================
        [HttpGet]
        public async Task<IActionResult> GetMyBookings([FromQuery] int take = 50, CancellationToken ct = default)
        {
            await AutoCompleteExpiredBookingsAsync(ct);

            take = take < 1 ? 50 : take > 200 ? 200 : take;

            var q =
                from b in _db.Bookings.AsNoTracking()
                where !b.IsDeleted && b.HotelID == CurrentHotelId
                join rt in _db.RoomTypes.AsNoTracking()
                    on b.RoomTypeID equals rt.RoomTypeID into roomTypeJoin
                from rt in roomTypeJoin.DefaultIfEmpty()
                orderby b.BookingDate descending
                select new
                {
                    b.BookingID,
                    b.FullName,
                    b.Phone,
                    b.Status,
                    b.CheckInDate,
                    b.CheckOutDate,
                    b.Quantity,
                    b.TotalPrice,
                    b.RoomTypeID,
                    RoomTypeName = rt != null ? rt.Name : null,
                    b.HotelName,
                    b.Location
                };

            var data = await q.Take(take).ToListAsync(ct);
            return Ok(data);
        }


        // =====================================================================
        // GET ONE
        // =====================================================================
        [HttpGet("{bookingId:int}")]
        public async Task<IActionResult> GetBooking(int bookingId, CancellationToken ct)
        {
            await AutoCompleteExpiredBookingsAsync(ct);

            var b = await _db.Bookings
                .FirstOrDefaultAsync(x =>
                    x.BookingID == bookingId &&
                    !x.IsDeleted &&
                    x.HotelID == CurrentHotelId, ct);

            if (b == null) return NotFound();
            return Ok(b);
        }


        // =====================================================================
        // CONFIRM — ⭐ TRỪ TỒN KHO + BOOKING NIGHTS
        // =====================================================================
        [HttpPost("{bookingId:int}/confirm")]
        public async Task<IActionResult> ConfirmBooking(int bookingId, CancellationToken ct)
        {
            var b = await _db.Bookings
                .FirstOrDefaultAsync(x =>
                    x.BookingID == bookingId &&
                    !x.IsDeleted &&
                    x.HotelID == CurrentHotelId, ct);

            if (b == null) return NotFound();

            if (b.Status is "Confirmed" or "Completed")
                return BadRequest("Đơn này đã được xác nhận hoặc đã hoàn tất.");

            try
            {
                // ⭐ TRỪ TỒN KHO
                await SubtractInventoryAsync(b, ct);

                // ⭐ Partner chỉ chuyển sang Confirmed (đúng yêu cầu)
                b.Status = "Confirmed";

                _db.Bookings.Update(b);
                await _db.SaveChangesAsync(ct);

                return Ok(new { message = $"Đã xác nhận đơn #{bookingId}." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Xác nhận thất bại.", detail = ex.Message });
            }
        }


        // =====================================================================
        // MANUAL COMPLETE
        // =====================================================================
        [HttpPost("{bookingId:int}/complete")]
        public async Task<IActionResult> CompleteBooking(int bookingId, CancellationToken ct)
        {
            var b = await _db.Bookings
                .FirstOrDefaultAsync(x =>
                    x.BookingID == bookingId &&
                    !x.IsDeleted &&
                    x.HotelID == CurrentHotelId, ct);

            if (b == null)
                return NotFound(new { message = "Không tìm thấy đơn." });

            if (b.Status == "Completed")
                return BadRequest(new { message = "Đơn đã hoàn tất trước đó." });

            if (b.Status != "Confirmed")
                return BadRequest(new { message = "Chỉ đơn ở trạng thái Confirmed mới có thể hoàn tất." });

            try
            {
                b.Status = "Completed";
                b.CheckedOutAt = DateTime.UtcNow;
                _db.Bookings.Update(b);
                await _db.SaveChangesAsync(ct);

                return Ok(new { message = $"Đơn #{bookingId} đã được chuyển sang Completed." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Hoàn tất thất bại.", detail = ex.Message });
            }
        }


        // =====================================================================
        // REJECT — ⭐ TRẢ TỒN KHO
        // =====================================================================
        [HttpPost("{bookingId:int}/reject")]
        public async Task<IActionResult> RejectBooking(int bookingId, [FromBody] string? reason, CancellationToken ct)
        {
            var b = await _db.Bookings
                .FirstOrDefaultAsync(x =>
                    x.BookingID == bookingId &&
                    !x.IsDeleted &&
                    x.HotelID == CurrentHotelId, ct);

            if (b == null) return NotFound();

            try
            {
                // TRẢ TỒN KHO
                if (b.Status is "Confirmed" or "Completed")
                {
                    await ReturnInventoryAsync(b, ct);
                }

                b.Status = "Rejected";

                if (!string.IsNullOrWhiteSpace(reason))
                    b.Note = $"[Hotel reject] {reason}";

                _db.Bookings.Update(b);
                await _db.SaveChangesAsync(ct);

                return Ok(new { message = $"Đã từ chối đơn #{bookingId}." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Từ chối thất bại.", detail = ex.Message });
            }
        }



        // =====================================================================
        // ⭐⭐ INVENTORY HELPERS (TRỪ / TRẢ TỒN)
        // =====================================================================

        private static DateTime D(DateTime t) => t.Date;

        private async Task SubtractInventoryAsync(Booking booking, CancellationToken ct)
        {
            if (!booking.HotelID.HasValue || !booking.RoomTypeID.HasValue)
                return;

            var hotelId = booking.HotelID.Value;
            var roomTypeId = booking.RoomTypeID.Value;
            var qty = booking.Quantity <= 0 ? 1 : booking.Quantity;

            var ci = D(booking.CheckInDate!.Value);
            var co = D(booking.CheckOutDate!.Value);
            var end = (ci == co) ? ci.AddDays(1) : co;

            for (var day = ci; day < end; day = day.AddDays(1))
            {
                var avail = await _db.HotelAvailabilities
                    .FirstOrDefaultAsync(x =>
                        x.HotelID == hotelId &&
                        x.RoomTypeID == roomTypeId &&
                        x.Date == day, ct);

                if (avail == null)
                    throw new InvalidOperationException($"Không tìm thấy tồn kho ngày {day:yyyy-MM-dd}");

                if (avail.AvailableRooms < qty)
                    throw new InvalidOperationException(
                        $"Ngày {day:yyyy-MM-dd} chỉ còn {avail.AvailableRooms} phòng.");

                avail.AvailableRooms -= qty;
                _db.HotelAvailabilities.Update(avail);

                bool exists = await _db.BookingNights
                    .AnyAsync(x => x.BookingID == booking.BookingID && x.NightDate == day, ct);

                if (!exists)
                {
                    _db.BookingNights.Add(new BookingNight
                    {
                        BookingID = booking.BookingID,
                        NightDate = day,
                        Quantity = qty,
                        UnitPrice = booking.Price ?? 0m,
                        State = "Held",
                        InventoryAdjusted = true
                    });
                }
            }
        }

        private async Task ReturnInventoryAsync(Booking booking, CancellationToken ct)
        {
            if (!booking.HotelID.HasValue || !booking.RoomTypeID.HasValue)
                return;

            var hotelId = booking.HotelID.Value;
            var roomTypeId = booking.RoomTypeID.Value;
            var qty = booking.Quantity <= 0 ? 1 : booking.Quantity;

            var nights = await _db.BookingNights
                .Where(n => n.BookingID == booking.BookingID && n.InventoryAdjusted)
                .ToListAsync(ct);

            foreach (var n in nights)
            {
                var avail = await _db.HotelAvailabilities
                    .FirstOrDefaultAsync(x =>
                        x.HotelID == hotelId &&
                        x.RoomTypeID == roomTypeId &&
                        x.Date == n.NightDate, ct);

                if (avail != null)
                {
                    avail.AvailableRooms += qty;
                    _db.HotelAvailabilities.Update(avail);
                }

                n.State = "Released";
                n.ReleasedAt = DateTime.UtcNow;
                _db.BookingNights.Update(n);
            }
        }
    }
}

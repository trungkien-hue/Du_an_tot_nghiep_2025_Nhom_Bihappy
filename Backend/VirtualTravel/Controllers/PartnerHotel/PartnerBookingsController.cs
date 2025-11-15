// File: Controllers/Partner/PartnerBookingsController.cs
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

        // ======================== LIST & DETAIL ========================

        [HttpGet]
        public async Task<IActionResult> GetMyBookings([FromQuery] int take = 50, CancellationToken ct = default)
        {
            take = take < 1 ? 50 : take > 200 ? 200 : take;

            var q = _db.Bookings
                .Where(b => !b.IsDeleted && b.HotelID == CurrentHotelId)
                .OrderByDescending(b => b.BookingDate)
                .Take(take);

            var data = await q.ToListAsync(ct);
            return Ok(data);
        }

        [HttpGet("{bookingId:int}")]
        public async Task<IActionResult> GetBooking(int bookingId, CancellationToken ct)
        {
            var b = await _db.Bookings
                .FirstOrDefaultAsync(x => x.BookingID == bookingId && !x.IsDeleted && x.HotelID == CurrentHotelId, ct);

            if (b == null) return NotFound();
            return Ok(b);
        }

        // ======================== CONFIRM (ledger + tồn) ========================

        [HttpPut("{bookingId:int}/confirm")]
        public async Task<IActionResult> Confirm(int bookingId, CancellationToken ct)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            var b = await _db.Bookings
                .FirstOrDefaultAsync(x => x.BookingID == bookingId && !x.IsDeleted && x.HotelID == CurrentHotelId, ct);

            if (b == null) return NotFound();
            if (b.Status is "Confirmed" or "Completed")
                return BadRequest(new { message = "Đơn đã được xác nhận trước đó." });

            try
            {
                await CreateLedgerAndSubtractInventoryAsync(b, ct);
                b.Status = "Confirmed";

                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                await tx.RollbackAsync(ct);
                return Conflict(new { message = "Xác nhận đồng thời. Vui lòng thử lại." });
            }
            catch (InvalidOperationException ex)
            {
                await tx.RollbackAsync(ct);
                return BadRequest(new { message = ex.Message });
            }

            return Ok(new { message = "Đã xác nhận đơn", bookingId = b.BookingID, status = b.Status });
        }

        // ======================== REJECT (trả đêm tương lai) ====================

        [HttpPut("{bookingId:int}/reject")]
        public async Task<IActionResult> Reject(int bookingId, [FromBody] string? reason, CancellationToken ct = default)
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            var b = await _db.Bookings
                .FirstOrDefaultAsync(x => x.BookingID == bookingId && !x.IsDeleted && x.HotelID == CurrentHotelId, ct);

            if (b == null) return NotFound();

            try
            {
                if (b.Status is "Confirmed" or "Completed")
                    await ReleaseFutureNightsAndReturnInventoryAsync(b, ct);

                b.Status = "Rejected";
                if (!string.IsNullOrWhiteSpace(reason))
                    b.Note = $"[Hotel reject] {reason}";

                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                await tx.RollbackAsync(ct);
                return Conflict(new { message = "Từ chối đồng thời. Vui lòng thử lại." });
            }
            catch (InvalidOperationException ex)
            {
                await tx.RollbackAsync(ct);
                return BadRequest(new { message = ex.Message });
            }

            return Ok(new { message = "Đã từ chối đơn", bookingId = b.BookingID, status = b.Status });
        }

        // ======================== HELPERS (ledger + inventory) ==================

        private static DateTime D(DateTime t) => t.Date;

        private decimal GetLockedUnitPrice(Booking booking, DateTime night)
        {
            if (booking?.Price is decimal p) return p;
            return 0m;
        }

        private async Task SubtractAvailabilityAsync(int hotelId, int roomTypeId, DateTime nightDate, int qty, CancellationToken ct)
        {
            var totalRooms = await _db.RoomTypes
                .Where(r => r.RoomTypeID == roomTypeId)
                .Select(r => r.TotalRooms)
                .FirstAsync(ct);

            var avail = await _db.HotelAvailabilities.SingleOrDefaultAsync(x =>
                x.HotelID == hotelId && x.RoomTypeID == roomTypeId && x.Date == nightDate, ct);

            if (avail == null)
            {
                avail = new HotelAvailability
                {
                    HotelID = hotelId,
                    RoomTypeID = roomTypeId,
                    Date = nightDate,
                    AvailableRooms = totalRooms,
                    IsDeleted = false,
                    Price = 0m
                };
                _db.HotelAvailabilities.Add(avail);
                await _db.SaveChangesAsync(ct);
            }

            if (avail.AvailableRooms < qty)
                throw new InvalidOperationException($"Ngày {nightDate:yyyy-MM-dd} chỉ còn {avail.AvailableRooms} phòng.");

            avail.AvailableRooms -= qty;
            _db.HotelAvailabilities.Update(avail);
        }

        private async Task AddAvailabilityAsync(int hotelId, int roomTypeId, DateTime nightDate, int qty, CancellationToken ct)
        {
            var totalRooms = await _db.RoomTypes
                .Where(r => r.RoomTypeID == roomTypeId)
                .Select(r => r.TotalRooms)
                .FirstAsync(ct);

            var avail = await _db.HotelAvailabilities.SingleOrDefaultAsync(x =>
                x.HotelID == hotelId && x.RoomTypeID == roomTypeId && x.Date == nightDate, ct);

            if (avail == null)
            {
                avail = new HotelAvailability
                {
                    HotelID = hotelId,
                    RoomTypeID = roomTypeId,
                    Date = nightDate,
                    AvailableRooms = totalRooms,
                    IsDeleted = false,
                    Price = 0m
                };
                _db.HotelAvailabilities.Add(avail);
                await _db.SaveChangesAsync(ct);
            }

            avail.AvailableRooms += qty;
            _db.HotelAvailabilities.Update(avail);
        }

        private async Task CreateLedgerAndSubtractInventoryAsync(Booking booking, CancellationToken ct)
        {
            if (!booking.HotelID.HasValue || !booking.RoomTypeID.HasValue || booking.CheckInDate is null || booking.CheckOutDate is null)
                return;

            var hotelId = booking.HotelID!.Value;
            var roomTypeId = booking.RoomTypeID!.Value;
            var qty = booking.Quantity <= 0 ? 1 : booking.Quantity;

            var ci = D(booking.CheckInDate.Value);
            var co = D(booking.CheckOutDate.Value);
            if (co < ci) throw new InvalidOperationException("Khoảng ngày CheckIn/CheckOut không hợp lệ.");

            bool isDayUse = co == ci;
            var end = isDayUse ? ci.AddDays(1) : co;

            for (var d = ci; d < end; d = d.AddDays(1))
            {
                await SubtractAvailabilityAsync(hotelId, roomTypeId, d, qty, ct);

                var exists = await _db.BookingNights.AnyAsync(x => x.BookingID == booking.BookingID && x.NightDate == d, ct);
                if (!exists)
                {
                    _db.BookingNights.Add(new BookingNight
                    {
                        BookingID = booking.BookingID,
                        NightDate = d,
                        Quantity = qty,
                        UnitPrice = GetLockedUnitPrice(booking, d),
                        State = "Held",
                        InventoryAdjusted = true
                    });
                }
            }
        }

        private async Task ReleaseFutureNightsAndReturnInventoryAsync(Booking booking, CancellationToken ct)
        {
            if (!booking.HotelID.HasValue || !booking.RoomTypeID.HasValue || booking.CheckInDate is null || booking.CheckOutDate is null)
                return;

            var today = DateTime.UtcNow.Date;

            var pastHeld = await _db.BookingNights
                .Where(x => x.BookingID == booking.BookingID && x.NightDate < today && x.State == "Held")
                .ToListAsync(ct);

            foreach (var n in pastHeld)
            {
                n.State = "Consumed";
                n.ConsumedAt = DateTime.UtcNow;
                _db.BookingNights.Update(n);
            }

            var futureHeld = await _db.BookingNights
                .Where(x => x.BookingID == booking.BookingID && x.NightDate >= today && x.State == "Held")
                .OrderBy(x => x.NightDate)
                .ToListAsync(ct);

            int penaltyNights = futureHeld.Any() ? 1 : 0;

            for (int i = 0; i < futureHeld.Count; i++)
            {
                var n = futureHeld[i];
                if (i < penaltyNights)
                {
                    n.State = "Penalized";
                    n.PenalizedAt = DateTime.UtcNow;
                    n.PenaltyAmount = n.UnitPrice * n.Quantity;

                    if (n.InventoryAdjusted)
                        await AddAvailabilityAsync(booking.HotelID!.Value, booking.RoomTypeID!.Value, n.NightDate, n.Quantity, ct);

                    n.InventoryAdjusted = true;
                    _db.BookingNights.Update(n);
                }
                else
                {
                    n.State = "Released";
                    n.ReleasedAt = DateTime.UtcNow;

                    if (n.InventoryAdjusted)
                        await AddAvailabilityAsync(booking.HotelID!.Value, booking.RoomTypeID!.Value, n.NightDate, n.Quantity, ct);

                    n.InventoryAdjusted = true;
                    _db.BookingNights.Update(n);
                }
            }
        }
    }
}

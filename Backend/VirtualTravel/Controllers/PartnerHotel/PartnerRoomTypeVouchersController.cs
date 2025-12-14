// File: Controllers/Partner/PartnerRoomTypeVouchersController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers.PartnerHotel
{
    [ApiController]
    [Route("api/partner/vouchers")]
    [Authorize(Roles = AppRoles.Hotel)]
    public class PartnerRoomTypeVouchersController : ControllerBase
    {
        private readonly AppDbContext _db;
        public PartnerRoomTypeVouchersController(AppDbContext db)
        {
            _db = db;
        }

        private int CurrentHotelId => int.Parse(User.FindFirst("hotelId")!.Value);

        // =====================================================================
        // GET: Danh sách voucher theo RoomType
        // =====================================================================
        [HttpGet("{roomTypeId:int}")]
        public async Task<IActionResult> GetByRoomType(int roomTypeId)
        {
            var hotelId = CurrentHotelId;

            var list = await _db.RoomTypeVouchers
                .Where(v => v.RoomTypeID == roomTypeId && v.HotelID == hotelId && !v.IsDeleted)
                .OrderByDescending(v => v.RoomTypeVoucherID)
                .Select(v => new
                {
                    v.RoomTypeVoucherID,
                    v.RoomTypeID,
                    v.Title,
                    v.Code,
                    v.DiscountPercent,
                    v.DiscountAmount,
                    v.FromDate,
                    v.ToDate,
                    v.IsActive
                })
                .ToListAsync();

            return Ok(list);
        }

        // =====================================================================
        // POST: Create voucher
        // =====================================================================
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] RoomTypeVoucher dto)
        {
            var hotelId = CurrentHotelId;

            var belongs = await _db.RoomTypes
                .AnyAsync(rt => rt.RoomTypeID == dto.RoomTypeID && rt.HotelID == hotelId);

            if (!belongs)
                return BadRequest("RoomType không thuộc khách sạn của bạn.");

            dto.HotelID = hotelId;

            _db.RoomTypeVouchers.Add(dto);
            await _db.SaveChangesAsync();

            return Ok(dto);
        }

        // =====================================================================
        // PUT: Update voucher
        // =====================================================================
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] RoomTypeVoucher dto)
        {
            var hotelId = CurrentHotelId;

            var v = await _db.RoomTypeVouchers
                .FirstOrDefaultAsync(x => x.RoomTypeVoucherID == id && x.HotelID == hotelId);

            if (v == null) return NotFound();

            v.Title = dto.Title;
            v.Code = dto.Code;
            v.DiscountAmount = dto.DiscountAmount;
            v.DiscountPercent = dto.DiscountPercent;
            v.FromDate = dto.FromDate;
            v.ToDate = dto.ToDate;
            v.IsActive = dto.IsActive;

            await _db.SaveChangesAsync();
            return Ok(v);
        }

        // =====================================================================
        // DELETE: Remove voucher (soft delete)
        // =====================================================================
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var hotelId = CurrentHotelId;

            var v = await _db.RoomTypeVouchers
                .FirstOrDefaultAsync(x => x.RoomTypeVoucherID == id && x.HotelID == hotelId);

            if (v == null) return NotFound();

            v.IsDeleted = true;
            await _db.SaveChangesAsync();

            return Ok(new { message = "Đã xoá voucher." });
        }
    }
}

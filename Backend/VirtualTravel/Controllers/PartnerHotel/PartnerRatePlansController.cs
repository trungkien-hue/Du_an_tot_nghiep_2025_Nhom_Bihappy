// File: Controllers/Partner/PartnerRatePlansController.cs
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers.PartnerHotel
{
    [ApiController]
    [Route("api/partner/rateplans")]
    [Authorize(Roles = AppRoles.Hotel)]
    public class PartnerRatePlansController : ControllerBase
    {
        private readonly AppDbContext _db;

        public PartnerRatePlansController(AppDbContext db)
        {
            _db = db;
        }

        private int CurrentHotelId => int.Parse(User.FindFirst("hotelId")!.Value);

        // ================= DTOs =================

        public sealed class RatePlanListDto
        {
            public int RatePlanID { get; set; }
            public int HotelID { get; set; }
            public int? RoomTypeID { get; set; }
            public string? RoomTypeName { get; set; }

            public string Name { get; set; } = string.Empty;
            public string? Description { get; set; }
            public decimal BasePrice { get; set; }
            public string Currency { get; set; } = "VND";
            public bool IsActive { get; set; }
        }

        public sealed class RatePlanCreateDto
        {
            public int? RoomTypeID { get; set; }

            [Required]
            [MaxLength(200)]
            public string Name { get; set; } = string.Empty;

            public string? Description { get; set; }

            [Range(0, double.MaxValue)]
            public decimal BasePrice { get; set; } = 0;

            [MaxLength(10)]
            public string Currency { get; set; } = "VND";

            public bool IsActive { get; set; } = true;
        }

        public sealed class RatePlanUpdateDto
        {
            public int? RoomTypeID { get; set; }

            [MaxLength(200)]
            public string? Name { get; set; }

            public string? Description { get; set; }

            [Range(0, double.MaxValue)]
            public decimal? BasePrice { get; set; }

            [MaxLength(10)]
            public string? Currency { get; set; }

            public bool? IsActive { get; set; }
        }

        // =============== API ===============

        /// <summary>
        /// Danh sách RatePlan của khách sạn hiện tại
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetMyRatePlans(
            [FromQuery] int? roomTypeId,
            [FromQuery] bool? onlyActive,
            CancellationToken ct)
        {
            var hotelId = CurrentHotelId;

            var q = _db.RatePlans
                .Include(rp => rp.RoomType)
                .Where(rp => rp.HotelID == hotelId)
                .AsQueryable();

            if (roomTypeId.HasValue)
            {
                q = q.Where(rp => rp.RoomTypeID == roomTypeId.Value);
            }

            if (onlyActive.HasValue && onlyActive.Value)
            {
                q = q.Where(rp => rp.IsActive);
            }

            var list = await q
                .OrderBy(rp => rp.RoomTypeID)
                .ThenBy(rp => rp.Name)
                .Select(rp => new RatePlanListDto
                {
                    RatePlanID = rp.RatePlanID,
                    HotelID = rp.HotelID,
                    RoomTypeID = rp.RoomTypeID,
                    RoomTypeName = rp.RoomType != null ? rp.RoomType.Name : null,
                    Name = rp.Name,
                    Description = rp.Description,
                    BasePrice = rp.BasePrice,
                    Currency = rp.Currency,
                    IsActive = rp.IsActive
                })
                .ToListAsync(ct);

            return Ok(list);
        }

        /// <summary>
        /// Chi tiết 1 RatePlan của khách sạn
        /// </summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetDetail(int id, CancellationToken ct)
        {
            var hotelId = CurrentHotelId;

            var rp = await _db.RatePlans
                .Include(x => x.RoomType)
                .FirstOrDefaultAsync(x => x.RatePlanID == id && x.HotelID == hotelId, ct);

            if (rp == null) return NotFound();

            var dto = new RatePlanListDto
            {
                RatePlanID = rp.RatePlanID,
                HotelID = rp.HotelID,
                RoomTypeID = rp.RoomTypeID,
                RoomTypeName = rp.RoomType?.Name,
                Name = rp.Name,
                Description = rp.Description,
                BasePrice = rp.BasePrice,
                Currency = rp.Currency,
                IsActive = rp.IsActive
            };

            return Ok(dto);
        }

        /// <summary>
        /// Tạo mới RatePlan
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] RatePlanCreateDto dto, CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var hotelId = CurrentHotelId;

            // Nếu có RoomTypeID thì verify thuộc về hotel này
            if (dto.RoomTypeID.HasValue)
            {
                var exists = await _db.RoomTypes
                    .AnyAsync(rt => rt.RoomTypeID == dto.RoomTypeID.Value && rt.HotelID == hotelId, ct);
                if (!exists)
                    return BadRequest("RoomType không tồn tại hoặc không thuộc khách sạn của bạn.");
            }

            var entity = new RatePlan
            {
                HotelID = hotelId,
                RoomTypeID = dto.RoomTypeID,
                Name = dto.Name.Trim(),
                Description = dto.Description,
                BasePrice = dto.BasePrice,
                Currency = dto.Currency ?? "VND",
                IsActive = dto.IsActive,
                // ExternalRatePlanCode có thể được set sau nếu cần mapping OTA
            };

            _db.RatePlans.Add(entity);
            await _db.SaveChangesAsync(ct);

            var result = new RatePlanListDto
            {
                RatePlanID = entity.RatePlanID,
                HotelID = entity.HotelID,
                RoomTypeID = entity.RoomTypeID,
                RoomTypeName = await _db.RoomTypes
                    .Where(rt => rt.RoomTypeID == entity.RoomTypeID)
                    .Select(rt => rt.Name)
                    .FirstOrDefaultAsync(ct),
                Name = entity.Name,
                Description = entity.Description,
                BasePrice = entity.BasePrice,
                Currency = entity.Currency,
                IsActive = entity.IsActive
            };

            return Ok(result);
        }

        /// <summary>
        /// Cập nhật RatePlan
        /// </summary>
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(
            int id,
            [FromBody] RatePlanUpdateDto dto,
            CancellationToken ct)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var hotelId = CurrentHotelId;

            var entity = await _db.RatePlans
                .FirstOrDefaultAsync(rp => rp.RatePlanID == id && rp.HotelID == hotelId, ct);

            if (entity == null) return NotFound();

            if (dto.RoomTypeID.HasValue)
            {
                // Validate RoomType thuộc hotel
                var exists = await _db.RoomTypes
                    .AnyAsync(rt => rt.RoomTypeID == dto.RoomTypeID.Value && rt.HotelID == hotelId, ct);
                if (!exists)
                    return BadRequest("RoomType không tồn tại hoặc không thuộc khách sạn của bạn.");

                entity.RoomTypeID = dto.RoomTypeID;
            }

            if (!string.IsNullOrWhiteSpace(dto.Name))
                entity.Name = dto.Name.Trim();

            if (dto.Description != null)
                entity.Description = dto.Description;

            if (dto.BasePrice.HasValue)
                entity.BasePrice = dto.BasePrice.Value;

            if (!string.IsNullOrWhiteSpace(dto.Currency))
                entity.Currency = dto.Currency.Trim();

            if (dto.IsActive.HasValue)
                entity.IsActive = dto.IsActive.Value;

            await _db.SaveChangesAsync(ct);

            return Ok(new RatePlanListDto
            {
                RatePlanID = entity.RatePlanID,
                HotelID = entity.HotelID,
                RoomTypeID = entity.RoomTypeID,
                RoomTypeName = await _db.RoomTypes
                    .Where(rt => rt.RoomTypeID == entity.RoomTypeID)
                    .Select(rt => rt.Name)
                    .FirstOrDefaultAsync(ct),
                Name = entity.Name,
                Description = entity.Description,
                BasePrice = entity.BasePrice,
                Currency = entity.Currency,
                IsActive = entity.IsActive
            });
        }

        /// <summary>
        /// "Xoá" RatePlan: đánh dấu IsActive = false (không dùng nữa)
        /// </summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var hotelId = CurrentHotelId;

            var entity = await _db.RatePlans
                .FirstOrDefaultAsync(rp => rp.RatePlanID == id && rp.HotelID == hotelId, ct);

            if (entity == null) return NotFound();

            entity.IsActive = false;
            await _db.SaveChangesAsync(ct);

            return Ok(new { message = "Đã vô hiệu hoá rate plan." });
        }
    }
}

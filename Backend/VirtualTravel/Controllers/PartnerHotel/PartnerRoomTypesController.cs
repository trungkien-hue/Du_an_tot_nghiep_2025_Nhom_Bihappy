// File: Controllers/Partner/PartnerRoomTypesController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers.PartnerHotel
{
    [ApiController]
    [Route("api/partner/roomtypes")]
    [Authorize(Roles = AppRoles.Hotel)]
    public class PartnerRoomTypesController : ControllerBase
    {
        private readonly AppDbContext _db;

        public PartnerRoomTypesController(AppDbContext db)
        {
            _db = db;
        }

        // Lấy HotelID từ token (bạn đã dùng cùng kiểu trong các PartnerController khác)
        private int CurrentHotelId =>
            int.Parse(User.FindFirst("hotelId")!.Value);

        // ========== DTO ==========

        public class RoomTypeDto
        {
            public int RoomTypeID { get; set; }
            public string Name { get; set; } = "";
            public string? Description { get; set; }
            public int Capacity { get; set; }
            public int TotalRooms { get; set; }
        }

        public class CreateRoomTypeDto
        {
            public string Name { get; set; } = "";
            public string? Description { get; set; }
            public int Capacity { get; set; }
            public int TotalRooms { get; set; }
        }

        public class UpdateRoomTypeDto
        {
            public string? Name { get; set; }
            public string? Description { get; set; }
            public int? Capacity { get; set; }
            public int? TotalRooms { get; set; }
        }

        // ========== API ==========

        /// GET /api/partner/roomtypes
        [HttpGet]
        public async Task<IActionResult> GetMyRoomTypes(CancellationToken ct)
        {
            var hotelId = CurrentHotelId;

            var list = await _db.RoomTypes
                .Where(rt => rt.HotelID == hotelId)
                .OrderBy(rt => rt.RoomTypeID)
                .Select(rt => new RoomTypeDto
                {
                    RoomTypeID = rt.RoomTypeID,
                    Name = rt.Name,
                    Description = rt.Description,
                    Capacity = rt.Capacity,
                    TotalRooms = rt.TotalRooms
                })
                .ToListAsync(ct);

            return Ok(list);
        }

        /// GET /api/partner/roomtypes/{id}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetDetail(int id, CancellationToken ct)
        {
            var hotelId = CurrentHotelId;

            var rt = await _db.RoomTypes
                .Where(x => x.RoomTypeID == id && x.HotelID == hotelId)
                .Select(rt => new RoomTypeDto
                {
                    RoomTypeID = rt.RoomTypeID,
                    Name = rt.Name,
                    Description = rt.Description,
                    Capacity = rt.Capacity,
                    TotalRooms = rt.TotalRooms
                })
                .FirstOrDefaultAsync(ct);

            if (rt == null) return NotFound();
            return Ok(rt);
        }

        /// POST /api/partner/roomtypes
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateRoomTypeDto dto,
            CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var hotelId = CurrentHotelId;

            var entity = new RoomType
            {
                HotelID = hotelId,
                Name = dto.Name.Trim(),
                Description = dto.Description,
                Capacity = dto.Capacity,
                TotalRooms = dto.TotalRooms
            };

            _db.RoomTypes.Add(entity);
            await _db.SaveChangesAsync(ct);

            return Ok(new RoomTypeDto
            {
                RoomTypeID = entity.RoomTypeID,
                Name = entity.Name,
                Description = entity.Description,
                Capacity = entity.Capacity,
                TotalRooms = entity.TotalRooms
            });
        }

        /// PUT /api/partner/roomtypes/{id}
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(
            int id,
            [FromBody] UpdateRoomTypeDto dto,
            CancellationToken ct)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var hotelId = CurrentHotelId;

            var entity = await _db.RoomTypes
                .FirstOrDefaultAsync(x => x.RoomTypeID == id && x.HotelID == hotelId, ct);

            if (entity == null) return NotFound();

            if (dto.Name != null) entity.Name = dto.Name.Trim();
            if (dto.Description != null) entity.Description = dto.Description;
            if (dto.Capacity.HasValue) entity.Capacity = dto.Capacity.Value;
            if (dto.TotalRooms.HasValue) entity.TotalRooms = dto.TotalRooms.Value;

            await _db.SaveChangesAsync(ct);

            return Ok(new RoomTypeDto
            {
                RoomTypeID = entity.RoomTypeID,
                Name = entity.Name,
                Description = entity.Description,
                Capacity = entity.Capacity,
                TotalRooms = entity.TotalRooms
            });
        }

        /// DELETE /api/partner/roomtypes/{id}
        /// Ở đây demo xóa cứng, nếu muốn soft-delete thì đổi sang IsDeleted = true
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var hotelId = CurrentHotelId;

            var entity = await _db.RoomTypes
                .FirstOrDefaultAsync(x => x.RoomTypeID == id && x.HotelID == hotelId, ct);

            if (entity == null) return NotFound();

            _db.RoomTypes.Remove(entity);
            await _db.SaveChangesAsync(ct);

            return Ok(new { message = "Deleted" });
        }
    }
}

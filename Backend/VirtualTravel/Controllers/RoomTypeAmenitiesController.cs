using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers
{
    [ApiController]
    [Route("api/roomtypes/{roomTypeId:int}/amenities")]
    public class RoomTypeAmenitiesController : ControllerBase
    {
        private readonly AppDbContext _db;

        public RoomTypeAmenitiesController(AppDbContext db)
        {
            _db = db;
        }

        // GET: danh sách amenity của roomtype
        [HttpGet]
        public async Task<IActionResult> Get(int roomTypeId)
        {
            var exists = await _db.RoomTypes.AnyAsync(r => r.RoomTypeID == roomTypeId);
            if (!exists) return NotFound("RoomType not found");

            var list = await _db.RoomTypeAmenities
                .Where(x => x.RoomTypeID == roomTypeId)
                .Select(x => new {
                    x.AmenityID,
                    x.Amenity.Name,
                    x.Amenity.Icon
                })
                .ToListAsync();

            return Ok(list);
        }

        public class UpdateRequest
        {
            public int[] AmenityIds { get; set; } = Array.Empty<int>();
        }

        // POST: cập nhật full amenity cho roomType
        [HttpPost]
        public async Task<IActionResult> Update(int roomTypeId, UpdateRequest req)
        {
            var exists = await _db.RoomTypes.AnyAsync(r => r.RoomTypeID == roomTypeId);
            if (!exists) return NotFound("RoomType not found");

            // xóa toàn bộ
            var old = await _db.RoomTypeAmenities
                .Where(x => x.RoomTypeID == roomTypeId)
                .ToListAsync();

            _db.RoomTypeAmenities.RemoveRange(old);

            // thêm lại
            var newLinks = req.AmenityIds
                .Distinct()
                .Select(id => new RoomTypeAmenity
                {
                    RoomTypeID = roomTypeId,
                    AmenityID = id
                });

            await _db.RoomTypeAmenities.AddRangeAsync(newLinks);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Updated" });
        }
    }
}

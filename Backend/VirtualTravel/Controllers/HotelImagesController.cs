using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers
{
    [ApiController]
    [Route("api/hotels/{hotelId:int}/images")]
    public class HotelImagesController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly AppDbContext _db;

        public HotelImagesController(IWebHostEnvironment env, AppDbContext db)
        {
            _env = env; _db = db;
        }

        // GET: /api/hotels/5/images
        [HttpGet]
        public async Task<IActionResult> Get(int hotelId)
        {
            var items = await _db.HotelImages
                .Where(i => i.HotelID == hotelId && !i.IsDeleted)
                .OrderBy(i => i.SortOrder).ThenBy(i => i.HotelImageID)
                .ToListAsync();
            return Ok(items);
        }

        // POST: multipart/form-data (files[])
        [HttpPost]
        [RequestSizeLimit(50_000_000)]
        public async Task<IActionResult> Upload(int hotelId, [FromForm] IFormFile[] files, [FromForm] string? tag)
        {
            var hotel = await _db.Hotels.FindAsync(hotelId);
            if (hotel == null) return NotFound("Hotel not found.");

            var baseDir = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", "hotels", hotelId.ToString());
            Directory.CreateDirectory(baseDir);

            var saved = new List<HotelImage>();
            foreach (var f in files.Where(f => f?.Length > 0))
            {
                var fileName = $"{Guid.NewGuid():N}{Path.GetExtension(f.FileName)}";
                var path = Path.Combine(baseDir, fileName);
                await using (var fs = System.IO.File.Create(path))
                    await f.CopyToAsync(fs);

                var rel = $"/uploads/hotels/{hotelId}/{fileName}";
                var img = new HotelImage
                {
                    HotelID = hotelId,
                    ImageUrl = rel,
                    Tag = tag,
                    SortOrder = 9999
                };
                _db.HotelImages.Add(img);
                saved.Add(img);
            }

            await _db.SaveChangesAsync();
            return Ok(saved.OrderBy(x => x.HotelImageID));
        }

        // PATCH: set primary (cover)
        [HttpPatch("{imageId:int}/primary")]
        public async Task<IActionResult> SetPrimary(int hotelId, int imageId)
        {
            var imgs = await _db.HotelImages.Where(i => i.HotelID == hotelId).ToListAsync();
            if (!imgs.Any()) return NotFound();

            foreach (var i in imgs) i.IsPrimary = (i.HotelImageID == imageId);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // PATCH: reorder
        public record ReorderReq(int ImageId, int SortOrder);
        [HttpPatch("reorder")]
        public async Task<IActionResult> Reorder(int hotelId, [FromBody] List<ReorderReq> body)
        {
            var ids = body.Select(b => b.ImageId).ToHashSet();
            var imgs = await _db.HotelImages.Where(i => i.HotelID == hotelId && ids.Contains(i.HotelImageID)).ToListAsync();
            foreach (var r in body)
            {
                var img = imgs.FirstOrDefault(x => x.HotelImageID == r.ImageId);
                if (img != null) img.SortOrder = r.SortOrder;
            }
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: soft delete ảnh
        [HttpDelete("{imageId:int}")]
        public async Task<IActionResult> SoftDelete(int hotelId, int imageId)
        {
            var img = await _db.HotelImages.FirstOrDefaultAsync(i => i.HotelImageID == imageId && i.HotelID == hotelId);
            if (img == null) return NotFound();
            img.IsDeleted = true;
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}

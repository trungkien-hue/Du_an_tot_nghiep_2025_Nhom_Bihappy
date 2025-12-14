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
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;

        public HotelImagesController(AppDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        private static string WebPath(string p) => p.Replace("\\", "/");

        private string GetDir(int hotelId)
        {
            return Path.Combine(_env.WebRootPath, "uploads", "hotels", hotelId.ToString());
        }

        // ===================== GET LIST IMAGES =====================
        [HttpGet]
        public async Task<IActionResult> GetImages(int hotelId)
        {
            var items = await _db.HotelImages
                .Where(i => i.HotelID == hotelId && !i.IsDeleted)
                .OrderBy(i => i.SortOrder)
                .Select(i => new
                {
                    i.HotelImageID,
                    i.ImageUrl,
                    i.IsPrimary,
                    i.SortOrder
                })
                .ToListAsync();

            return Ok(items);
        }

        // ===================== UPLOAD IMAGES =====================
        [HttpPost]
        [RequestSizeLimit(40_000_000)] // 40MB
        public async Task<IActionResult> UploadImages(int hotelId, List<IFormFile> files)
        {
            if (files == null || files.Count == 0)
                return BadRequest("No files uploaded.");

            // Validate hotel exists
            var hotelExists = await _db.Hotels.AnyAsync(h => h.HotelID == hotelId);
            if (!hotelExists)
                return NotFound("Hotel not found.");

            var dir = GetDir(hotelId);
            Directory.CreateDirectory(dir);

            // Get current max sort order
            int maxSort = await _db.HotelImages
                .Where(i => i.HotelID == hotelId)
                .MaxAsync(i => (int?)i.SortOrder) ?? 0;

            var saved = new List<object>();

            foreach (var file in files)
            {
                if (file.Length <= 0) continue;

                // Validate file type
                if (!file.ContentType.StartsWith("image/"))
                    return BadRequest("Invalid image type.");

                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                var name = $"{Guid.NewGuid():N}{ext}";
                var full = Path.Combine(dir, name);

                // Save file
                using (var fs = System.IO.File.Create(full))
                    await file.CopyToAsync(fs);

                var relPath = "/uploads/hotels/" + hotelId + "/" + name;

                var item = new HotelImage
                {
                    HotelID = hotelId,
                    ImageUrl = WebPath(relPath),
                    IsPrimary = false,
                    IsDeleted = false,
                    SortOrder = ++maxSort
                };

                _db.HotelImages.Add(item);
                saved.Add(new
                {
                    item.HotelImageID,
                    item.ImageUrl,
                    item.IsPrimary,
                    item.SortOrder
                });
            }

            await _db.SaveChangesAsync();
            return Ok(saved);
        }

        // ===================== DELETE IMAGE =====================
        [HttpDelete("{imageId:int}")]
        public async Task<IActionResult> DeleteImage(int hotelId, int imageId)
        {
            var item = await _db.HotelImages
                .FirstOrDefaultAsync(i => i.HotelImageID == imageId && i.HotelID == hotelId);

            if (item == null)
                return NotFound("Image not found.");

            item.IsDeleted = true;

            // Delete actual file
            try
            {
                var fullPath = Path.Combine(_env.WebRootPath, item.ImageUrl.TrimStart('/'));
                if (System.IO.File.Exists(fullPath))
                    System.IO.File.Delete(fullPath);
            }
            catch { /* ignore */ }

            await _db.SaveChangesAsync();
            return Ok(new { message = "Deleted" });
        }

        // ===================== SET PRIMARY IMAGE =====================
        [HttpPatch("{imageId:int}/primary")]
        public async Task<IActionResult> SetPrimary(int hotelId, int imageId)
        {
            var items = await _db.HotelImages
                .Where(i => i.HotelID == hotelId && !i.IsDeleted)
                .ToListAsync();

            if (!items.Any()) return NotFound("No images.");

            foreach (var i in items)
                i.IsPrimary = (i.HotelImageID == imageId);

            await _db.SaveChangesAsync();
            return Ok(new { message = "Primary updated" });
        }

        // ===================== REORDER IMAGES =====================
        public class ReorderDto
        {
            public int[] Order { get; set; } = Array.Empty<int>();
        }

        [HttpPatch("reorder")]
        public async Task<IActionResult> Reorder(int hotelId, [FromBody] ReorderDto dto)
        {
            if (dto.Order == null || dto.Order.Length == 0)
                return BadRequest("Invalid order list.");

            var items = await _db.HotelImages
                .Where(i => i.HotelID == hotelId && !i.IsDeleted)
                .ToListAsync();

            int sort = 1;
            foreach (var id in dto.Order)
            {
                var img = items.FirstOrDefault(i => i.HotelImageID == id);
                if (img != null)
                    img.SortOrder = sort++;
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "Reordered" });
        }
    }
}

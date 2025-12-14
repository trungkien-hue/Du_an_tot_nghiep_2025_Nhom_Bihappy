using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers
{
    [ApiController]
    [Route("api/roomtypes/{roomTypeId:int}/images")]
    public class RoomTypeImagesController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;

        public RoomTypeImagesController(AppDbContext db, IWebHostEnvironment env)
        {
            _db = db;
            _env = env;
        }

        private static string WebPath(string p) => p.Replace("\\", "/");

        private string GetDir(int id) =>
            Path.Combine(_env.WebRootPath, "uploads", "roomtypes", id.ToString());


        // ======================================================
        // GET ALL IMAGES
        // ======================================================
        [HttpGet]
        public async Task<IActionResult> GetImages(int roomTypeId)
        {
            bool exists = await _db.RoomTypes.AnyAsync(r => r.RoomTypeID == roomTypeId);
            if (!exists)
                return NotFound("RoomType not found");

            var list = await _db.RoomTypeImages
                .Where(i => i.RoomTypeID == roomTypeId && !i.IsDeleted)
                .OrderBy(i => i.SortOrder)
                .Select(i => new
                {
                    i.RoomTypeImageID,
                    i.ImageUrl,
                    i.SortOrder,
                    i.IsPrimary
                })
                .ToListAsync();

            return Ok(list);
        }


        // ======================================================
        // UPLOAD
        // ======================================================
        [HttpPost]
        [RequestSizeLimit(40_000_000)]
        public async Task<IActionResult> Upload(int roomTypeId, List<IFormFile> files)
        {
            if (files == null || files.Count == 0)
                return BadRequest("No files uploaded");

            if (!await _db.RoomTypes.AnyAsync(r => r.RoomTypeID == roomTypeId))
                return NotFound("RoomType not found");

            var dir = GetDir(roomTypeId);
            Directory.CreateDirectory(dir);

            int maxSort = await _db.RoomTypeImages
                .Where(i => i.RoomTypeID == roomTypeId)
                .MaxAsync(i => (int?)i.SortOrder) ?? 0;

            var saved = new List<object>();

            foreach (var f in files)
            {
                if (!f.ContentType.StartsWith("image/"))
                    return BadRequest("Invalid image file");

                var ext = Path.GetExtension(f.FileName);
                var name = $"{Guid.NewGuid():N}{ext}";
                var full = Path.Combine(dir, name);

                using (var fs = System.IO.File.Create(full))
                    await f.CopyToAsync(fs);

                var rel = "/uploads/roomtypes/" + roomTypeId + "/" + name;

                var img = new RoomTypeImage
                {
                    RoomTypeID = roomTypeId,
                    ImageUrl = WebPath(rel),
                    SortOrder = ++maxSort,
                    IsPrimary = false,
                    IsDeleted = false
                };

                _db.RoomTypeImages.Add(img);

                saved.Add(new
                {
                    img.RoomTypeImageID,
                    img.ImageUrl,
                    img.SortOrder,
                    img.IsPrimary
                });
            }

            await _db.SaveChangesAsync();
            return Ok(saved);
        }


        // ======================================================
        // DELETE
        // ======================================================
        [HttpDelete("{imageId:int}")]
        public async Task<IActionResult> Delete(int roomTypeId, int imageId)
        {
            var img = await _db.RoomTypeImages
                .FirstOrDefaultAsync(i => i.RoomTypeImageID == imageId && i.RoomTypeID == roomTypeId);

            if (img == null)
                return NotFound("Image not found");

            img.IsDeleted = true;

            try
            {
                var full = Path.Combine(_env.WebRootPath, img.ImageUrl.TrimStart('/'));
                if (System.IO.File.Exists(full))
                    System.IO.File.Delete(full);
            }
            catch { }

            await _db.SaveChangesAsync();
            return Ok(new { message = "Deleted" });
        }


        // ======================================================
        // SET PRIMARY
        // ======================================================
        [HttpPatch("{imageId:int}/primary")]
        public async Task<IActionResult> SetPrimary(int roomTypeId, int imageId)
        {
            var imgs = await _db.RoomTypeImages
                .Where(i => i.RoomTypeID == roomTypeId && !i.IsDeleted)
                .ToListAsync();

            if (!imgs.Any())
                return NotFound("No images");

            foreach (var img in imgs)
                img.IsPrimary = img.RoomTypeImageID == imageId;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Primary updated" });
        }


        // ======================================================
        // REORDER
        // ======================================================
        public class ReorderDto
        {
            public int[] Order { get; set; } = Array.Empty<int>();
        }

        [HttpPatch("reorder")]
        public async Task<IActionResult> Reorder(int roomTypeId, ReorderDto dto)
        {
            if (dto.Order == null || dto.Order.Length == 0)
                return BadRequest("Order list empty");

            var imgs = await _db.RoomTypeImages
                .Where(i => i.RoomTypeID == roomTypeId && !i.IsDeleted)
                .ToListAsync();

            int sort = 1;
            foreach (var id in dto.Order)
            {
                var item = imgs.FirstOrDefault(i => i.RoomTypeImageID == id);
                if (item != null)
                    item.SortOrder = sort++;
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "Reordered" });
        }
    }
}

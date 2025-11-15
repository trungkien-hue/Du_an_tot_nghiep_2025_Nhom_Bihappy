using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers.Admin;

[ApiController]
[Route("api/admin/tours")]
public class AdminToursController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminToursController(AppDbContext db) => _db = db;

    // ===== Helpers =====
    private static string? NormalizeImageUrl(string? u)
    {
        if (string.IsNullOrWhiteSpace(u)) return null;
        var url = u.Trim().Replace("\\", "/");
        if (url.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
            url = url.Substring(4);
        if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase) &&
            !url.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            if (!url.StartsWith("/")) url = "/" + url;
        }
        return url;
    }

    // GET /api/admin/tours?keyword=
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? keyword)
    {
        var q = _db.Tours.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(x => x.Name.Contains(keyword) || (x.Description ?? string.Empty).Contains(keyword));
        var list = await q.OrderByDescending(x => x.TourID).ToListAsync();
        return Ok(list);
    }

    // GET /api/admin/tours/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var t = await _db.Tours.FirstOrDefaultAsync(x => x.TourID == id);
        return t == null ? NotFound() : Ok(t);
    }

    // ===== DTO đã ĐỒNG BỘ với VirtualTravel.Models.Tour =====
    public class AdminTourDto
    {
        [Required] public string Name { get; set; } = "";
        [Required] public string Location { get; set; } = "";
        public string? StartLocation { get; set; }
        public string? EndLocation { get; set; }
        public string? Description { get; set; }
        public string? Itinerary { get; set; }
        public string? Includes { get; set; }
        public string? Excludes { get; set; }
        public string? Notes { get; set; }
        public string? Highlights { get; set; }
        public string? Category { get; set; }

        public int? DurationDays { get; set; }
        public int? MaxGroupSize { get; set; }
        public string? TransportType { get; set; }
        public bool? GuideIncluded { get; set; }

        public decimal Price { get; set; }
        public decimal? PriceAdult { get; set; }
        public decimal? PriceChild { get; set; }
        public string? Currency { get; set; }
        public string? CancellationPolicy { get; set; }
        public decimal? DepositPercent { get; set; }

        public double Rating { get; set; }
        public string? ImageURL { get; set; }
    }

    // POST /api/admin/tours
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AdminTourDto dto)
    {
        var t = new Tour
        {
            Name = dto.Name,
            Location = dto.Location,

            StartLocation = dto.StartLocation ?? "",
            EndLocation = dto.EndLocation ?? "",
            Description = dto.Description ?? "",
            Itinerary = dto.Itinerary ?? "",
            Includes = dto.Includes ?? "",
            Excludes = dto.Excludes ?? "",
            Notes = dto.Notes ?? "",
            Highlights = dto.Highlights ?? "",
            Category = dto.Category ?? "",

            DurationDays = dto.DurationDays ?? 0,
            MaxGroupSize = dto.MaxGroupSize ?? 0,
            TransportType = dto.TransportType ?? "",
            GuideIncluded = dto.GuideIncluded ?? false,

            Price = dto.Price,
            PriceAdult = dto.PriceAdult,
            PriceChild = dto.PriceChild,
            Currency = dto.Currency ?? "VND",
            CancellationPolicy = dto.CancellationPolicy ?? "",
            DepositPercent = dto.DepositPercent,

            Rating = dto.Rating,
            ImageURL = NormalizeImageUrl(dto.ImageURL) ?? ""
        };

        _db.Tours.Add(t);
        await _db.SaveChangesAsync();
        return Ok(t);
    }

    // PUT /api/admin/tours/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] AdminTourDto dto)
    {
        var t = await _db.Tours.FirstOrDefaultAsync(x => x.TourID == id);
        if (t == null) return NotFound();

        t.Name = dto.Name;
        t.Location = dto.Location;

        t.StartLocation = dto.StartLocation ?? "";
        t.EndLocation = dto.EndLocation ?? "";
        t.Description = dto.Description ?? "";
        t.Itinerary = dto.Itinerary ?? "";
        t.Includes = dto.Includes ?? "";
        t.Excludes = dto.Excludes ?? "";
        t.Notes = dto.Notes ?? "";
        t.Highlights = dto.Highlights ?? "";
        t.Category = dto.Category ?? "";

        t.DurationDays = dto.DurationDays ?? 0;
        t.MaxGroupSize = dto.MaxGroupSize ?? 0;
        t.TransportType = dto.TransportType ?? "";
        t.GuideIncluded = dto.GuideIncluded ?? false;

        t.Price = dto.Price;
        t.PriceAdult = dto.PriceAdult;
        t.PriceChild = dto.PriceChild;
        t.Currency = dto.Currency ?? "VND";
        t.CancellationPolicy = dto.CancellationPolicy ?? "";
        t.DepositPercent = dto.DepositPercent;

        t.Rating = dto.Rating;
        t.ImageURL = NormalizeImageUrl(dto.ImageURL) ?? "";

        await _db.SaveChangesAsync();
        return Ok(t);
    }

    // DELETE (SOFT) /api/admin/tours/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var t = await _db.Tours.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.TourID == id);
        if (t == null) return NotFound();

        t.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // RESTORE /api/admin/tours/{id}/restore
    [HttpPost("{id:int}/restore")]
    public async Task<IActionResult> Restore(int id)
    {
        var t = await _db.Tours.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.TourID == id);
        if (t == null) return NotFound();
        t.IsDeleted = false;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Khôi phục tour thành công" });
    }

    // GET DELETED /api/admin/tours/deleted
    [HttpGet("deleted")]
    public async Task<IActionResult> GetDeleted([FromQuery] string? keyword)
    {
        var q = _db.Tours.IgnoreQueryFilters().Where(x => x.IsDeleted).AsNoTracking();
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(x => x.Name.Contains(keyword));
        var items = await q.OrderByDescending(x => x.TourID).ToListAsync();
        return Ok(items);
    }

    // ===== Upload ảnh (multipart/form-data) =====
    [HttpPost("upload")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> UploadImage([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Chưa chọn file ảnh.");

        var folder = Path.Combine("wwwroot", "uploads", "tours");
        if (!Directory.Exists(folder))
            Directory.CreateDirectory(folder);

        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(folder, fileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var url = $"/uploads/tours/{fileName}";
        return Ok(new { url });
    }
}

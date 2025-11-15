// /Controllers/Admin/AdminHotelsController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers.Admin;

[ApiController]
[Route("api/admin/hotels")]
public class AdminHotelsController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminHotelsController(AppDbContext db) => _db = db;

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

    // ======================== HOTEL ========================

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? keyword, [FromQuery] string? location)
    {
        var q = _db.Hotels.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(x => x.Name.Contains(keyword) || (x.Description ?? string.Empty).Contains(keyword));
        if (!string.IsNullOrWhiteSpace(location))
            q = q.Where(x => x.Location.Contains(location));

        var list = await q.OrderByDescending(x => x.HotelID)
            .Select(x => new
            {
                x.HotelID,
                x.Name,
                x.Location,
                x.Description,
                x.PricePerNight,
                x.Rating,
                x.ImageURL,
                x.IsDeleted
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var h = await _db.Hotels.AsNoTracking()
            .Where(x => x.HotelID == id)
            .Select(x => new
            {
                x.HotelID,
                x.Name,
                x.Location,
                x.Description,
                x.PricePerNight,
                x.Rating,
                x.ImageURL,
                x.IsDeleted
            })
            .FirstOrDefaultAsync();

        return h == null ? NotFound() : Ok(h);
    }

    // ======================== DTOs HOTEL ========================

    public class AdminHotelDto
    {
        [Required] public string Name { get; set; } = "";
        [Required] public string Location { get; set; } = "";
        public string? Description { get; set; }
        public decimal PricePerNight { get; set; }
        public float Rating { get; set; }
        public string? ImageURL { get; set; }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AdminHotelDto dto)
    {
        var h = new Hotel
        {
            Name = dto.Name,
            Location = dto.Location,
            Description = dto.Description ?? "",
            PricePerNight = dto.PricePerNight,
            Rating = dto.Rating,
            ImageURL = NormalizeImageUrl(dto.ImageURL)
        };
        _db.Hotels.Add(h);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            h.HotelID,
            h.Name,
            h.Location,
            h.Description,
            h.PricePerNight,
            h.Rating,
            h.ImageURL
        });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] AdminHotelDto dto)
    {
        var h = await _db.Hotels.FirstOrDefaultAsync(x => x.HotelID == id);
        if (h == null) return NotFound();

        h.Name = dto.Name;
        h.Location = dto.Location;
        h.Description = dto.Description ?? "";
        h.PricePerNight = dto.PricePerNight;
        h.Rating = dto.Rating;
        h.ImageURL = NormalizeImageUrl(dto.ImageURL);

        await _db.SaveChangesAsync();

        return Ok(new
        {
            h.HotelID,
            h.Name,
            h.Location,
            h.Description,
            h.PricePerNight,
            h.Rating,
            h.ImageURL
        });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var h = await _db.Hotels.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.HotelID == id);
        if (h == null) return NotFound();

        h.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/restore")]
    public async Task<IActionResult> Restore(int id)
    {
        var h = await _db.Hotels.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.HotelID == id);
        if (h == null) return NotFound();

        h.IsDeleted = false;
        await _db.SaveChangesAsync();
        return Ok(new { message = "Khôi phục khách sạn thành công" });
    }

    [HttpGet("deleted")]
    public async Task<IActionResult> GetDeleted([FromQuery] string? keyword)
    {
        var q = _db.Hotels.IgnoreQueryFilters().Where(x => x.IsDeleted).AsNoTracking();
        if (!string.IsNullOrWhiteSpace(keyword))
            q = q.Where(x => x.Name.Contains(keyword));

        var items = await q.OrderByDescending(x => x.HotelID)
            .Select(x => new
            {
                x.HotelID,
                x.Name,
                x.Location,
                x.Description,
                x.PricePerNight,
                x.Rating,
                x.ImageURL,
                x.IsDeleted
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpPost("upload")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> UploadImage([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Chưa chọn file ảnh.");

        var folder = Path.Combine("wwwroot", "uploads", "hotels");
        if (!Directory.Exists(folder))
            Directory.CreateDirectory(folder);

        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(folder, fileName);
        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var url = $"/uploads/hotels/{fileName}";
        return Ok(new { url });
    }

    // ================== ROOM TYPES (DTO) ==================

    public class AdminRoomTypeDto
    {
        public int RoomTypeID { get; set; }
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public int Capacity { get; set; }
    }

    public class AdminRoomTypeCreateUpdateDto
    {
        [Required] public string Name { get; set; } = "";
        public string? Description { get; set; }
        [Range(0, int.MaxValue)] public int Capacity { get; set; }
    }

    [HttpGet("{hotelId:int}/roomtypes")]
    public async Task<IActionResult> GetRoomTypes(int hotelId)
    {
        var exists = await _db.Hotels.AnyAsync(h => h.HotelID == hotelId);
        if (!exists) return NotFound();

        var list = await _db.RoomTypes
            .Where(rt => rt.HotelID == hotelId)
            .OrderBy(rt => rt.RoomTypeID)
            .Select(rt => new AdminRoomTypeDto
            {
                RoomTypeID = rt.RoomTypeID,
                Name = rt.Name,
                Description = rt.Description,
                Capacity = rt.Capacity
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost("{hotelId:int}/roomtypes")]
    public async Task<IActionResult> CreateRoomType(int hotelId, [FromBody] AdminRoomTypeCreateUpdateDto dto)
    {
        var hotel = await _db.Hotels.FindAsync(hotelId);
        if (hotel == null) return NotFound("Hotel not found");

        var rt = new RoomType
        {
            HotelID = hotelId,
            Name = dto.Name,
            Description = dto.Description,
            Capacity = dto.Capacity
        };

        _db.RoomTypes.Add(rt);
        await _db.SaveChangesAsync();

        return Ok(new AdminRoomTypeDto
        {
            RoomTypeID = rt.RoomTypeID,
            Name = rt.Name,
            Description = rt.Description,
            Capacity = rt.Capacity
        });
    }

    [HttpPut("{hotelId:int}/roomtypes/{roomTypeId:int}")]
    public async Task<IActionResult> UpdateRoomType(int hotelId, int roomTypeId, [FromBody] AdminRoomTypeCreateUpdateDto dto)
    {
        var rt = await _db.RoomTypes.FirstOrDefaultAsync(x => x.RoomTypeID == roomTypeId && x.HotelID == hotelId);
        if (rt == null) return NotFound();

        rt.Name = dto.Name;
        rt.Description = dto.Description;
        rt.Capacity = dto.Capacity;

        await _db.SaveChangesAsync();

        return Ok(new AdminRoomTypeDto
        {
            RoomTypeID = rt.RoomTypeID,
            Name = rt.Name,
            Description = rt.Description,
            Capacity = rt.Capacity
        });
    }

    [HttpDelete("{hotelId:int}/roomtypes/{roomTypeId:int}")]
    public async Task<IActionResult> DeleteRoomType(int hotelId, int roomTypeId)
    {
        var rt = await _db.RoomTypes.FirstOrDefaultAsync(x => x.RoomTypeID == roomTypeId && x.HotelID == hotelId);
        if (rt == null) return NotFound();

        _db.RoomTypes.Remove(rt);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // ================== HOTEL AVAILABILITIES (DAILY) ==================

    public class AdminAvailabilityDto
    {
        public int HotelAvailabilityID { get; set; }
        public DateTime Date { get; set; }
        public int AvailableRooms { get; set; }
        public decimal Price { get; set; }
    }

    public class AdminAvailabilityCreateUpdateDto
    {
        [Required] public DateTime Date { get; set; } // lấy .Date
        [Range(0, int.MaxValue)] public int AvailableRooms { get; set; }
        [Range(0, double.MaxValue)] public decimal Price { get; set; }
    }

    [HttpGet("{hotelId:int}/roomtypes/{roomTypeId:int}/availabilities")]
    public async Task<IActionResult> GetAvailabilities(int hotelId, int roomTypeId)
    {
        var list = await _db.HotelAvailabilities
            .Where(a => a.HotelID == hotelId && a.RoomTypeID == roomTypeId && !a.IsDeleted)
            .OrderBy(a => a.Date)
            .Select(a => new AdminAvailabilityDto
            {
                HotelAvailabilityID = a.HotelAvailabilityID,
                Date = a.Date,
                AvailableRooms = a.AvailableRooms,
                Price = a.Price
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpPost("{hotelId:int}/roomtypes/{roomTypeId:int}/availabilities")]
    public async Task<IActionResult> CreateAvailability(int hotelId, int roomTypeId, [FromBody] AdminAvailabilityCreateUpdateDto dto)
    {
        var d = dto.Date.Date;
        var exists = await _db.HotelAvailabilities
            .AnyAsync(a => a.HotelID == hotelId && a.RoomTypeID == roomTypeId && a.Date == d && !a.IsDeleted);

        if (exists) return Conflict("Đã có tồn kho cho ngày này.");

        var a = new HotelAvailability
        {
            HotelID = hotelId,
            RoomTypeID = roomTypeId,
            Date = d,
            AvailableRooms = dto.AvailableRooms,
            Price = dto.Price
        };

        _db.HotelAvailabilities.Add(a);
        await _db.SaveChangesAsync();

        return Ok(new AdminAvailabilityDto
        {
            HotelAvailabilityID = a.HotelAvailabilityID,
            Date = a.Date,
            AvailableRooms = a.AvailableRooms,
            Price = a.Price
        });
    }

    [HttpPut("{hotelId:int}/roomtypes/{roomTypeId:int}/availabilities/{id:int}")]
    public async Task<IActionResult> UpdateAvailability(int hotelId, int roomTypeId, int id, [FromBody] AdminAvailabilityCreateUpdateDto dto)
    {
        var a = await _db.HotelAvailabilities
            .FirstOrDefaultAsync(x => x.HotelAvailabilityID == id && x.HotelID == hotelId && x.RoomTypeID == roomTypeId);

        if (a == null) return NotFound();

        a.Date = dto.Date.Date;
        a.AvailableRooms = dto.AvailableRooms;
        a.Price = dto.Price;

        await _db.SaveChangesAsync();

        return Ok(new AdminAvailabilityDto
        {
            HotelAvailabilityID = a.HotelAvailabilityID,
            Date = a.Date,
            AvailableRooms = a.AvailableRooms,
            Price = a.Price
        });
    }

    [HttpDelete("{hotelId:int}/roomtypes/{roomTypeId:int}/availabilities/{id:int}")]
    public async Task<IActionResult> DeleteAvailability(int hotelId, int roomTypeId, int id)
    {
        var a = await _db.HotelAvailabilities
            .FirstOrDefaultAsync(x => x.HotelAvailabilityID == id && x.HotelID == hotelId && x.RoomTypeID == roomTypeId);

        if (a == null) return NotFound();

        a.IsDeleted = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

// /Controllers/HotelTourDetailController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HotelTourDetailController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public HotelTourDetailController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        private static string WebPath(string path) => path.Replace("\\", "/");

        public class HotelRoomTypeDetailDto
        {
            public int RoomTypeID { get; set; }
            public string? Name { get; set; }
            public string? Description { get; set; }
            public int Capacity { get; set; }
            public List<HotelAvailabilityDetailDto> Availabilities { get; set; } = new();
        }
        public class HotelAvailabilityDetailDto
        {
            public int HotelAvailabilityID { get; set; }
            public DateTime Date { get; set; }
            public int AvailableRooms { get; set; }
            public decimal Price { get; set; }
            public int RoomTypeID { get; set; }
        }
        public class HotelReviewDetailDto
        {
            public int ReviewID { get; set; }
            public string UserName { get; set; } = "Ẩn danh";
            public int Rating { get; set; }
            public string Comment { get; set; } = "";
            public DateTime CreatedAt { get; set; }
            public List<string> Images { get; set; } = new();
        }

        // GET: api/hoteltourdetail/hotel/5
        [HttpGet("hotel/{id:int}")]
        public async Task<ActionResult> GetHotelDetail(int id)
        {
            var hotel = await _context.Hotels
                .Include(h => h.RoomTypes).ThenInclude(rt => rt.HotelAvailabilities)
                .Include(h => h.Reviews).ThenInclude(r => r.User)
                .Include(h => h.Reviews).ThenInclude(r => r.Images)
                .Include(h => h.AvailableDates)
                .FirstOrDefaultAsync(h => h.HotelID == id);

            if (hotel == null)
                return NotFound(new { message = $"Không tìm thấy khách sạn có ID = {id}" });

            var dto = new
            {
                HotelID = hotel.HotelID,
                hotel.Name,
                hotel.Location,
                hotel.Description,
                PricePerNight = hotel.PricePerNight,
                Rating = hotel.Rating,
                ImageURL = hotel.ImageURL,
                RoomTypes = hotel.RoomTypes.Select(rt => new HotelRoomTypeDetailDto
                {
                    RoomTypeID = rt.RoomTypeID,
                    Name = rt.Name,
                    Description = rt.Description,
                    Capacity = rt.Capacity,
                    Availabilities = rt.HotelAvailabilities.Select(a => new HotelAvailabilityDetailDto
                    {
                        HotelAvailabilityID = a.HotelAvailabilityID,
                        Date = a.Date,
                        AvailableRooms = a.AvailableRooms,
                        Price = a.Price,
                        RoomTypeID = a.RoomTypeID
                    }).OrderBy(x => x.Date).ToList()
                }).ToList(),
                Reviews = hotel.Reviews
                    .OrderByDescending(r => r.CreatedAt)
                    .Select(r => new HotelReviewDetailDto
                    {
                        ReviewID = r.ReviewID,
                        UserName = r.User != null
                            ? r.User.FullName
                            : (string.IsNullOrWhiteSpace(r.ReviewerName) ? "Ẩn danh" : r.ReviewerName),
                        Comment = r.Comment,
                        CreatedAt = r.CreatedAt,
                        Rating = r.Rating,
                        Images = r.Images.Select(i => WebPath(i.ImageURL)).ToList()
                    }).ToList(),
                AvailableDates = hotel.AvailableDates.Select(a => new HotelAvailabilityDetailDto
                {
                    HotelAvailabilityID = a.HotelAvailabilityID,
                    Date = a.Date,
                    AvailableRooms = a.AvailableRooms,
                    Price = a.Price,
                    RoomTypeID = a.RoomTypeID
                }).OrderBy(x => x.Date).ToList()
            };

            var stats = await _context.Reviews
                .AsNoTracking()
                .Where(r => r.HotelID == id)
                .GroupBy(r => r.HotelID)
                .Select(g => new { Count = g.Count(), Avg = g.Average(x => (double)x.Rating) })
                .FirstOrDefaultAsync();

            var avgRating = stats == null ? 0.0 : Math.Round(stats.Avg, 1);
            var reviewCount = stats?.Count ?? 0;

            return Ok(new
            {
                dto.HotelID,
                dto.Name,
                dto.Location,
                dto.Description,
                dto.PricePerNight,
                Rating = avgRating,
                ReviewCount = reviewCount,
                dto.ImageURL,
                dto.RoomTypes,
                dto.Reviews,
                dto.AvailableDates
            });
        }

        // Giữ nguyên phần Reviews / CreateReview như cũ…
        // (không phụ thuộc availability range)
        // ===== GET REVIEWS =====
        [HttpGet("reviews/{hotelId:int}")]
        public async Task<ActionResult<IEnumerable<HotelReviewDetailDto>>> GetReviews(int hotelId)
        {
            var reviews = await _context.Reviews
                .Include(r => r.User)
                .Include(r => r.Images)
                .Where(r => r.HotelID == hotelId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new HotelReviewDetailDto
                {
                    ReviewID = r.ReviewID,
                    UserName = r.User != null
                        ? r.User.FullName
                        : (string.IsNullOrWhiteSpace(r.ReviewerName) ? "Ẩn danh" : r.ReviewerName),
                    Comment = r.Comment,
                    CreatedAt = r.CreatedAt,
                    Rating = r.Rating,
                    Images = r.Images.Select(i => WebPath(i.ImageURL)).ToList()
                })
                .ToListAsync();

            return Ok(reviews);
        }

        public class CreateReviewForm
        {
            public int HotelId { get; set; }
            public string? UserName { get; set; }
            public int Rating { get; set; } = 5;
            public string Comment { get; set; } = "";
            public IFormFileCollection? Images { get; set; }
        }

        [HttpPost("reviews")]
        [RequestSizeLimit(30_000_000)]
        public async Task<ActionResult<HotelReviewDetailDto>> CreateReview([FromForm] CreateReviewForm form)
        {
            if (form.Rating < 1 || form.Rating > 5)
                return BadRequest("Rating phải từ 1 đến 5.");
            if (string.IsNullOrWhiteSpace(form.Comment))
                return BadRequest("Comment không được trống.");

            var hotel = await _context.Hotels.AsNoTracking()
                .FirstOrDefaultAsync(h => h.HotelID == form.HotelId);
            if (hotel == null) return NotFound($"Không tìm thấy khách sạn {form.HotelId}");

            int? userId = null;
            if (User?.Identity?.IsAuthenticated == true)
            {
                var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)
                            ?? User.FindFirst("UserID")
                            ?? User.FindFirst("sub")
                            ?? User.FindFirst("userId");

                if (idClaim != null && int.TryParse(idClaim.Value, out var parsed))
                {
                    bool exists = await _context.Users.AnyAsync(u => u.UserID == parsed);
                    if (exists) userId = parsed;
                }
            }

            var ent = new Review
            {
                HotelID = form.HotelId,
                UserID = userId,
                ReviewerName = string.IsNullOrWhiteSpace(form.UserName) ? null : form.UserName.Trim(),
                Comment = form.Comment.Trim(),
                Rating = form.Rating,
                CreatedAt = DateTime.UtcNow
            };
            _context.Reviews.Add(ent);
            await _context.SaveChangesAsync();

            var saved = new List<string>();
            if (form.Images != null && form.Images.Count > 0)
            {
                var now = DateTime.UtcNow;
                var subDir = Path.Combine("uploads", "reviews", now.ToString("yyyy"), now.ToString("MM"));
                var root = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), subDir);
                Directory.CreateDirectory(root);

                foreach (var f in form.Images)
                {
                    if (f.Length <= 0) continue;
                    var ext = Path.GetExtension(f.FileName).ToLowerInvariant();
                    var name = $"{Guid.NewGuid():N}{ext}";
                    var full = Path.Combine(root, name);
                    using (var fs = System.IO.File.Create(full))
                        await f.CopyToAsync(fs);
                    var url = "/" + WebPath(Path.Combine(subDir, name));
                    _context.ReviewImages.Add(new ReviewImage { ReviewID = ent.ReviewID, ImageURL = url });
                    saved.Add(url);
                }
                await _context.SaveChangesAsync();
            }

            var dto = new HotelReviewDetailDto
            {
                ReviewID = ent.ReviewID,
                UserName = userId.HasValue
                    ? (await _context.Users.Where(u => u.UserID == userId.Value)
                        .Select(u => u.FullName).FirstOrDefaultAsync()) ?? "Ẩn danh"
                    : (string.IsNullOrWhiteSpace(ent.ReviewerName) ? "Ẩn danh" : ent.ReviewerName!),
                Comment = ent.Comment,
                CreatedAt = ent.CreatedAt,
                Rating = ent.Rating,
                Images = saved
            };

            return Ok(dto);
        }
    }
}

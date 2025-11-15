using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers
{
    [ApiController]
    [Route("api/tour")]
    public class TourDetailController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IWebHostEnvironment _env;
        public TourDetailController(AppDbContext db, IWebHostEnvironment env) { _db = db; _env = env; }

        private static string WebPath(string p) => p.Replace("\\", "/");

        public class TourReviewDetailDto
        {
            public int ReviewID { get; set; }
            public string UserName { get; set; } = "Ẩn danh";
            public int Rating { get; set; }
            public string Comment { get; set; } = "";
            public DateTime CreatedAt { get; set; }
            public List<string> Images { get; set; } = new();
        }

        public class CreateTourReviewForm
        {
            public int TourId { get; set; }
            public string? UserName { get; set; }
            public int Rating { get; set; } = 5;
            public string Comment { get; set; } = "";
            public IFormFileCollection? Images { get; set; }
        }

        // ============ GET LIST (ngắn gọn) ============
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var q = _db.Tours.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(search))
            {
                var k = search.Trim();
                q = q.Where(t => t.Name.Contains(k) || t.Location.Contains(k) || t.Category.Contains(k));
            }
            var total = await q.CountAsync();

            var items = await q
                .OrderByDescending(t => t.Rating)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    t.TourID,
                    t.Name,
                    t.Location,
                    t.Category,
                    t.Price,
                    t.PriceAdult,
                    t.PriceChild,
                    t.DurationDays,
                    t.ImageURL,
                    t.Rating
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, items });
        }

        // ============ GET DETAIL ============
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById([FromRoute] int id)
        {
            var t = await _db.Tours.AsNoTracking().FirstOrDefaultAsync(x => x.TourID == id);
            if (t == null) return NotFound(new { message = $"Không tìm thấy tour #{id}" });

            var stats = await _db.Reviews
                .AsNoTracking()
                .Where(r => r.TourID == id)
                .GroupBy(r => r.TourID)
                .Select(g => new { Count = g.Count(), Avg = g.Average(x => (double)x.Rating) })
                .FirstOrDefaultAsync();

            var avgRating = stats == null ? 0.0 : Math.Round(stats.Avg, 1);
            var reviewCount = stats?.Count ?? 0;

            return Ok(new
            {
                t.TourID,
                t.Name,
                t.Location,
                t.StartLocation,
                t.EndLocation,
                t.Description,
                t.Itinerary,
                t.Includes,
                t.Excludes,
                t.Notes,
                t.Highlights,
                t.Category,
                t.DurationDays,
                t.MaxGroupSize,
                t.TransportType,
                t.GuideIncluded,
                t.Price,
                t.PriceAdult,
                t.PriceChild,
                t.Currency,
                t.CancellationPolicy,
                t.DepositPercent,
                ImageURL = t.ImageURL,
                Rating = avgRating,
                ReviewCount = reviewCount
            });
        }

        // ============ GET REVIEWS ============
        [HttpGet("{id:int}/reviews")]
        public async Task<IActionResult> GetTourReviews([FromRoute] int id)
        {
            var exists = await _db.Tours.AsNoTracking().AnyAsync(x => x.TourID == id);
            if (!exists) return NotFound(new { message = $"Không tìm thấy tour #{id}" });

            var reviews = await _db.Reviews
                .Include(r => r.User)
                .Include(r => r.Images)
                .Where(r => r.TourID == id)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new TourReviewDetailDto
                {
                    ReviewID = r.ReviewID,
                    UserName = r.User != null
                        ? r.User.FullName
                        : (string.IsNullOrWhiteSpace(r.ReviewerName) ? "Ẩn danh" : r.ReviewerName),
                    Rating = r.Rating,
                    Comment = r.Comment,
                    CreatedAt = r.CreatedAt,
                    Images = r.Images.Select(i => WebPath(i.ImageURL)).ToList()
                })
                .ToListAsync();

            return Ok(reviews);
        }

        // ============ CREATE REVIEW (multipart/form-data) ============
        [HttpPost("reviews")]
        [RequestSizeLimit(30_000_000)]
        public async Task<IActionResult> CreateTourReview([FromForm] CreateTourReviewForm form)
        {
            if (form.Rating < 1 || form.Rating > 5)
                return BadRequest("Rating phải từ 1 đến 5.");
            if (string.IsNullOrWhiteSpace(form.Comment))
                return BadRequest("Comment không được trống.");

            var tour = await _db.Tours.FirstOrDefaultAsync(t => t.TourID == form.TourId);
            if (tour == null) return NotFound($"Không tìm thấy tour {form.TourId}");

            int? userId = null;
            if (User?.Identity?.IsAuthenticated == true)
            {
                var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)
                            ?? User.FindFirst("UserID")
                            ?? User.FindFirst("sub")
                            ?? User.FindFirst("userId");

                if (idClaim != null && int.TryParse(idClaim.Value, out var parsed))
                {
                    bool exists = await _db.Users.AnyAsync(u => u.UserID == parsed);
                    if (exists) userId = parsed;
                }
            }

            var ent = new Review
            {
                TourID = form.TourId,
                UserID = userId,
                ReviewerName = string.IsNullOrWhiteSpace(form.UserName) ? null : form.UserName.Trim(),
                Comment = form.Comment.Trim(),
                Rating = form.Rating,
                CreatedAt = DateTime.UtcNow
            };
            _db.Reviews.Add(ent);
            await _db.SaveChangesAsync();

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
                    _db.ReviewImages.Add(new ReviewImage { ReviewID = ent.ReviewID, ImageURL = url });
                    saved.Add(url);
                }
                await _db.SaveChangesAsync();
            }

            // (tuỳ chọn) cập nhật rating trung bình vào bảng Tour
            var stats = await _db.Reviews
                .Where(r => r.TourID == form.TourId)
                .GroupBy(r => r.TourID)
                .Select(g => new { Avg = g.Average(x => (double)x.Rating) })
                .FirstOrDefaultAsync();

            if (stats != null)
            {
                tour.Rating = (double)Math.Round(stats.Avg, 1);
                await _db.SaveChangesAsync();
            }

            var created = new TourReviewDetailDto
            {
                ReviewID = ent.ReviewID,
                UserName = userId.HasValue
                    ? (await _db.Users.Where(u => u.UserID == userId.Value).Select(u => u.FullName).FirstOrDefaultAsync()) ?? "Ẩn danh"
                    : (string.IsNullOrWhiteSpace(ent.ReviewerName) ? "Ẩn danh" : ent.ReviewerName!),
                Comment = ent.Comment,
                Rating = ent.Rating,
                CreatedAt = ent.CreatedAt,
                Images = saved
            };

            return Ok(created);
        }
    }
}

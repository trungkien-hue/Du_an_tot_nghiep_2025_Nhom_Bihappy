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

        private static string WebPath(string path) =>
            path.Replace("\\", "/");

        // ====================== DTOs ======================
        public class HotelRoomTypeDetailDto
        {
            public int RoomTypeID { get; set; }
            public string? Name { get; set; }
            public string? Description { get; set; }
            public int Capacity { get; set; }

            public decimal? BasePrice { get; set; }
            public decimal? DailyPrice { get; set; }
            public decimal? FinalPrice { get; set; }
            public string? Voucher { get; set; }

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

        // ============================================================
        // 1) BASIC INFO
        // ============================================================
        [HttpGet("basic/{id:int}")]
        public async Task<ActionResult> GetHotelBasic(int id)
        {
            var hotel = await _context.Hotels
                .AsNoTracking()
                .Where(h => h.HotelID == id && !h.IsDeleted)
                .Select(h => new
                {
                    h.HotelID,
                    h.Name,
                    h.Location,
                    h.Description,
                    h.ImageURL,
                    h.PricePerNight,
                    h.Rating,
                    ReviewCount = h.Reviews.Count()
                })
                .FirstOrDefaultAsync();

            if (hotel == null)
                return NotFound(new { message = $"Không tìm thấy khách sạn có ID = {id}" });

            return Ok(hotel);
        }

        // ============================================================
        // 2) GALLERY
        // ============================================================
        [HttpGet("gallery/{hotelId:int}")]
        public async Task<ActionResult> GetGallery(int hotelId)
        {
            var images = await _context.HotelImages
                .AsNoTracking()
                .Where(img => img.HotelID == hotelId && !img.IsDeleted)
                .OrderBy(img => img.SortOrder)
                .Select(img => new
                {
                    img.HotelImageID,
                    ImageUrl = WebPath(img.ImageUrl),
                    img.Caption,
                    img.Tag,
                    img.SortOrder,
                    img.IsPrimary
                })
                .ToListAsync();

            return Ok(images);
        }

        // ============================================================
        // 3) ROOMTYPES — BasePrice + DailyPrice + FinalPrice + Voucher
        // ============================================================
        [HttpGet("roomtypes/{hotelId:int}")]
        public async Task<ActionResult> GetRoomTypes(int hotelId)
        {
            var today = DateTime.Today;

            // Load tất cả voucher thuộc khách sạn
            var vouchers = await _context.RoomTypeVouchers
                .AsNoTracking()
                .Where(v => v.HotelID == hotelId && v.IsActive && !v.IsDeleted)
                .ToListAsync();

            // Load Room Types
            var rtRaw = await _context.RoomTypes
                .AsNoTracking()
                .Where(rt => rt.HotelID == hotelId)
                .Select(rt => new
                {
                    rt.RoomTypeID,
                    rt.Name,
                    rt.Description,
                    rt.Capacity,

                    // BasePrice từ RatePlan (nullable)
                    BasePrice = _context.RatePlans
                        .Where(rp => rp.RoomTypeID == rt.RoomTypeID && rp.IsActive)
                        .Select(rp => (decimal?)rp.BasePrice)
                        .FirstOrDefault(),

                    // Giá gần nhất theo ngày (DailyPrice, nullable)
                    DailyPrice = rt.HotelAvailabilities!
                        .Where(av => !av.IsDeleted)
                        .OrderBy(av => Math.Abs(EF.Functions.DateDiffDay(av.Date, today)))
                        .Select(av => (decimal?)av.Price)
                        .FirstOrDefault(),

                    Images = rt.Images
                        .Where(img => !img.IsDeleted)
                        .OrderByDescending(img => img.IsPrimary)
                        .ThenBy(img => img.SortOrder)
                        .Select(img => new
                        {
                            img.RoomTypeImageID,
                            ImageUrl = WebPath(img.ImageUrl),
                            img.IsPrimary,
                            img.SortOrder
                        })
                        .ToList()
                })
                .ToListAsync();

            var result = new List<object>();

            foreach (var rt in rtRaw)
            {
                // OPTION 1: DailyPrice ưu tiên hơn BasePrice
                decimal basePrice = rt.BasePrice ?? 0m;
                decimal price = rt.DailyPrice ?? basePrice;

                // Áp dụng voucher nếu có
                var v = vouchers.FirstOrDefault(x => x.RoomTypeID == rt.RoomTypeID);

                decimal finalPrice = price;
                string? voucherTitle = null;

                if (v != null && v.FromDate.Date <= today && (v.ToDate == null || v.ToDate.Value.Date >= today))
                {
                    voucherTitle = v.Title;

                    if (v.DiscountPercent.HasValue)
                    {
                        finalPrice *= (1 - v.DiscountPercent.Value / 100m);
                    }

                    if (v.DiscountAmount.HasValue)
                    {
                        finalPrice -= v.DiscountAmount.Value;
                    }

                    if (finalPrice < 0m)
                        finalPrice = 0m;
                }

                result.Add(new
                {
                    rt.RoomTypeID,
                    rt.Name,
                    rt.Description,
                    rt.Capacity,

                    BasePrice = basePrice,
                    Price = rt.DailyPrice ?? basePrice,   // giá theo ngày (nếu có), fallback base
                    FinalPrice = finalPrice,
                    Voucher = voucherTitle,

                    rt.Images
                });
            }

            return Ok(result);
        }

        // ============================================================
        // 4) FULL DETAIL — thêm BasePrice + DailyPrice + FinalPrice
        // ============================================================
        [HttpGet("hotel/{id:int}")]
        public async Task<ActionResult> GetHotelDetail(int id)
        {
            var hotel = await _context.Hotels
                .AsNoTracking()
                .Where(h => h.HotelID == id && !h.IsDeleted)
                .Select(h => new
                {
                    h.HotelID,
                    h.Name,
                    h.Location,
                    h.Description,
                    h.PricePerNight,
                    h.ImageURL,
                    h.Rating
                })
                .FirstOrDefaultAsync();

            if (hotel == null)
                return NotFound();

            var today = DateTime.Today;

            // Voucher của hotel
            var vouchers = await _context.RoomTypeVouchers
                .AsNoTracking()
                .Where(v => v.HotelID == id && v.IsActive && !v.IsDeleted)
                .ToListAsync();

            var rtRaw = await _context.RoomTypes
                .AsNoTracking()
                .Where(rt => rt.HotelID == id)
                .Select(rt => new
                {
                    rt.RoomTypeID,
                    rt.Name,
                    rt.Description,
                    rt.Capacity,

                    // BasePrice (nullable)
                    BasePrice = _context.RatePlans
                        .Where(rp => rp.RoomTypeID == rt.RoomTypeID && rp.IsActive)
                        .Select(rp => (decimal?)rp.BasePrice)
                        .FirstOrDefault(),

                    Availabilities = rt.HotelAvailabilities!
                        .Where(a => !a.IsDeleted)
                        .OrderBy(a => a.Date)
                        .Select(a => new
                        {
                            a.HotelAvailabilityID,
                            a.Date,
                            a.AvailableRooms,
                            a.Price,
                            a.RoomTypeID
                        })
                        .ToList()
                })
                .ToListAsync();

            var roomTypes = new List<HotelRoomTypeDetailDto>();

            foreach (var rt in rtRaw)
            {
                // BasePrice: từ RatePlan (nullable → decimal)
                decimal basePrice = rt.BasePrice ?? 0m;

                // DailyPrice: lấy ngày >= hôm nay gần nhất
                decimal dailyPrice = rt.Availabilities
                    .Where(a => a.Date.Date >= today)
                    .OrderBy(a => a.Date)
                    .Select(a => a.Price)
                    .FirstOrDefault(); // nếu không có → 0

                // OPTION 1: DailyPrice ưu tiên hơn BasePrice
                if (dailyPrice == 0m)
                    dailyPrice = basePrice;

                decimal finalPrice = dailyPrice;
                string? voucherName = null;

                var v = vouchers.FirstOrDefault(x => x.RoomTypeID == rt.RoomTypeID);
                if (v != null && v.FromDate.Date <= today && (v.ToDate == null || v.ToDate.Value.Date >= today))
                {
                    voucherName = v.Title;

                    if (v.DiscountPercent.HasValue)
                    {
                        finalPrice *= (1 - v.DiscountPercent.Value / 100m);
                    }

                    if (v.DiscountAmount.HasValue)
                    {
                        finalPrice -= v.DiscountAmount.Value;
                    }

                    if (finalPrice < 0m)
                        finalPrice = 0m;
                }

                roomTypes.Add(new HotelRoomTypeDetailDto
                {
                    RoomTypeID = rt.RoomTypeID,
                    Name = rt.Name,
                    Description = rt.Description,
                    Capacity = rt.Capacity,
                    BasePrice = basePrice,
                    DailyPrice = dailyPrice,
                    FinalPrice = finalPrice,
                    Voucher = voucherName,

                    Availabilities = rt.Availabilities
                        .Select(a => new HotelAvailabilityDetailDto
                        {
                            HotelAvailabilityID = a.HotelAvailabilityID,
                            Date = a.Date,
                            AvailableRooms = a.AvailableRooms,
                            Price = a.Price,
                            RoomTypeID = a.RoomTypeID
                        })
                        .ToList()
                });
            }

            // ========== Reviews giữ nguyên ==========
            var reviewsRaw = await _context.Reviews
                .AsNoTracking()
                .Where(r => r.HotelID == id)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.ReviewID,
                    r.Rating,
                    r.Comment,
                    r.CreatedAt,
                    ReviewerName = r.ReviewerName,
                    UserFullName = r.User != null ? r.User.FullName : null,
                    Images = r.Images.Select(i => i.ImageURL).ToList()
                })
                .ToListAsync();

            var reviews = reviewsRaw
                .Select(r => new HotelReviewDetailDto
                {
                    ReviewID = r.ReviewID,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    CreatedAt = r.CreatedAt,
                    UserName =
                        !string.IsNullOrWhiteSpace(r.UserFullName)
                            ? r.UserFullName!
                            : (string.IsNullOrWhiteSpace(r.ReviewerName) ? "Ẩn danh" : r.ReviewerName!),
                    Images = r.Images.Select(i => WebPath(i)).ToList()
                })
                .ToList();

            // ========== AvailableDates giữ nguyên ==========
            var availableDatesRaw = await _context.HotelAvailabilities
                .AsNoTracking()
                .Where(a => a.HotelID == id && !a.IsDeleted)
                .OrderBy(a => a.Date)
                .Select(a => new HotelAvailabilityDetailDto
                {
                    HotelAvailabilityID = a.HotelAvailabilityID,
                    Date = a.Date,
                    AvailableRooms = a.AvailableRooms,
                    Price = a.Price,
                    RoomTypeID = a.RoomTypeID
                })
                .ToListAsync();

            double avgRating = reviewsRaw.Count == 0
                ? 0
                : Math.Round(reviewsRaw.Average(r => (double)r.Rating), 1);

            return Ok(new
            {
                hotel.HotelID,
                hotel.Name,
                hotel.Location,
                hotel.Description,
                hotel.PricePerNight,
                Rating = avgRating,
                ReviewCount = reviewsRaw.Count,
                hotel.ImageURL,
                RoomTypes = roomTypes,
                Reviews = reviews,
                AvailableDates = availableDatesRaw
            });
        }

        // ============================================================
        // 5) GET REVIEWS
        // ============================================================
        [HttpGet("reviews/{hotelId:int}")]
        public async Task<ActionResult<IEnumerable<HotelReviewDetailDto>>> GetReviews(int hotelId)
        {
            var reviews = await _context.Reviews
                .AsNoTracking()
                .Where(r => r.HotelID == hotelId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new HotelReviewDetailDto
                {
                    ReviewID = r.ReviewID,
                    UserName = r.User != null
                        ? r.User.FullName
                        : (string.IsNullOrWhiteSpace(r.ReviewerName) ? "Ẩn danh" : r.ReviewerName!),
                    Comment = r.Comment,
                    CreatedAt = r.CreatedAt,
                    Rating = r.Rating,
                    Images = r.Images.Select(i => WebPath(i.ImageURL)).ToList()
                })
                .ToListAsync();

            return Ok(reviews);
        }

        // ============================================================
        // 6) CREATE REVIEW (giữ nguyên)
        // ============================================================
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

            var hotelExists = await _context.Hotels
                .AnyAsync(h => h.HotelID == form.HotelId && !h.IsDeleted);

            if (!hotelExists)
                return NotFound($"Không tìm thấy khách sạn {form.HotelId}");

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

            var savedImages = new List<string>();

            if (form.Images != null && form.Images.Count > 0)
            {
                var now = DateTime.UtcNow;
                var subDir = Path.Combine("uploads", "reviews", now.ToString("yyyy"), now.ToString("MM"));
                var root = Path.Combine(
                    _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
                    subDir
                );
                Directory.CreateDirectory(root);

                foreach (var f in form.Images)
                {
                    if (f.Length <= 0) continue;

                    var ext = Path.GetExtension(f.FileName).ToLowerInvariant();
                    var fileName = $"{Guid.NewGuid():N}{ext}";
                    var fullPath = Path.Combine(root, fileName);

                    using (var fs = System.IO.File.Create(fullPath))
                    {
                        await f.CopyToAsync(fs);
                    }

                    var url = "/" + WebPath(Path.Combine(subDir, fileName));
                    _context.ReviewImages.Add(new ReviewImage
                    {
                        ReviewID = ent.ReviewID,
                        ImageURL = url
                    });
                    savedImages.Add(url);
                }

                await _context.SaveChangesAsync();
            }

            string displayName = "Ẩn danh";

            if (userId.HasValue)
            {
                var fullName = await _context.Users
                    .Where(u => u.UserID == userId.Value)
                    .Select(u => u.FullName)
                    .FirstOrDefaultAsync();

                displayName = fullName ?? (string.IsNullOrWhiteSpace(ent.ReviewerName) ? "Ẩn danh" : ent.ReviewerName!);
            }
            else
            {
                displayName = string.IsNullOrWhiteSpace(ent.ReviewerName) ? "Ẩn danh" : ent.ReviewerName!;
            }

            var dto = new HotelReviewDetailDto
            {
                ReviewID = ent.ReviewID,
                UserName = displayName,
                Comment = ent.Comment,
                CreatedAt = ent.CreatedAt,
                Rating = ent.Rating,
                Images = savedImages
            };

            return Ok(dto);
        }
    }
}

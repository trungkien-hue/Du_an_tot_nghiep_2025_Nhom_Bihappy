using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;

namespace VirtualTravel.Services.Tours
{
    public class TourSearchRequest
    {
        public string? Keyword { get; set; }
        public string? Location { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public int? DurationDays { get; set; }
        public double? MinRating { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 5;
    }

    public class TourSearchService
    {
        private readonly AppDbContext _db;
        public TourSearchService(AppDbContext db) => _db = db;

        public async Task<object> SearchAsync(TourSearchRequest rq, CancellationToken ct = default)
        {
            // Phân trang an toàn
            var page = Math.Max(1, rq.Page);
            var pageSize = Math.Clamp(rq.PageSize, 1, 50);

            // Collation tiếng Việt (không phân biệt hoa/thường & dấu)
            const string VI_COLLATE = "Vietnamese_CI_AI";

            var q = _db.Tours.AsNoTracking().AsQueryable();

            // ===== Fallback: nếu chỉ có Location (người dùng gõ 'Tour Hạ Long' v.v.)
            // thì coi Location như một keyword tự do để match cả Name/Location/Description/Highlights
            if (string.IsNullOrWhiteSpace(rq.Keyword) && !string.IsNullOrWhiteSpace(rq.Location))
            {
                rq.Keyword = rq.Location;
                rq.Location = null; // tránh double-filter làm hẹp kết quả
            }

            // ----- Keyword: tìm trong Name/Location/Description/Highlights -----
            if (!string.IsNullOrWhiteSpace(rq.Keyword))
            {
                var k = rq.Keyword.Trim();
                q = q.Where(t =>
                    EF.Functions.Collate(t.Name, VI_COLLATE).Contains(k) ||
                    EF.Functions.Collate(t.Location, VI_COLLATE).Contains(k) ||
                    EF.Functions.Collate(t.Description ?? string.Empty, VI_COLLATE).Contains(k) ||
                    EF.Functions.Collate(t.Highlights ?? string.Empty, VI_COLLATE).Contains(k)
                );
            }

            // ----- Location riêng (lọc cứng theo tỉnh/thành) -----
            if (!string.IsNullOrWhiteSpace(rq.Location))
            {
                var loc = rq.Location.Trim();
                q = q.Where(t => EF.Functions.Collate(t.Location, VI_COLLATE).Contains(loc));
            }

            // ----- Price -----
            if (rq.MinPrice.HasValue)
                q = q.Where(t => t.Price >= rq.MinPrice.Value);
            if (rq.MaxPrice.HasValue)
                q = q.Where(t => t.Price <= rq.MaxPrice.Value);

            // ----- Duration -----
            if (rq.DurationDays.HasValue)
                q = q.Where(t => t.DurationDays == rq.DurationDays.Value);

            // ----- Rating -----
            if (rq.MinRating.HasValue)
                q = q.Where(t => t.Rating >= rq.MinRating.Value);

            var total = await q.CountAsync(ct);

            // Sắp xếp mặc định: Giá tăng dần, sau đó Rating giảm dần
            var items = await q
                .OrderBy(t => t.Price)
                .ThenByDescending(t => t.Rating)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    t.TourID,
                    t.Name,
                    t.Location,
                    t.DurationDays,
                    t.Rating,
                    Price = t.Price,        // đúng cột Price trong DB
                    ImageUrl = t.ImageURL,  // đúng cột ImageURL trong DB
                    t.Category,
                    t.Highlights,
                    t.Description
                })
                .ToListAsync(ct);

            return new { total, items };
        }
    }
}

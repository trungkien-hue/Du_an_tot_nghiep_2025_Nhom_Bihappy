// /Services/Hotels/HotelSearchService.cs
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;

namespace VirtualTravel.Services.Hotels
{
    public class HotelSearchRequest
    {
        public int? HotelID { get; set; }
        public string? Keyword { get; set; }
        public string? Location { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public DateTime? Checkin { get; set; }
        public DateTime? Checkout { get; set; }
        public double? MinRating { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 5;
    }

    public class HotelSearchService
    {
        private readonly AppDbContext _db;
        public HotelSearchService(AppDbContext db) => _db = db;

        public async Task<object> SearchAsync(HotelSearchRequest rq, CancellationToken ct = default)
        {
            // === Trả chi tiết 1 khách sạn ===
            if (rq.HotelID.HasValue)
            {
                var start = rq.Checkin?.Date;
                var end = rq.Checkout?.Date;

                var h = await _db.Hotels
                    .AsNoTracking()
                    .Where(x => x.HotelID == rq.HotelID.Value)
                    .Select(h => new
                    {
                        h.HotelID,
                        h.Name,
                        h.Location,
                        h.Description,
                        PricePerNight = h.PricePerNight,
                        Rating = h.Rating,
                        ImageURL = h.ImageURL,

                        RoomTypes = h.RoomTypes.Select(rt => new
                        {
                            rt.RoomTypeID,
                            rt.Name,
                            rt.Description,
                            rt.Capacity,
                            Availabilities = rt.HotelAvailabilities
                                .Where(a =>
                                    (!start.HasValue || !end.HasValue)
                                        ? !a.IsDeleted
                                        : (!a.IsDeleted && a.Date >= start && a.Date < end)
                                )
                                .OrderBy(a => a.Date)
                                .Select(a => new
                                {
                                    a.Date,
                                    a.AvailableRooms,
                                    a.Price
                                })
                                .ToList()
                        }).ToList(),

                        MinAvailablePrice =
                            (
                                (start.HasValue && end.HasValue)
                                    ? h.RoomTypes.SelectMany(rt => rt.HotelAvailabilities
                                        .Where(a => !a.IsDeleted && a.Date >= start && a.Date < end)
                                        .Select(a => (decimal?)a.Price))
                                    : h.RoomTypes.SelectMany(rt => rt.HotelAvailabilities
                                        .Where(a => !a.IsDeleted)
                                        .Select(a => (decimal?)a.Price))
                            ).Min() ?? h.PricePerNight
                    })
                    .FirstOrDefaultAsync(ct);

                return (object?)h ?? new { };
            }

            // === Danh sách (paging) ===
            const string VI_COLLATE = "Vietnamese_CI_AI";
            var page = Math.Max(1, rq.Page);
            var size = Math.Clamp(rq.PageSize, 1, 50);

            var q = _db.Hotels.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(rq.Keyword))
            {
                var k = rq.Keyword.Trim();
                q = q.Where(h =>
                    EF.Functions.Collate(h.Name, VI_COLLATE).Contains(k) ||
                    EF.Functions.Collate(h.Location, VI_COLLATE).Contains(k) ||
                    EF.Functions.Collate(h.Description ?? string.Empty, VI_COLLATE).Contains(k)
                );
            }

            if (!string.IsNullOrWhiteSpace(rq.Location))
            {
                var loc = rq.Location.Trim();
                q = q.Where(h => EF.Functions.Collate(h.Location, VI_COLLATE).Contains(loc));
            }

            if (rq.MinRating.HasValue)
                q = q.Where(h => h.Rating >= rq.MinRating.Value);

            var hasDate = rq.Checkin.HasValue && rq.Checkout.HasValue && rq.Checkin.Value.Date < rq.Checkout.Value.Date;

            if (rq.MinPrice.HasValue || rq.MaxPrice.HasValue)
            {
                if (hasDate)
                {
                    var s = rq.Checkin!.Value.Date;
                    var e = rq.Checkout!.Value.Date;
                    if (rq.MinPrice.HasValue)
                    {
                        var min = rq.MinPrice.Value;
                        q = q.Where(h => h.RoomTypes.Any(rt => rt.HotelAvailabilities.Any(a =>
                            !a.IsDeleted && a.Date >= s && a.Date < e && a.Price >= min)));
                    }
                    if (rq.MaxPrice.HasValue)
                    {
                        var max = rq.MaxPrice.Value;
                        q = q.Where(h => h.RoomTypes.Any(rt => rt.HotelAvailabilities.Any(a =>
                            !a.IsDeleted && a.Date >= s && a.Date < e && a.Price <= max)));
                    }
                }
                else
                {
                    if (rq.MinPrice.HasValue)
                    {
                        var min = rq.MinPrice.Value;
                        q = q.Where(h =>
                            (h.RoomTypes.Any(rt => rt.HotelAvailabilities.Any(a => !a.IsDeleted && a.Price >= min)))
                            || (!h.RoomTypes.Any(rt => rt.HotelAvailabilities.Any(a => !a.IsDeleted)) && h.PricePerNight >= min));
                    }
                    if (rq.MaxPrice.HasValue)
                    {
                        var max = rq.MaxPrice.Value;
                        q = q.Where(h =>
                            (h.RoomTypes.Any(rt => rt.HotelAvailabilities.Any(a => !a.IsDeleted && a.Price <= max)))
                            || (!h.RoomTypes.Any(rt => rt.HotelAvailabilities.Any(a => !a.IsDeleted)) && h.PricePerNight <= max));
                    }
                }
            }

            var total = await q.CountAsync(ct);

            var startDate = hasDate ? rq.Checkin!.Value.Date : (DateTime?)null;
            var endDate = hasDate ? rq.Checkout!.Value.Date : (DateTime?)null;

            var raw = await q
                .OrderBy(h => h.PricePerNight)
                .ThenByDescending(h => h.Rating)
                .Skip((page - 1) * size)
                .Take(size)
                .Select(h => new
                {
                    h.HotelID,
                    h.Name,
                    h.Location,
                    h.Description,
                    PricePerNight = h.PricePerNight,
                    Rating = h.Rating,
                    ImageURL = h.ImageURL,
                    _AvailPrices = (hasDate)
                        ? h.RoomTypes.SelectMany(rt => rt.HotelAvailabilities
                            .Where(a => !a.IsDeleted && a.Date >= startDate && a.Date < endDate)
                            .Select(a => (decimal?)a.Price))
                        : h.RoomTypes.SelectMany(rt => rt.HotelAvailabilities
                            .Where(a => !a.IsDeleted)
                            .Select(a => (decimal?)a.Price))
                })
                .ToListAsync(ct);

            var items = raw.Select(x => new
            {
                x.HotelID,
                x.Name,
                x.Location,
                x.Description,
                x.PricePerNight,
                x.Rating,
                x.ImageURL,
                MinAvailablePrice = x._AvailPrices.Min() ?? x.PricePerNight
            }).ToList();

            return new { total, items };
        }
    }
}

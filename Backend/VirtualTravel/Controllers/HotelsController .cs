// File: Controllers/HotelsController.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public sealed class HotelsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public HotelsController(AppDbContext db)
        {
            _db = db;
        }

        // ===== DTOs =====
        public sealed class HotelAvailabilityDto
        {
            public int AvailabilityID { get; set; }
            public DateTime Date { get; set; }
            public int AvailableRooms { get; set; }
            public decimal Price { get; set; }
        }

        public sealed class RoomTypeDto
        {
            public int RoomTypeID { get; set; }
            public string Name { get; set; } = string.Empty;
            public string? Description { get; set; }
            public int Capacity { get; set; }
            public int AvailableRooms { get; set; }
            public decimal Price { get; set; }
            public List<HotelAvailabilityDto> Availabilities { get; set; } = new();
        }

        public sealed class HotelSearchAvailabilityDto
        {
            public int HotelID { get; set; }
            public string Name { get; set; } = string.Empty;
            public string Location { get; set; } = string.Empty;
            public string? ImageURL { get; set; }
            public float Rating { get; set; }
            public List<RoomTypeDto> RoomTypes { get; set; } = new();
        }

        public sealed class SearchAvailabilityRequest
        {
            public int? HotelId { get; set; }
            public string? Name { get; set; }
            public string? Location { get; set; }
            public DateTime? Checkin { get; set; }
            public DateTime? Checkout { get; set; }
            public int? RoomsNeeded { get; set; }
        }

        private static (DateTime checkin, DateTime checkout, int nights) NormalizeRange(DateTime checkIn, DateTime checkOut)
        {
            var ci = checkIn.Date;
            var co = checkOut.Date;
            if (co <= ci)
                throw new ArgumentException("Khoảng ngày không hợp lệ (checkOut phải sau checkIn).");

            var nights = (co - ci).Days;
            return (checkin: ci, checkout: co, nights: nights);
        }

        // =====================================================================
        //  GET /api/hotels  → danh sách khách sạn (hiển thị giá mới nhất)
        // =====================================================================
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var today = DateTime.Today;

            var hotels = await _db.Hotels
                .AsNoTracking()
                .Include(h => h.RoomTypes)
                    .ThenInclude(rt => rt.HotelAvailabilities)
                .Select(h => new HotelSearchAvailabilityDto
                {
                    HotelID = h.HotelID,
                    Name = h.Name,
                    Location = h.Location,
                    ImageURL = h.ImageURL,
                    Rating = h.Rating,
                    RoomTypes = h.RoomTypes.Select(rt => new RoomTypeDto
                    {
                        RoomTypeID = rt.RoomTypeID,
                        Name = rt.Name,
                        Description = rt.Description,
                        Capacity = rt.Capacity,

                        // ✅ Lấy giá gần nhất (ưu tiên tương lai, fallback về quá khứ)
                        Price = rt.HotelAvailabilities
                            .Where(av => !av.IsDeleted)
                            .OrderBy(av => Math.Abs(EF.Functions.DateDiffDay(av.Date, today)))
                            .Select(av => av.Price)
                            .FirstOrDefault(),

                        // ✅ Số phòng hôm nay
                        AvailableRooms = rt.HotelAvailabilities
                            .Where(av => !av.IsDeleted && av.Date == today)
                            .Select(av => av.AvailableRooms)
                            .FirstOrDefault(),

                        // ✅ Toàn bộ availability
                        Availabilities = rt.HotelAvailabilities
                            .Where(av => !av.IsDeleted)
                            .OrderBy(av => av.Date)
                            .Select(av => new HotelAvailabilityDto
                            {
                                AvailabilityID = av.HotelAvailabilityID,
                                Date = av.Date,
                                AvailableRooms = av.AvailableRooms,
                                Price = av.Price
                            }).ToList()
                    }).ToList()
                })
                .ToListAsync();

            return Ok(hotels);
        }

        // =====================================================================
        //  GET /api/hotels/{id}
        // =====================================================================
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var today = DateTime.Today;

            var h = await _db.Hotels
                .AsNoTracking()
                .Include(x => x.RoomTypes)
                    .ThenInclude(rt => rt.HotelAvailabilities)
                .Where(x => x.HotelID == id)
                .Select(x => new HotelSearchAvailabilityDto
                {
                    HotelID = x.HotelID,
                    Name = x.Name,
                    Location = x.Location,
                    ImageURL = x.ImageURL,
                    Rating = x.Rating,
                    RoomTypes = x.RoomTypes.Select(rt => new RoomTypeDto
                    {
                        RoomTypeID = rt.RoomTypeID,
                        Name = rt.Name,
                        Description = rt.Description,
                        Capacity = rt.Capacity,
                        Price = rt.HotelAvailabilities
                            .Where(av => !av.IsDeleted)
                            .OrderBy(av => Math.Abs(EF.Functions.DateDiffDay(av.Date, today) ))
                            .Select(av => av.Price)
                            .FirstOrDefault(),
                        AvailableRooms = rt.HotelAvailabilities
                            .Where(av => !av.IsDeleted && av.Date == today)
                            .Select(av => av.AvailableRooms)
                            .FirstOrDefault(),
                        Availabilities = rt.HotelAvailabilities
                            .Where(av => !av.IsDeleted)
                            .OrderBy(av => av.Date)
                            .Select(av => new HotelAvailabilityDto
                            {
                                AvailabilityID = av.HotelAvailabilityID,
                                Date = av.Date,
                                AvailableRooms = av.AvailableRooms,
                                Price = av.Price
                            }).ToList()
                    }).ToList()
                })
                .FirstOrDefaultAsync();

            if (h == null)
                return NotFound();

            return Ok(h);
        }

        // =====================================================================
        //  CORE SEARCH LOGIC (dùng chung cho GET/POST)
        // =====================================================================
        private async Task<HotelSearchAvailabilityDto?> SearchOneHotelAvailabilityCore(
            int hotelId, DateTime checkIn, DateTime checkOut, int roomsNeeded)
        {
            var range = NormalizeRange(checkIn, checkOut);

            var hotel = await _db.Hotels
                .AsNoTracking()
                .Where(h => h.HotelID == hotelId)
                .Select(h => new
                {
                    h.HotelID,
                    h.Name,
                    h.Location,
                    h.ImageURL,
                    h.Rating,
                    RoomTypes = h.RoomTypes.Select(rt => new
                    {
                        rt.RoomTypeID,
                        rt.Name,
                        rt.Description,
                        rt.Capacity
                    }).ToList()
                })
                .FirstOrDefaultAsync();

            if (hotel == null) return null;

            var roomTypeIds = hotel.RoomTypes.Select(rt => rt.RoomTypeID).ToList();

            var availabilities = await _db.HotelAvailabilities
                .AsNoTracking()
                .Where(a =>
                    a.HotelID == hotel.HotelID &&
                    roomTypeIds.Contains(a.RoomTypeID) &&
                    !a.IsDeleted &&
                    a.Date >= range.checkin &&
                    a.Date < range.checkout)
                .OrderBy(a => a.RoomTypeID)
                .ThenBy(a => a.Date)
                .ToListAsync();

            var availByRt = availabilities
                .GroupBy(a => a.RoomTypeID)
                .ToDictionary(g => g.Key, g => g.ToList());

            var resultRoomTypes = new List<RoomTypeDto>();

            foreach (var rt in hotel.RoomTypes)
            {
                availByRt.TryGetValue(rt.RoomTypeID, out var days);
                if (days == null || days.Count < range.nights) continue;

                var minAvail = days.Min(a => a.AvailableRooms);
                if (minAvail < roomsNeeded) continue;

                var priceFirstNight = days
                    .Where(d => d.Date == range.checkin)
                    .Select(d => d.Price)
                    .DefaultIfEmpty(days.Min(d => d.Price))
                    .First();

                resultRoomTypes.Add(new RoomTypeDto
                {
                    RoomTypeID = rt.RoomTypeID,
                    Name = rt.Name,
                    Description = rt.Description,
                    Capacity = rt.Capacity,
                    AvailableRooms = minAvail,
                    Price = priceFirstNight,
                    Availabilities = days.Select(d => new HotelAvailabilityDto
                    {
                        AvailabilityID = d.HotelAvailabilityID,
                        Date = d.Date,
                        AvailableRooms = d.AvailableRooms,
                        Price = d.Price
                    }).ToList()
                });
            }

            resultRoomTypes = resultRoomTypes.OrderBy(x => x.Price).ToList();

            return new HotelSearchAvailabilityDto
            {
                HotelID = hotel.HotelID,
                Name = hotel.Name,
                Location = hotel.Location,
                ImageURL = hotel.ImageURL,
                Rating = hotel.Rating,
                RoomTypes = resultRoomTypes
            };
        }

        // =====================================================================
        //  GET /api/Hotels/search-availability?hotelId=&checkIn=&checkOut=&roomsNeeded=
        // =====================================================================
        [HttpGet("search-availability")]
        public async Task<IActionResult> SearchAvailability(
            [FromQuery] int hotelId,
            [FromQuery] DateTime checkIn,
            [FromQuery] DateTime checkOut,
            [FromQuery] int roomsNeeded = 1)
        {
            if (roomsNeeded <= 0) roomsNeeded = 1;

            try
            {
                var result = await SearchOneHotelAvailabilityCore(hotelId, checkIn, checkOut, roomsNeeded);
                if (result == null) return NotFound($"Không tìm thấy khách sạn id={hotelId}.");
                return Ok(new[] { result });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // =====================================================================
        //  POST /api/Hotels/search-availability
        // =====================================================================
        [HttpPost("search-availability")]
        public async Task<IActionResult> SearchAvailabilityPost([FromBody] SearchAvailabilityRequest body)
        {
            if (body == null || body.Checkin == null || body.Checkout == null)
                return BadRequest("Thiếu checkin/checkout.");

            var roomsNeeded = Math.Max(1, body.RoomsNeeded ?? 1);

            try
            {
                if (body.HotelId.HasValue)
                {
                    var one = await SearchOneHotelAvailabilityCore(body.HotelId.Value, body.Checkin.Value, body.Checkout.Value, roomsNeeded);
                    if (one == null) return Ok(Array.Empty<HotelSearchAvailabilityDto>());
                    return Ok(new[] { one });
                }

                var hotelIds = await _db.Hotels
                    .AsNoTracking()
                    .Where(h =>
                        (string.IsNullOrWhiteSpace(body.Name) || EF.Functions.Like(h.Name, $"%{body.Name}%")) &&
                        (string.IsNullOrWhiteSpace(body.Location) || EF.Functions.Like(h.Location, $"%{body.Location}%")))
                    .Select(h => h.HotelID)
                    .ToListAsync();

                var results = new List<HotelSearchAvailabilityDto>();
                foreach (var hid in hotelIds)
                {
                    var item = await SearchOneHotelAvailabilityCore(hid, body.Checkin.Value, body.Checkout.Value, roomsNeeded);
                    if (item != null && item.RoomTypes.Count > 0)
                        results.Add(item);
                }

                return Ok(results.OrderBy(h => h.RoomTypes.FirstOrDefault()?.Price ?? decimal.MaxValue).ToList());
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // =====================================================================
        //  Endpoint phụ tương thích cũ
        // =====================================================================
        [HttpGet("{hotelId:int}/availability")]
        public Task<IActionResult> GetHotelAvailabilityByPath(
            int hotelId,
            [FromQuery] DateTime checkIn,
            [FromQuery] DateTime checkOut,
            [FromQuery] int roomsNeeded = 1)
        {
            return SearchAvailability(hotelId, checkIn, checkOut, roomsNeeded);
        }
    }
}

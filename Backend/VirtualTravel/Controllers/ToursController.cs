using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;
using VirtualTravel.Models;
using VirtualTravel.DTOs.Tour;

namespace VirtualTravel.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ToursController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ToursController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/tours
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TourDto>>> GetTours()
        {
            var tours = await _context.Tours
                .Include(t => t.TourAvailabilities)
                .ToListAsync();

            var result = tours.Select(t => new TourDto
            {
                TourID = t.TourID,
                Name = t.Name,
                Location = t.Location,
                Description = t.Description,
                DurationDays = t.DurationDays,
                Price = t.Price,
                ImageURL = t.ImageURL,

                Availabilities = t.TourAvailabilities.Select(a => new TourAvailabilityDto
                {
                    StartDate = a.StartDate,
                    EndDate = a.EndDate,
                    AvailableSlots = a.AvailableSlots,
                    PriceAdult = a.PriceAdult,
                    PriceChild = a.PriceChild
                }).ToList()
            });

            return Ok(result);
        }

        // GET: api/tours/5
        [HttpGet("{id}")]
        public async Task<ActionResult<TourDto>> GetTour(int id)
        {
            var tour = await _context.Tours
                .Include(t => t.TourAvailabilities)
                .FirstOrDefaultAsync(t => t.TourID == id);

            if (tour == null)
                return NotFound();

            var tourDto = new TourDto
            {
                TourID = tour.TourID,
                Name = tour.Name,
                Location = tour.Location,
                Description = tour.Description,
                DurationDays = tour.DurationDays,
                Price = tour.Price,
                ImageURL = tour.ImageURL,

                Availabilities = tour.TourAvailabilities.Select(a => new TourAvailabilityDto
                {
                    StartDate = a.StartDate,
                    EndDate = a.EndDate,
                    AvailableSlots = a.AvailableSlots,
                    PriceAdult = a.PriceAdult,
                    PriceChild = a.PriceChild
                }).ToList()
            };

            return Ok(tourDto);
        }

        // POST: api/tours/search-availability
        [HttpPost("search-availability")]
        public async Task<ActionResult<IEnumerable<TourDto>>> SearchAvailability([FromBody] SearchTourAvailabilityDto dto)
        {
            var query = _context.Tours
                .Include(t => t.TourAvailabilities)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(dto.Name))
                query = query.Where(t => t.Name.Contains(dto.Name));

            if (!string.IsNullOrWhiteSpace(dto.Location))
                query = query.Where(t => t.Location.Contains(dto.Location));

            var tours = await query.ToListAsync();
            if (!tours.Any())
                return NotFound();

            var result = tours.Select(t => new TourDto
            {
                TourID = t.TourID,
                Name = t.Name,
                Location = t.Location,
                Description = t.Description,
                DurationDays = t.DurationDays,
                Price = t.Price,
                ImageURL = t.ImageURL,

                Availabilities = t.TourAvailabilities
                    .Where(a =>
                        (dto.StartDate.HasValue && dto.EndDate.HasValue
                            ? !(dto.EndDate <= a.StartDate || dto.StartDate >= a.EndDate)
                            : true) &&
                        (!dto.MinPrice.HasValue || a.PriceAdult >= dto.MinPrice) &&
                        (!dto.MaxPrice.HasValue || a.PriceAdult <= dto.MaxPrice) &&
                        (!dto.MinSlots.HasValue || a.AvailableSlots >= dto.MinSlots)
                    )
                    .Select(a => new TourAvailabilityDto
                    {
                        StartDate = a.StartDate,
                        EndDate = a.EndDate,
                        AvailableSlots = a.AvailableSlots,
                        PriceAdult = a.PriceAdult,
                        PriceChild = a.PriceChild
                    }).ToList()
            });

            return Ok(result);
        }
    }
}

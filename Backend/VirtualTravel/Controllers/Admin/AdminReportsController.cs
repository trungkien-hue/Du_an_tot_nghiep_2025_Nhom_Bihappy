using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;

namespace VirtualTravel.Controllers.Admin;

[ApiController]
[Route("api/admin/reports")]
public class AdminReportsController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminReportsController(AppDbContext db) => _db = db;

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        // Các Count này đã tự loại bỏ IsDeleted nhờ Global Filter
        var hotelCount = await _db.Hotels.CountAsync();
        var tourCount = await _db.Tours.CountAsync();
        var userCount = await _db.Users.CountAsync();

        // Demo bookings theo tháng (thay bằng số liệu thực nếu cần)
        var bookings = Enumerable.Range(1, 12).Select(m => new
        {
            month = $"{DateTime.Now.Year}-{m:D2}",
            hotelBookings = Random.Shared.Next(1, 50),
            tourBookings = Random.Shared.Next(1, 30)
        });

        return Ok(new { hotelCount, tourCount, userCount, bookings });
    }

    [HttpGet("monthly")]
    public async Task<IActionResult> GetMonthly([FromQuery] int? year)
    {
        int y = year ?? DateTime.Now.Year;
        var hotel = Enumerable.Range(1, 12).Select(m => new { month = m, count = Random.Shared.Next(10, 100) });
        var tour = Enumerable.Range(1, 12).Select(m => new { month = m, count = Random.Shared.Next(5, 60) });
        return Ok(new { year = y, hotel, tour });
    }
}

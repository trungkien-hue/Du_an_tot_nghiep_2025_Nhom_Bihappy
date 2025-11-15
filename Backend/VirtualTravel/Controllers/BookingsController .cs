// File: Controllers/BookingsController.cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;
using VirtualTravel.Hubs;
using VirtualTravel.Integrations.PartnerHotel;
using VirtualTravel.Models;

namespace VirtualTravel.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IHubContext<NotificationHub> _notiHub;               // Staff/Admin
        private readonly IHubContext<PartnerNotificationHub> _partnerHub;     // Hotel/Partner
        private readonly IPartnerWebhookSender _partnerSender;

        public BookingsController(
            AppDbContext db,
            IHubContext<NotificationHub> notiHub,
            IHubContext<PartnerNotificationHub> partnerHub,
            IPartnerWebhookSender partnerSender)
        {
            _db = db;
            _notiHub = notiHub;
            _partnerHub = partnerHub;
            _partnerSender = partnerSender;
        }

        private int? TryGetUserIdFromToken()
        {
            try
            {
                var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrWhiteSpace(id)) return null;
                return int.Parse(id);
            }
            catch { return null; }
        }

        // POST: api/bookings
        [HttpPost]
        public async Task<IActionResult> CreateBooking(
            [FromBody] Booking request,
            CancellationToken ct,
            [FromQuery] bool sendWebhook = true,
            [FromQuery] bool notifyStaff = true,
            [FromQuery] bool notifyAdmin = true,
            [FromQuery] bool notifyHotel = true)
        {
            if (request == null) return BadRequest(new { message = "Payload rỗng." });
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = TryGetUserIdFromToken();
            int quantity = request.Quantity > 0 ? request.Quantity : 1;
            bool isRoomBooking = request.RoomTypeID.HasValue;
            bool isTourBooking = request.TourID.HasValue;

            if (!isRoomBooking && !isTourBooking)
                return BadRequest(new { message = "Thiếu TourID hoặc RoomTypeID." });

            DateTime? checkin = request.CheckInDate?.Date;
            DateTime? checkout = request.CheckOutDate?.Date;

            if (isRoomBooking)
            {
                if (!checkin.HasValue || !checkout.HasValue)
                    return BadRequest(new { message = "Thiếu CheckInDate/CheckOutDate cho booking phòng." });
                if (checkout.Value <= checkin.Value)
                    return BadRequest(new { message = "Khoảng ngày không hợp lệ." });
            }

            int nights = 0;
            if (isRoomBooking && checkin.HasValue && checkout.HasValue)
            {
                nights = (checkout.Value - checkin.Value).Days;
                if (nights < 1) nights = 1;
            }

            // Map HotelID nếu client không gửi mà chỉ có RoomTypeID
            int? hotelId = request.HotelID;
            if (!hotelId.HasValue && request.RoomTypeID.HasValue)
            {
                hotelId = await _db.RoomTypes
                    .Where(rt => rt.RoomTypeID == request.RoomTypeID.Value)
                    .Select(rt => (int?)rt.HotelID)
                    .FirstOrDefaultAsync(ct);
            }

            decimal pricePerNight = request.Price ?? 0m;
            decimal totalPrice = request.TotalPrice ?? 0m;

            if (isRoomBooking)
            {
                if (pricePerNight <= 0m && request.RoomTypeID.HasValue)
                {
                    var allDays = await _db.HotelAvailabilities.AsNoTracking()
                        .Where(a => a.RoomTypeID == request.RoomTypeID.Value && !a.IsDeleted
                                    && a.Date >= checkin!.Value && a.Date < checkout!.Value)
                        .OrderBy(a => a.Date)
                        .ToListAsync(ct);

                    if (allDays.Count >= nights && nights > 0)
                    {
                        pricePerNight = allDays.Average(a => a.Price);
                        totalPrice = allDays.Sum(a => a.Price) * quantity;
                    }
                    else
                    {
                        var fallbackHotelPrice = await _db.RoomTypes
                            .Where(rt => rt.RoomTypeID == request.RoomTypeID.Value)
                            .Select(rt => rt.Hotel.PricePerNight)
                            .FirstOrDefaultAsync(ct);

                        pricePerNight = fallbackHotelPrice > 0 ? fallbackHotelPrice : 0m;
                        totalPrice = pricePerNight * nights * quantity;
                    }
                }
                else
                {
                    totalPrice = pricePerNight * nights * quantity;
                }
            }
            else if (isTourBooking)
            {
                totalPrice = request.TotalPrice ?? 0m;
            }

            var booking = new Booking
            {
                UserID = userId,
                HotelID = hotelId,
                TourID = request.TourID,
                RoomTypeID = request.RoomTypeID,

                HotelName = request.HotelName,
                Location = request.Location,

                CheckInDate = checkin,
                CheckOutDate = checkout,
                BookingDate = DateTime.UtcNow,

                Status = "Pending",
                IsDeleted = false,

                FullName = request.FullName,
                Phone = request.Phone,

                Price = pricePerNight,
                TotalPrice = totalPrice,
                Quantity = quantity,

                NumberOfGuests = request.NumberOfGuests,
                AvailableRooms = request.AvailableRooms
            };

            _db.Bookings.Add(booking);
            await _db.SaveChangesAsync(ct);

            // 1) Gửi webhook tới KS gốc (nếu bật)
            bool partnerOffline = false;
            string? partnerOfflineMessage = null;

            if (sendWebhook)
            {
                try
                {
                    await _partnerSender.SendBookingCreatedAsync(booking.BookingID, ct);
                }
                catch (Exception ex) when (
                    ex is HttpRequestException ||
                    ex.GetType().Name.Contains("Timeout", StringComparison.OrdinalIgnoreCase) ||
                    ex.GetType().Name.Contains("Unavailable", StringComparison.OrdinalIgnoreCase) ||
                    ex.GetType().Name.Contains("PartnerInactive", StringComparison.OrdinalIgnoreCase))
                {
                    partnerOffline = true;
                    partnerOfflineMessage = "Khách sạn gốc tạm thời ngưng hoạt động hoặc không nhận đơn. Đơn đã ghi nhận trong hệ thống trung gian.";
                }
                catch
                {
                    partnerOffline = true;
                    partnerOfflineMessage = "Khách sạn gốc tạm thời ngưng hoạt động hoặc không nhận đơn. Đơn đã ghi nhận trong hệ thống trung gian.";
                }
            }

            // 2) Tạo notifications
            var notis = new List<Notification>();

            string title = isRoomBooking ? "Đơn đặt phòng mới" : "Đơn tour mới";
            string message = isRoomBooking
                ? $"Khách {booking.FullName} đặt {booking.Quantity} phòng tại {booking.HotelName ?? "(chưa rõ)"} ({booking.Location ?? "..."})"
                : $"Khách {booking.FullName} đặt tour #{booking.TourID}";

            if (notifyStaff)
            {
                notis.Add(new Notification
                {
                    Title = title,
                    Message = message,
                    Type = "BookingCreated",
                    BookingID = booking.BookingID,
                    HotelID = booking.HotelID,
                    RoomTypeID = booking.RoomTypeID,
                    TargetRole = "Staff",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }

            if (notifyAdmin)
            {
                notis.Add(new Notification
                {
                    Title = title,
                    Message = message,
                    Type = "BookingCreated",
                    BookingID = booking.BookingID,
                    HotelID = booking.HotelID,
                    RoomTypeID = booking.RoomTypeID,
                    TargetRole = "Admin",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }

            if (notifyHotel && booking.HotelID.HasValue)
            {
                notis.Add(new Notification
                {
                    Title = title,
                    Message = message,
                    Type = "BookingCreated",
                    BookingID = booking.BookingID,
                    HotelID = booking.HotelID,
                    RoomTypeID = booking.RoomTypeID,
                    TargetRole = "Hotel",
                    TargetHotelId = booking.HotelID, // 👈 đảm bảo không null
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }

            if (partnerOffline)
            {
                if (notifyStaff)
                {
                    notis.Add(new Notification
                    {
                        Title = "Đối tác tạm ngưng hoạt động",
                        Message = $"{partnerOfflineMessage} (Booking #{booking.BookingID})",
                        Type = "PartnerOffline",
                        BookingID = booking.BookingID,
                        HotelID = booking.HotelID,
                        RoomTypeID = booking.RoomTypeID,
                        TargetRole = "Staff",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }
                if (notifyAdmin)
                {
                    notis.Add(new Notification
                    {
                        Title = "Đối tác tạm ngưng hoạt động",
                        Message = $"{partnerOfflineMessage} (Booking #{booking.BookingID})",
                        Type = "PartnerOffline",
                        BookingID = booking.BookingID,
                        HotelID = booking.HotelID,
                        RoomTypeID = booking.RoomTypeID,
                        TargetRole = "Admin",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            if (notis.Count > 0)
            {
                _db.Notifications.AddRange(notis);
                await _db.SaveChangesAsync(ct);
            }

            // 3) SignalR push
            foreach (var n in notis)
            {
                var payload = new
                {
                    notiId = n.NotificationID,
                    title = n.Title,
                    message = n.Message,
                    type = n.Type, // "BookingCreated" | "PartnerOffline"
                    bookingId = booking.BookingID,
                    hotelId = booking.HotelID,
                    roomTypeId = booking.RoomTypeID,
                    createdAt = n.CreatedAt,
                    customer = new { name = booking.FullName, phone = booking.Phone },
                    stay = new { checkIn = booking.CheckInDate, checkOut = booking.CheckOutDate, quantity = booking.Quantity },
                    prices = new { pricePerNight = booking.Price, total = booking.TotalPrice }
                };

                if (n.TargetRole == "Admin")
                {
                    await _notiHub.Clients.Group("Admin").SendAsync(n.Type, payload, ct);
                }
                else if (n.TargetRole == "Staff")
                {
                    await _notiHub.Clients.Group("Staff").SendAsync(n.Type, payload, ct);
                }
                else if (n.TargetRole == "Hotel")
                {
                    // 👇 fallback sang HotelID nếu TargetHotelId null
                    var hotelTargetId = n.TargetHotelId ?? n.HotelID;
                    if (hotelTargetId.HasValue)
                    {
                        await _partnerHub.Clients
                            .Group($"hotel:{hotelTargetId.Value}")
                            .SendAsync(n.Type /* "BookingCreated" */, payload, ct);
                    }
                }
            }

            // 4) Response
            return Ok(new
            {
                Message = partnerOffline
                    ? "Đặt phòng thành công (đối tác đang tạm ngưng hoạt động)"
                    : "Đặt phòng thành công",
                PartnerOffline = partnerOffline,
                PartnerOfflineNotice = partnerOffline ? partnerOfflineMessage : null,
                BookingID = booking.BookingID,
                UserID = booking.UserID,
                booking.Status,
                booking.Quantity,
                booking.TotalPrice,
                Options = new { sendWebhook, notifyStaff, notifyAdmin, notifyHotel }
            });
        }

        // GET: api/bookings/user
        [HttpGet("user")]
        public async Task<IActionResult> GetBookingsByUser(CancellationToken ct)
        {
            var userId = TryGetUserIdFromToken();
            if (!userId.HasValue)
                return Unauthorized("Bạn cần đăng nhập để xem danh sách đơn của mình.");

            var bookings = await _db.Bookings
                .Where(b => b.UserID == userId && !b.IsDeleted)
                .OrderByDescending(b => b.BookingDate)
                .ToListAsync(ct);

            return Ok(bookings);
        }
    }
}

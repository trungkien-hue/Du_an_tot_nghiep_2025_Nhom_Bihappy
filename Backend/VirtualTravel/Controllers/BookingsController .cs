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
        private readonly IHubContext<NotificationHub> _notiHub;
        private readonly IHubContext<PartnerNotificationHub> _partnerHub;
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

        // ========================================================================================
        // POST: api/bookings
        // ========================================================================================
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

            // Map HotelID từ RoomType nếu FE không gửi
            int? hotelId = request.HotelID;
            if (!hotelId.HasValue && request.RoomTypeID.HasValue)
            {
                hotelId = await _db.RoomTypes
                    .Where(rt => rt.RoomTypeID == request.RoomTypeID.Value)
                    .Select(rt => (int?)rt.HotelID)
                    .FirstOrDefaultAsync(ct);
            }

            // ========================================================================================
            // ⭐ INVENTORY CHECK — FIX CHÍNH
            // ========================================================================================
            if (isRoomBooking)
            {
                var ci = checkin!.Value;
                var co = checkout!.Value;

                var avs = await _db.HotelAvailabilities
                    .Where(a =>
                        a.HotelID == hotelId &&
                        a.RoomTypeID == request.RoomTypeID &&
                        a.Date >= ci && a.Date < co &&
                        !a.IsDeleted)
                    .ToListAsync(ct);

                if (avs.Count < nights)
                {
                    return BadRequest(new
                    {
                        message = "Khách sạn chưa có dữ liệu tồn kho đầy đủ cho khoảng ngày bạn chọn."
                    });
                }

                int minAvail = avs.Min(a => a.AvailableRooms);

                if (minAvail < quantity)
                {
                    return BadRequest(new
                    {
                        message = $"Không đủ phòng trống. Chỉ còn {minAvail} phòng trong khoảng ngày bạn chọn."
                    });
                }
            }

            // ========================================================================================
            // Giá (FINAL PRICE)
            // ========================================================================================
            decimal originalPrice = request.Price ?? 0m;
            decimal finalPrice = request.FinalPrice ?? originalPrice;
            decimal totalFinal = request.FinalTotal ?? (finalPrice * nights * quantity);

            // ========================================================================================
            // TẠO BOOKING (giữ nguyên logic cũ)
            // ========================================================================================
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

                Price = finalPrice,
                FinalPrice = finalPrice,
                FinalTotal = totalFinal,
                TotalPrice = totalFinal,

                Quantity = quantity,
                VoucherApplied = request.VoucherApplied,

                NumberOfGuests = request.NumberOfGuests,
                AvailableRooms = request.AvailableRooms
            };

            _db.Bookings.Add(booking);
            await _db.SaveChangesAsync(ct);

            // ========================================================================================
            // Tiếp tục logic webhook + notification + signalR của bạn
            // ⭐ KHÔNG ĐỤNG VÀO
            // ========================================================================================

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
                    ex.GetType().Name.Contains("Timeout") ||
                    ex.GetType().Name.Contains("Unavailable") ||
                    ex.GetType().Name.Contains("PartnerInactive"))
                {
                    partnerOffline = true;
                    partnerOfflineMessage = "Khách sạn gốc tạm thời ngưng hoạt động hoặc không nhận đơn.";
                }
                catch
                {
                    partnerOffline = true;
                    partnerOfflineMessage = "Khách sạn gốc tạm thời ngưng hoạt động hoặc không nhận đơn.";
                }
            }

            // (✓) Notifications — giữ nguyên toàn bộ logic
            var notis = new List<Notification>();
            string title = isRoomBooking ? "Đơn đặt phòng mới" : "Đơn tour mới";
            string message = isRoomBooking
                ? $"Khách {booking.FullName} đặt {booking.Quantity} phòng tại {booking.HotelName} ({booking.Location})"
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
                    TargetHotelId = booking.HotelID,
                    TargetRole = "Hotel",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }

            if (notis.Any())
            {
                _db.Notifications.AddRange(notis);
                await _db.SaveChangesAsync(ct);
            }

            // SignalR push — giữ nguyên toàn bộ logic bạn đã có
            foreach (var n in notis)
            {
                var payload = new
                {
                    notiId = n.NotificationID,
                    title = n.Title,
                    message = n.Message,
                    type = n.Type,
                    bookingId = booking.BookingID,
                    hotelId = booking.HotelID,
                    roomTypeId = booking.RoomTypeID,
                    createdAt = n.CreatedAt,
                    customer = new { name = booking.FullName, phone = booking.Phone },
                    stay = new { checkIn = booking.CheckInDate, checkOut = booking.CheckOutDate, quantity = booking.Quantity },
                    prices = new { pricePerNight = booking.FinalPrice, total = booking.FinalTotal }
                };

                if (n.TargetRole == "Admin")
                    await _notiHub.Clients.Group("Admin").SendAsync(n.Type, payload, ct);

                else if (n.TargetRole == "Staff")
                    await _notiHub.Clients.Group("Staff").SendAsync(n.Type, payload, ct);

                else if (n.TargetRole == "Hotel")
                    await _partnerHub.Clients.Group($"hotel:{n.TargetHotelId}").SendAsync(n.Type, payload, ct);
            }

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
                TotalFinal = booking.FinalTotal
            });
        }

        // ========================================================================================
        // GET: api/bookings/user
        // ========================================================================================
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

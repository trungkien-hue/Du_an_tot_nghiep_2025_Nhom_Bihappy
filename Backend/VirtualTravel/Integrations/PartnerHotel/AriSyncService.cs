using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;
using VirtualTravel.Models;
using VirtualTravel.Services.Notifications;

namespace VirtualTravel.Integrations.PartnerHotel
{
    public interface IAriSyncService
    {
        Task HandleAriChangedAsync(string rawJson, string? signature = null, string? eventId = null);
    }

    internal sealed class AriChangedPayload
    {
        [JsonPropertyName("eventId")] public string? EventId { get; set; }
        [JsonPropertyName("hotelCode")] public string? HotelCode { get; set; }
        [JsonPropertyName("items")] public List<AriItemDto> Items { get; set; } = new();
    }

    internal sealed class AriItemDto
    {
        [JsonPropertyName("date")] public DateOnly Date { get; set; }
        [JsonPropertyName("allotment")] public int Allotment { get; set; }
        [JsonPropertyName("price")] public decimal Price { get; set; }
        [JsonPropertyName("stopSell")] public bool StopSell { get; set; }
        [JsonPropertyName("minLos")] public int? MinLos { get; set; }
        [JsonPropertyName("maxLos")] public int? MaxLos { get; set; }
        [JsonPropertyName("cta")] public bool? Cta { get; set; }
        [JsonPropertyName("ctd")] public bool? Ctd { get; set; }
    }

    public sealed class AriSyncService : IAriSyncService
    {
        private readonly AppDbContext _db;
        private readonly INotificationPublisher _noti;

        public AriSyncService(AppDbContext db, INotificationPublisher noti)
        {
            _db = db; _noti = noti;
        }

        public async Task HandleAriChangedAsync(string rawJson, string? signature = null, string? eventId = null)
        {
            AriChangedPayload? dto = null;
            try
            {
                dto = JsonSerializer.Deserialize<AriChangedPayload>(
                    rawJson,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (Exception ex)
            {
                await _noti.AddAndBroadcastAsync("Đối tác khách sạn", $"⚠️ Không parse được ARI payload: {ex.Message}");
                return;
            }

            if (dto == null || string.IsNullOrWhiteSpace(dto.HotelCode))
            {
                await _noti.AddAndBroadcastAsync("Đối tác khách sạn", "⚠️ ARI payload rỗng hoặc sai định dạng.");
                return;
            }

            var hotel = await _db.Hotels
                .AsNoTracking()
                .FirstOrDefaultAsync(h => h.ExternalHotelCode == dto.HotelCode);

            var hotelLabel = hotel?.Name ?? dto.HotelCode;
            if (hotel == null)
            {
                await _noti.AddAndBroadcastAsync("Đối tác khách sạn", $"⚠️ Không tìm thấy khách sạn mã {dto.HotelCode}");
                return;
            }

            // Lấy các RoomType thuộc khách sạn
            var roomTypeIds = await _db.RoomTypes
                .Where(r => r.HotelID == hotel.HotelID)
                .Select(r => r.RoomTypeID)
                .ToListAsync();

            if (roomTypeIds.Count == 0)
            {
                await _noti.AddAndBroadcastAsync("Đối tác khách sạn", $"⚠️ Khách sạn {hotelLabel} chưa có RoomType để ghi ARI.");
                return;
            }

            // Upsert theo từng ngày (Date), chia allotment đồng đều cho các RoomType nếu đối tác gửi tổng chung
            foreach (var item in dto.Items)
            {
                var d = item.Date.ToDateTime(TimeOnly.MinValue).Date;

                var perRoomType = 0;
                if (roomTypeIds.Count > 0)
                    perRoomType = Math.Max(0, item.Allotment / roomTypeIds.Count);

                foreach (var roomTypeId in roomTypeIds)
                {
                    var av = await _db.HotelAvailabilities
                        .FirstOrDefaultAsync(x =>
                            x.HotelID == hotel.HotelID &&
                            x.RoomTypeID == roomTypeId &&
                            x.Date == d);

                    var available = item.StopSell ? 0 : perRoomType;

                    if (av == null)
                    {
                        _db.HotelAvailabilities.Add(new HotelAvailability
                        {
                            HotelID = hotel.HotelID,
                            RoomTypeID = roomTypeId,
                            Date = d,
                            AvailableRooms = available,
                            Price = item.Price,
                            IsDeleted = false
                        });
                    }
                    else
                    {
                        av.AvailableRooms = available;
                        av.Price = item.Price;
                    }
                }
            }

            await _db.SaveChangesAsync();

            var count = dto.Items?.Count ?? 0;
            var minDate = dto.Items?.Count > 0 ? dto.Items.Min(i => i.Date) : (DateOnly?)null;
            var maxDate = dto.Items?.Count > 0 ? dto.Items.Max(i => i.Date) : (DateOnly?)null;
            var rangeText = (minDate.HasValue && maxDate.HasValue)
                ? $"{minDate:yyyy-MM-dd} → {maxDate:yyyy-MM-dd}"
                : "không xác định";
            var suffixId = string.IsNullOrWhiteSpace(eventId) ? "" : $" (EventId: {eventId})";

            await _noti.AddAndBroadcastAsync("Đối tác khách sạn",
                $"✅ ARI cập nhật {hotelLabel}: {count} bản ghi, {rangeText}.{suffixId}");
        }
    }
}

using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Integrations.PartnerHotel
{
    public interface IInventoryService
    {
        Task<bool> ReserveAsync(int hotelId, int roomTypeId, DateTime checkIn, DateTime checkOut, int rooms = 1);
        Task ReleaseAsync(int hotelId, int roomTypeId, DateTime checkIn, DateTime checkOut, int rooms = 1);
    }

    /// <summary>
    /// Quản lý tồn kho theo từng đêm (daily) trong bảng HotelAvailability.
    /// Yêu cầu model HotelAvailability có các cột: HotelID, RoomTypeID, Date, AvailableRooms, Price, RowVersion (concurrency), IsDeleted.
    /// </summary>
    public sealed class InventoryService : IInventoryService
    {
        private readonly AppDbContext _db;
        public InventoryService(AppDbContext db) => _db = db;

        private async Task<HotelAvailability> GetOrCreateDailyAvailabilityAsync(int hotelId, int roomTypeId, DateTime date)
        {
            var d = date.Date;

            var av = await _db.HotelAvailabilities
                .FirstOrDefaultAsync(x =>
                    x.HotelID == hotelId &&
                    x.RoomTypeID == roomTypeId &&
                    x.Date == d);

            if (av != null) return av;

            // Chưa có record cho ngày d → tạo mới với AvailableRooms = 0
            av = new HotelAvailability
            {
                HotelID = hotelId,
                RoomTypeID = roomTypeId,
                Date = d,
                AvailableRooms = 0,
                Price = 0m,
                IsDeleted = false
            };
            _db.HotelAvailabilities.Add(av);
            await _db.SaveChangesAsync();
            return av;
        }

        public async Task<bool> ReserveAsync(int hotelId, int roomTypeId, DateTime checkIn, DateTime checkOut, int rooms = 1)
        {
            if (rooms <= 0) rooms = 1;
            var ok = true;

            // duyệt từng đêm [d]
            for (var d = checkIn.Date; d < checkOut.Date; d = d.AddDays(1))
            {
                var av = await GetOrCreateDailyAvailabilityAsync(hotelId, roomTypeId, d);

                if (av.AvailableRooms < rooms)
                {
                    ok = false; // không đủ phòng ở đêm này
                    continue;
                }

                av.AvailableRooms -= rooms;
                // Concurrency: [Timestamp] RowVersion đã bật, EF sẽ kiểm tra tự động khi SaveChanges
            }

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                ok = false;
            }

            return ok;
        }

        public async Task ReleaseAsync(int hotelId, int roomTypeId, DateTime checkIn, DateTime checkOut, int rooms = 1)
        {
            if (rooms <= 0) rooms = 1;

            for (var d = checkIn.Date; d < checkOut.Date; d = d.AddDays(1))
            {
                var av = await GetOrCreateDailyAvailabilityAsync(hotelId, roomTypeId, d);
                av.AvailableRooms += rooms;
            }

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                // có thể retry/ghi log nếu muốn
            }
        }
    }
}

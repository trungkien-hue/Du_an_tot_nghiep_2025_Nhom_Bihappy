// File: Integrations/PartnerHotel/PartnerHotelSeed.cs
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using System.Text.Json;
using VirtualTravel.Data;
using VirtualTravel.Models;
using VirtualTravel.Options;

namespace VirtualTravel.Integrations.PartnerHotel
{
    /// <summary>
    /// Khai báo 1 bản đồ ánh xạ:
    /// - PartnerHotelCode/PartnerRoomTypeCode: mã từ đối tác (khách sạn gốc)
    /// - InternalHotelCode/InternalRoomTypeCode: mã nội bộ đang có trong DB
    /// </summary>
    public sealed record PartnerMapSpec(
        string PartnerHotelCode,
        string PartnerRoomTypeCode,
        string InternalHotelCode,
        string InternalRoomTypeCode
    );

    /// <summary>
    /// Cấu trúc seed nhiều đối tác qua JSON: { "partnerId": 2, "items": [ ... ] }
    /// </summary>
    public sealed record PartnerSeedFile(int PartnerId, List<PartnerMapSpec> Items);

    public static class PartnerHotelSeedV2Extensions
    {
        /// <summary>
        /// Seed mặc định: PartnerID lấy từ cấu hình (PartnerHotelOptions.PartnerId, mặc định 1)
        /// 6 roomtype: H001/RT1..RT6 → VT-HN-01/(STD, DLX, STE, FAM, SKY, PRE)
        /// </summary>
        public static async Task SeedDefaultMockMappingsAsync(
            this IHost host,
            CancellationToken ct = default)
        {
            var items = new[]
            {
                new PartnerMapSpec("H001","RT1","VT-HN-01","VT-HN-01-STD"),
                new PartnerMapSpec("H001","RT2","VT-HN-01","VT-HN-01-DLX"),
                new PartnerMapSpec("H001","RT3","VT-HN-01","VT-HN-01-STE"),
                new PartnerMapSpec("H001","RT4","VT-HN-01","VT-HN-01-FAM"),
                new PartnerMapSpec("H001","RT5","VT-HN-01","VT-HN-01-SKY"),
                new PartnerMapSpec("H001","RT6","VT-HN-01","VT-HN-01-PRE"),
            };
            await host.SeedPartnerMappingsV2Async(items, partnerIdOverride: null, ct);
        }

        /// <summary>
        /// Seed cho một PartnerID cụ thể (dùng khi có nhiều đối tác).
        /// </summary>
        public static async Task SeedMappingsForPartnerAsync(
            this IHost host,
            int partnerId,
            IEnumerable<PartnerMapSpec> items,
            CancellationToken ct = default)
        {
            await host.SeedPartnerMappingsV2Async(items, partnerIdOverride: partnerId, ct);
        }

        /// <summary>
        /// Seed nhiều đối tác từ thư mục JSON (mỗi file: *.partner.json, schema: PartnerSeedFile).
        /// </summary>
        public static async Task SeedAllPartnersFromJsonAsync(
            this IHost host,
            string folder,
            CancellationToken ct = default)
        {
            if (!Directory.Exists(folder))
            {
                Console.WriteLine($"[SeedV2] Folder not found: {folder} (skip)");
                return;
            }

            var files = Directory.GetFiles(folder, "*.partner.json", SearchOption.TopDirectoryOnly);
            foreach (var f in files)
            {
                try
                {
                    var json = await File.ReadAllTextAsync(f, ct);
                    var spec = JsonSerializer.Deserialize<PartnerSeedFile>(json, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
                    if (spec is null || spec.Items is null || spec.Items.Count == 0)
                    {
                        Console.WriteLine($"[SeedV2] Empty/invalid file: {Path.GetFileName(f)} (skip)");
                        continue;
                    }
                    Console.WriteLine($"[SeedV2] Seeding: {Path.GetFileName(f)} PartnerId={spec.PartnerId} Items={spec.Items.Count}");
                    await host.SeedPartnerMappingsV2Async(spec.Items, partnerIdOverride: spec.PartnerId, ct);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[SeedV2][ERROR] {Path.GetFileName(f)}: {ex.Message}");
                }
            }
        }

        /// <summary>
        /// Core: idempotent upsert PartnerHotelMaps & PartnerRoomTypeMaps.
        /// </summary>
        public static async Task SeedPartnerMappingsV2Async(
            this IHost host,
            IEnumerable<PartnerMapSpec> items,
            int? partnerIdOverride = null,
            CancellationToken ct = default)
        {
            using var scope = host.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var opt = scope.ServiceProvider.GetRequiredService<IOptions<PartnerHotelOptions>>().Value;

            var partnerId = partnerIdOverride ?? (opt.PartnerId <= 0 ? 1 : opt.PartnerId);

            int added = 0, updated = 0, skipped = 0;

            foreach (var it in items)
            {
                var (ok, isUpdate) = await UpsertAsync(db, partnerId, it, ct);
                if (!ok) { skipped++; continue; }
                if (isUpdate) updated++; else added++;
            }

            await db.SaveChangesAsync(ct);
            Console.WriteLine($"[SeedV2] PartnerId={partnerId} → Added={added}, Updated={updated}, Skipped={skipped}");
        }

        private static async Task<(bool ok, bool isUpdate)> UpsertAsync(
            AppDbContext db, int partnerId, PartnerMapSpec it, CancellationToken ct)
        {
            bool updated = false;

            // Tìm KS nội bộ bằng Hotels.ExternalHotelCode
            var hotel = await db.Hotels.AsNoTracking()
                .FirstOrDefaultAsync(h => h.ExternalHotelCode == it.InternalHotelCode, ct);
            if (hotel is null)
            {
                Console.WriteLine($"[SeedV2][WARN] InternalHotelCode='{it.InternalHotelCode}' not found. Skip {it.PartnerHotelCode}/{it.PartnerRoomTypeCode}.");
                return (false, updated);
            }

            // Tìm RoomType nội bộ đúng KS bằng RoomTypes.ExternalRoomTypeCode
            var room = await db.RoomTypes.AsNoTracking()
                .FirstOrDefaultAsync(r => r.HotelID == hotel.HotelID && r.ExternalRoomTypeCode == it.InternalRoomTypeCode, ct);
            if (room is null)
            {
                Console.WriteLine($"[SeedV2][WARN] Hotel '{it.InternalHotelCode}' has no RoomType '{it.InternalRoomTypeCode}'. Skip.");
                return (false, updated);
            }

            // Upsert HotelMap (lưu mã Đối tác vào ExternalHotelCode)
            var hotelMap = await db.PartnerHotelMaps
                .FirstOrDefaultAsync(m => m.PartnerID == partnerId && m.HotelID == hotel.HotelID, ct);
            if (hotelMap is null)
            {
                db.PartnerHotelMaps.Add(new PartnerHotelMap
                {
                    PartnerID = partnerId,
                    HotelID = hotel.HotelID,
                    ExternalHotelCode = it.PartnerHotelCode
                });
            }
            else if (!string.Equals(hotelMap.ExternalHotelCode, it.PartnerHotelCode, StringComparison.Ordinal))
            {
                hotelMap.ExternalHotelCode = it.PartnerHotelCode;
                updated = true;
            }

            // Upsert RoomTypeMap (lưu mã Đối tác vào ExternalRoomTypeCode)
            var roomMap = await db.PartnerRoomTypeMaps
                .FirstOrDefaultAsync(m => m.PartnerID == partnerId &&
                                          m.HotelID == hotel.HotelID &&
                                          m.RoomTypeID == room.RoomTypeID, ct);
            if (roomMap is null)
            {
                db.PartnerRoomTypeMaps.Add(new PartnerRoomTypeMap
                {
                    PartnerID = partnerId,
                    HotelID = hotel.HotelID,
                    RoomTypeID = room.RoomTypeID,
                    ExternalRoomTypeCode = it.PartnerRoomTypeCode
                });
            }
            else if (!string.Equals(roomMap.ExternalRoomTypeCode, it.PartnerRoomTypeCode, StringComparison.Ordinal))
            {
                roomMap.ExternalRoomTypeCode = it.PartnerRoomTypeCode;
                updated = true;
            }

            return (true, updated);
        }
    }
}

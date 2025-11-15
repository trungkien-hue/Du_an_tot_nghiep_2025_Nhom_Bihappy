// File: Data/AppDbContext.cs
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Models;

namespace VirtualTravel.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Hotel> Hotels { get; set; }
        public DbSet<Tour> Tours { get; set; }
        public DbSet<Booking> Bookings { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<ChatLog> ChatLogs { get; set; }
        public DbSet<HotelAvailability> HotelAvailabilities { get; set; }
        public DbSet<RoomType> RoomTypes { get; set; }
        public DbSet<TourAvailability> TourAvailabilities { get; set; }
        public DbSet<HotelImage> HotelImages { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<ReviewImage> ReviewImages { get; set; }

        // ===== ledger theo đêm =====
        public DbSet<BookingNight> BookingNights { get; set; }

        // ===== Đang dùng =====
        public DbSet<RatePlan> RatePlans { get; set; }
        public DbSet<ProcessedWebhook> ProcessedWebhooks { get; set; }
        public DbSet<WebhookLog> WebhookLogs { get; set; }

        // ===== Ánh xạ đối tác =====
        public DbSet<Partner> Partners { get; set; }
        public DbSet<PartnerHotelMap> PartnerHotelMaps { get; set; }
        public DbSet<PartnerRoomTypeMap> PartnerRoomTypeMaps { get; set; }
        public DbSet<PartnerRatePlanMap> PartnerRatePlanMaps { get; set; }
        public DbSet<UnmappedWebhook> UnmappedWebhooks { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Global filters
            modelBuilder.Entity<User>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Hotel>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Tour>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Booking>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<HotelAvailability>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<HotelImage>().HasQueryFilter(x => !x.IsDeleted);

            // ⚠️ An toàn null refs khi build model (NEW: thêm !)
            modelBuilder.Entity<RoomType>().HasQueryFilter(rt => !rt.Hotel!.IsDeleted);        // NEW
            modelBuilder.Entity<TourAvailability>().HasQueryFilter(ta => !ta.Tour!.IsDeleted); // NEW

            // Decimal precision
            modelBuilder.Entity<Booking>().Property(x => x.Price).HasPrecision(18, 2);
            modelBuilder.Entity<Booking>().Property(x => x.TotalPrice).HasPrecision(18, 2);
            modelBuilder.Entity<Booking>().Property(x => x.PenaltyAmount).HasPrecision(18, 2);

            modelBuilder.Entity<Hotel>().Property(x => x.PricePerNight).HasPrecision(18, 2);
            modelBuilder.Entity<HotelAvailability>().Property(x => x.Price).HasPrecision(18, 2);

            modelBuilder.Entity<Tour>().Property(x => x.Price).HasPrecision(18, 2);
            modelBuilder.Entity<Tour>().Property(x => x.PriceAdult).HasPrecision(18, 2);
            modelBuilder.Entity<Tour>().Property(x => x.PriceChild).HasPrecision(18, 2);
            modelBuilder.Entity<Tour>().Property(x => x.DepositPercent).HasPrecision(5, 2);
            modelBuilder.Entity<TourAvailability>().Property(x => x.PriceAdult).HasPrecision(18, 2);
            modelBuilder.Entity<TourAvailability>().Property(x => x.PriceChild).HasPrecision(18, 2);

            modelBuilder.Entity<RatePlan>().Property(x => x.BasePrice).HasPrecision(18, 2);

            // NEW: RoomType.TotalRooms default = 0 (tránh NULL/không set)
            modelBuilder.Entity<RoomType>()
                .Property(rt => rt.TotalRooms)
                .HasDefaultValue(0); // NEW

            // Booking relationships (như bạn đang có)
            modelBuilder.Entity(typeof(Booking)).HasOne(typeof(User), nameof(Booking.User))
                .WithMany(nameof(User.Bookings))
                .HasForeignKey(nameof(Booking.UserID));

            modelBuilder.Entity(typeof(Booking)).HasOne(typeof(Hotel), nameof(Booking.Hotel))
                .WithMany(nameof(Hotel.Bookings))
                .HasForeignKey(nameof(Booking.HotelID));

            modelBuilder.Entity(typeof(Booking)).HasOne(typeof(Tour), nameof(Booking.Tour))
                .WithMany(nameof(Tour.Bookings))
                .HasForeignKey(nameof(Booking.TourID));

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.HotelAvailability)
                .WithMany()
                .HasForeignKey(b => b.HotelAvailabilityID)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.TourAvailability)
                .WithMany()
                .HasForeignKey(b => b.TourAvailabilityID)
                .OnDelete(DeleteBehavior.Restrict);

            // ===== BookingNight mapping =====
            modelBuilder.Entity<BookingNight>(e =>
            {
                e.HasKey(x => x.BookingNightID);
                e.Property(x => x.UnitPrice).HasPrecision(18, 2);
                e.Property(x => x.PenaltyAmount).HasPrecision(18, 2);
                e.HasIndex(x => new { x.BookingID, x.NightDate }).IsUnique();

                e.HasOne(x => x.Booking)
                 .WithMany() // (tuỳ bạn muốn thêm ICollection<BookingNight> vào Booking)
                 .HasForeignKey(x => x.BookingID)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // ===== Hotel ↔ HotelAvailability (daily) =====
            modelBuilder.Entity<Hotel>()
               .HasMany(h => h.AvailableDates)
               .WithOne(a => a.Hotel)
               .HasForeignKey(a => a.HotelID)
               .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<HotelAvailability>()
               .HasOne(ha => ha.RoomType)
               .WithMany(rt => rt.HotelAvailabilities)
               .HasForeignKey(ha => ha.RoomTypeID)
               .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<HotelAvailability>()
                .HasIndex(x => new { x.HotelID, x.RoomTypeID, x.Date })
                .IsUnique();

            // ===== (các mapping khác: Review, Images, Partner maps, Webhook...) giữ nguyên =====
        }
    }
}

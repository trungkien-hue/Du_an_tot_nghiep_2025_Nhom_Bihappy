using Microsoft.EntityFrameworkCore;
using VirtualTravel.Models;

namespace VirtualTravel.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // ======== DB SETS ========
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

        // RoomType images
        public DbSet<RoomTypeImage> RoomTypeImages { get; set; }

        // Amenities many-to-many
        public DbSet<Amenity> Amenities { get; set; }
        public DbSet<RoomTypeAmenity> RoomTypeAmenities { get; set; }

        // Booking night ledger
        public DbSet<BookingNight> BookingNights { get; set; }

        // Partner mapping / OTA
        public DbSet<RatePlan> RatePlans { get; set; }
        public DbSet<ProcessedWebhook> ProcessedWebhooks { get; set; }
        public DbSet<WebhookLog> WebhookLogs { get; set; }
        public DbSet<Partner> Partners { get; set; }
        public DbSet<PartnerHotelMap> PartnerHotelMaps { get; set; }
        public DbSet<PartnerRoomTypeMap> PartnerRoomTypeMaps { get; set; }
        public DbSet<PartnerRatePlanMap> PartnerRatePlanMaps { get; set; }
        public DbSet<UnmappedWebhook> UnmappedWebhooks { get; set; }

        // ⭐ NEW: RoomTypeVoucher
        public DbSet<RoomTypeVoucher> RoomTypeVouchers { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ============================================
            // GLOBAL QUERY FILTER (ẩn record IsDeleted)
            // ============================================
            modelBuilder.Entity<User>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Hotel>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Tour>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<Booking>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<HotelAvailability>().HasQueryFilter(x => !x.IsDeleted);
            modelBuilder.Entity<HotelImage>().HasQueryFilter(x => !x.IsDeleted);

            modelBuilder.Entity<RoomType>()
                .HasQueryFilter(rt => !rt.Hotel!.IsDeleted);

            modelBuilder.Entity<TourAvailability>()
                .HasQueryFilter(ta => !ta.Tour!.IsDeleted);

            // ============================================
            // DECIMAL PRECISION
            // ============================================
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

            // ⭐ NEW: Voucher precision (percent / amount)
            modelBuilder.Entity<RoomTypeVoucher>().Property(x => x.DiscountPercent).HasPrecision(5, 2);
            modelBuilder.Entity<RoomTypeVoucher>().Property(x => x.DiscountAmount).HasPrecision(18, 2);

            // RoomType default rooms
            modelBuilder.Entity<RoomType>()
                .Property(rt => rt.TotalRooms)
                .HasDefaultValue(0);

            // ============================================
            // RELATIONSHIPS Booking
            // ============================================
            modelBuilder.Entity<Booking>()
                .HasOne(b => b.User)
                .WithMany(u => u.Bookings)
                .HasForeignKey(b => b.UserID);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Hotel)
                .WithMany(h => h.Bookings)
                .HasForeignKey(b => b.HotelID);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Tour)
                .WithMany(t => t.Bookings)
                .HasForeignKey(b => b.TourID);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.HotelAvailability)
                .WithMany()
                .HasForeignKey(b => b.HotelAvailabilityID)
                .OnDelete(DeleteBehavior.Restrict);

            // ============================================
            // BOOKING NIGHT
            // ============================================
            modelBuilder.Entity<BookingNight>(e =>
            {
                e.HasKey(x => x.BookingNightID);
                e.Property(x => x.UnitPrice).HasPrecision(18, 2);
                e.Property(x => x.PenaltyAmount).HasPrecision(18, 2);

                e.HasIndex(x => new { x.BookingID, x.NightDate }).IsUnique();

                e.HasOne(x => x.Booking)
                    .WithMany()
                    .HasForeignKey(x => x.BookingID)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ============================================
            // HOTEL ↔ AVAILABILITY
            // ============================================
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

            // ============================================
            // ROOMTYPE IMAGES
            // ============================================
            modelBuilder.Entity<RoomTypeImage>(e =>
            {
                e.HasOne(x => x.RoomType)
                    .WithMany(rt => rt.Images)
                    .HasForeignKey(x => x.RoomTypeID);

                e.HasQueryFilter(x => !x.IsDeleted);
            });

            // ============================================
            // ROOMTYPE AMENITIES
            // ============================================
            modelBuilder.Entity<RoomTypeAmenity>(e =>
            {
                e.HasKey(x => new { x.RoomTypeID, x.AmenityID });

                e.HasOne(x => x.RoomType)
                    .WithMany(rt => rt.Amenities)
                    .HasForeignKey(x => x.RoomTypeID);

                e.HasOne(x => x.Amenity)
                    .WithMany(a => a.RoomTypeAmenities)
                    .HasForeignKey(x => x.AmenityID);
            });

            // ============================================
            // ⭐ NEW: ROOMTYPE VOUCHERS
            // ============================================
            modelBuilder.Entity<RoomTypeVoucher>(e =>
            {
                e.HasOne(v => v.RoomType)
                    .WithMany()
                    .HasForeignKey(v => v.RoomTypeID)
                    .OnDelete(DeleteBehavior.Cascade);

                e.HasQueryFilter(v => !v.IsDeleted);
            });
        }
    }
}

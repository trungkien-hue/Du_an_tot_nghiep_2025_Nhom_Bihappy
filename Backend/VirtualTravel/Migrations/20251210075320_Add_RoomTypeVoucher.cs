using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VirtualTravel.Migrations
{
    /// <inheritdoc />
    public partial class Add_RoomTypeVoucher : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Bookings_TourAvailabilities_TourAvailabilityID",
                table: "Bookings");

            migrationBuilder.CreateTable(
                name: "RoomTypeVouchers",
                columns: table => new
                {
                    RoomTypeVoucherID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoomTypeID = table.Column<int>(type: "int", nullable: false),
                    HotelID = table.Column<int>(type: "int", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DiscountPercent = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: true),
                    DiscountAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    FromDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ToDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoomTypeVouchers", x => x.RoomTypeVoucherID);
                    table.ForeignKey(
                        name: "FK_RoomTypeVouchers_RoomType_RoomTypeID",
                        column: x => x.RoomTypeID,
                        principalTable: "RoomType",
                        principalColumn: "RoomTypeID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RoomTypeVouchers_RoomTypeID",
                table: "RoomTypeVouchers",
                column: "RoomTypeID");

            migrationBuilder.AddForeignKey(
                name: "FK_Bookings_TourAvailabilities_TourAvailabilityID",
                table: "Bookings",
                column: "TourAvailabilityID",
                principalTable: "TourAvailabilities",
                principalColumn: "TourAvailabilityID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Bookings_TourAvailabilities_TourAvailabilityID",
                table: "Bookings");

            migrationBuilder.DropTable(
                name: "RoomTypeVouchers");

            migrationBuilder.AddForeignKey(
                name: "FK_Bookings_TourAvailabilities_TourAvailabilityID",
                table: "Bookings",
                column: "TourAvailabilityID",
                principalTable: "TourAvailabilities",
                principalColumn: "TourAvailabilityID",
                onDelete: ReferentialAction.Restrict);
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VirtualTravel.Migrations
{
    /// <inheritdoc />
    public partial class AddTotalRoomsDefaultAndBookingNight : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RatePlan_RoomType_RoomTypeID",
                table: "RatePlan");

            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_Hotels_HotelID",
                table: "Reviews");

            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_Tours_TourID",
                table: "Reviews");

            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_Users_UserID",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_WebhookLogs_Provider_EventType_ReceivedUtc",
                table: "WebhookLogs");

            migrationBuilder.DropIndex(
                name: "IX_UnmappedWebhooks_PartnerID_EventType_ExternalBookingId_CreatedAt",
                table: "UnmappedWebhooks");

            migrationBuilder.DropIndex(
                name: "IX_RatePlan_HotelID_ExternalRatePlanCode",
                table: "RatePlan");

            migrationBuilder.DropIndex(
                name: "IX_Partners_IsActive_CreatedAt",
                table: "Partners");

            migrationBuilder.DropIndex(
                name: "IX_PartnerRoomTypeMaps_PartnerID_HotelID_ExternalRoomTypeCode",
                table: "PartnerRoomTypeMaps");

            migrationBuilder.DropIndex(
                name: "IX_PartnerRatePlanMaps_PartnerID_HotelID_ExternalRatePlanCode",
                table: "PartnerRatePlanMaps");

            migrationBuilder.DropIndex(
                name: "IX_PartnerHotelMaps_PartnerID_ExternalHotelCode",
                table: "PartnerHotelMaps");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_CreatedAt",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_TargetRole_IsRead_CreatedAt",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_TargetUserID_IsRead_CreatedAt",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_HotelImages_HotelID_IsPrimary",
                table: "HotelImages");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "UnmappedWebhooks",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "ExternalRoomTypeCode",
                table: "UnmappedWebhooks",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ExternalRatePlanCode",
                table: "UnmappedWebhooks",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ExternalHotelCode",
                table: "UnmappedWebhooks",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ExternalBookingId",
                table: "UnmappedWebhooks",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "EventType",
                table: "UnmappedWebhooks",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AddColumn<int>(
                name: "TotalRooms",
                table: "RoomType",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<string>(
                name: "ExternalRatePlanCode",
                table: "RatePlan",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "WebhookSecret",
                table: "Partners",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Partners",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "ApiBase",
                table: "Partners",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "Notifications",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldDefaultValue: "BookingCreated");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Notifications",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);

            migrationBuilder.AlterColumn<string>(
                name: "TargetRole",
                table: "Notifications",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Message",
                table: "Notifications",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000);

            migrationBuilder.AlterColumn<string>(
                name: "Tag",
                table: "HotelImages",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ImageUrl",
                table: "HotelImages",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(1024)",
                oldMaxLength: 1024);

            migrationBuilder.AlterColumn<string>(
                name: "Caption",
                table: "HotelImages",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255,
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAt",
                table: "Bookings",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckedInAt",
                table: "Bookings",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CheckedOutAt",
                table: "Bookings",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Hours",
                table: "Bookings",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsHourly",
                table: "Bookings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "PenaltyAmount",
                table: "Bookings",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "BookingNights",
                columns: table => new
                {
                    BookingNightID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BookingID = table.Column<int>(type: "int", nullable: false),
                    NightDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    State = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ConsumedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReleasedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PenalizedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PenaltyAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    InventoryAdjusted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookingNights", x => x.BookingNightID);
                    table.ForeignKey(
                        name: "FK_BookingNights_Bookings_BookingID",
                        column: x => x.BookingID,
                        principalTable: "Bookings",
                        principalColumn: "BookingID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RatePlan_HotelID",
                table: "RatePlan",
                column: "HotelID");

            migrationBuilder.CreateIndex(
                name: "IX_HotelImages_HotelID",
                table: "HotelImages",
                column: "HotelID");

            migrationBuilder.CreateIndex(
                name: "IX_BookingNights_BookingID_NightDate",
                table: "BookingNights",
                columns: new[] { "BookingID", "NightDate" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_RatePlan_RoomType_RoomTypeID",
                table: "RatePlan",
                column: "RoomTypeID",
                principalTable: "RoomType",
                principalColumn: "RoomTypeID");

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_Hotels_HotelID",
                table: "Reviews",
                column: "HotelID",
                principalTable: "Hotels",
                principalColumn: "HotelID");

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_Tours_TourID",
                table: "Reviews",
                column: "TourID",
                principalTable: "Tours",
                principalColumn: "TourID");

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_Users_UserID",
                table: "Reviews",
                column: "UserID",
                principalTable: "Users",
                principalColumn: "UserID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RatePlan_RoomType_RoomTypeID",
                table: "RatePlan");

            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_Hotels_HotelID",
                table: "Reviews");

            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_Tours_TourID",
                table: "Reviews");

            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_Users_UserID",
                table: "Reviews");

            migrationBuilder.DropTable(
                name: "BookingNights");

            migrationBuilder.DropIndex(
                name: "IX_RatePlan_HotelID",
                table: "RatePlan");

            migrationBuilder.DropIndex(
                name: "IX_HotelImages_HotelID",
                table: "HotelImages");

            migrationBuilder.DropColumn(
                name: "TotalRooms",
                table: "RoomType");

            migrationBuilder.DropColumn(
                name: "CancelledAt",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "CheckedInAt",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "CheckedOutAt",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "Hours",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "IsHourly",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "PenaltyAmount",
                table: "Bookings");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "UnmappedWebhooks",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "ExternalRoomTypeCode",
                table: "UnmappedWebhooks",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ExternalRatePlanCode",
                table: "UnmappedWebhooks",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ExternalHotelCode",
                table: "UnmappedWebhooks",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ExternalBookingId",
                table: "UnmappedWebhooks",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "EventType",
                table: "UnmappedWebhooks",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "ExternalRatePlanCode",
                table: "RatePlan",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "WebhookSecret",
                table: "Partners",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Partners",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "ApiBase",
                table: "Partners",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Type",
                table: "Notifications",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "BookingCreated",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "Notifications",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "TargetRole",
                table: "Notifications",
                type: "nvarchar(450)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Message",
                table: "Notifications",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Tag",
                table: "HotelImages",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ImageUrl",
                table: "HotelImages",
                type: "nvarchar(1024)",
                maxLength: 1024,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Caption",
                table: "HotelImages",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WebhookLogs_Provider_EventType_ReceivedUtc",
                table: "WebhookLogs",
                columns: new[] { "Provider", "EventType", "ReceivedUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_UnmappedWebhooks_PartnerID_EventType_ExternalBookingId_CreatedAt",
                table: "UnmappedWebhooks",
                columns: new[] { "PartnerID", "EventType", "ExternalBookingId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_RatePlan_HotelID_ExternalRatePlanCode",
                table: "RatePlan",
                columns: new[] { "HotelID", "ExternalRatePlanCode" },
                filter: "[ExternalRatePlanCode] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Partners_IsActive_CreatedAt",
                table: "Partners",
                columns: new[] { "IsActive", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PartnerRoomTypeMaps_PartnerID_HotelID_ExternalRoomTypeCode",
                table: "PartnerRoomTypeMaps",
                columns: new[] { "PartnerID", "HotelID", "ExternalRoomTypeCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PartnerRatePlanMaps_PartnerID_HotelID_ExternalRatePlanCode",
                table: "PartnerRatePlanMaps",
                columns: new[] { "PartnerID", "HotelID", "ExternalRatePlanCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PartnerHotelMaps_PartnerID_ExternalHotelCode",
                table: "PartnerHotelMaps",
                columns: new[] { "PartnerID", "ExternalHotelCode" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_CreatedAt",
                table: "Notifications",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_TargetRole_IsRead_CreatedAt",
                table: "Notifications",
                columns: new[] { "TargetRole", "IsRead", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_TargetUserID_IsRead_CreatedAt",
                table: "Notifications",
                columns: new[] { "TargetUserID", "IsRead", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_HotelImages_HotelID_IsPrimary",
                table: "HotelImages",
                columns: new[] { "HotelID", "IsPrimary" },
                unique: true,
                filter: "[IsPrimary] = 1");

            migrationBuilder.AddForeignKey(
                name: "FK_RatePlan_RoomType_RoomTypeID",
                table: "RatePlan",
                column: "RoomTypeID",
                principalTable: "RoomType",
                principalColumn: "RoomTypeID",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_Hotels_HotelID",
                table: "Reviews",
                column: "HotelID",
                principalTable: "Hotels",
                principalColumn: "HotelID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_Tours_TourID",
                table: "Reviews",
                column: "TourID",
                principalTable: "Tours",
                principalColumn: "TourID",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_Users_UserID",
                table: "Reviews",
                column: "UserID",
                principalTable: "Users",
                principalColumn: "UserID",
                onDelete: ReferentialAction.SetNull);
        }
    }
}

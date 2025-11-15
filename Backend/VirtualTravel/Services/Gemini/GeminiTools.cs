namespace VirtualTravel.Services.Gemini
{
    public static class GeminiTools
    {
        public static object[] GetFunctionDeclarations() => new object[] {
            new {
                name = "search_tours",
                description = "Tìm tour trong DB theo tiêu chí. LUÔN trả dữ liệu thật từ DB.",
                parameters = new {
                    type = "OBJECT",
                    properties = new {
                        // 👇 Nhấn mạnh: keyword dùng cho TÊN TOUR / địa danh / mô tả
                        keyword = new {
                            type = "STRING",
                            description = "Từ khóa (tên tour/địa danh/mô tả). Ví dụ: 'Tour Hạ Long', 'Sapa 2 ngày 1 đêm', 'Đà Nẵng', 'Tour Đà Nẵng - Hội An 4N3Đ'."
                        },
                        // 👇 location chỉ dùng khi muốn lọc CỨNG theo tỉnh/thành
                        location = new {
                            type = "STRING",
                            description = "Địa điểm cần lọc cứng (tỉnh/thành). Nếu người dùng chỉ gõ tên tour hay địa danh chung chung, hãy dùng 'keyword' thay vì 'location'."
                        },
                        minPrice = new { type = "NUMBER", description = "Giá min (VND)" },
                        maxPrice = new { type = "NUMBER", description = "Giá max (VND)" },
                        durationDays = new { type = "INTEGER" },
                        people = new { type = "INTEGER" },
                        minRating = new { type = "NUMBER" },
                        page = new { type = "INTEGER" },
                        pageSize = new { type = "INTEGER" }
                    }
                }
            },
            new {
                name = "search_hotels",
                description = "Tìm khách sạn. ƯU TIÊN dùng Availability.Price (kể cả khi không truyền ngày, nếu có availability).",
                parameters = new {
                    type = "OBJECT",
                    properties = new {
                        hotelID = new { type = "INTEGER", description = "Nếu có => trả chi tiết kèm RoomTypes & Availabilities" },
                        keyword = new { type = "STRING" },
                        location = new { type = "STRING" },
                        minPrice = new { type = "NUMBER", description = "Giá min (VND), ưu tiên Availability.Price" },
                        maxPrice = new { type = "NUMBER", description = "Giá max (VND), ưu tiên Availability.Price" },
                        checkin = new { type = "STRING", description = "ISO: 2025-10-15T00:00:00" },
                        checkout = new { type = "STRING" },
                        minRating = new { type = "NUMBER" },
                        page = new { type = "INTEGER" },
                        pageSize = new { type = "INTEGER" }
                    }
                }
            }
        };
    }
}

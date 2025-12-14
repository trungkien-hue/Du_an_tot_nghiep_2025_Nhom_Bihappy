using System;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using VirtualTravel.Options;
using VirtualTravel.Services.Tours;
using VirtualTravel.Services.Hotels;

namespace VirtualTravel.Services.Gemini
{
    // Kết quả (TEXT + tên function + DATA cho UI)
    public class ChatWithDataResult
    {
        public string Text { get; set; } = "";
        public string Function { get; set; } = ""; // "search_tours" | "search_hotels" | "suggestions"
        public object? Data { get; set; }
    }

    public class GeminiClient : IGeminiClient
    {
        private readonly HttpClient _http;
        private readonly ILogger<GeminiClient> _logger;
        private readonly GeminiOptions _opt;
        private readonly TourSearchService _tourSearch;
        private readonly HotelSearchService _hotelSearch;

        // 🔹 Đoạn nhắc thông tin khách hàng – sẽ gắn vào cuối mọi câu trả lời
        private const string CustomerInfoHint =
            "Để mình hỗ trợ **đặt/giữ chỗ** nhanh hơn, bạn vui lòng cho mình xin các thông tin sau:\n" +
            "• Họ tên người liên hệ\n" +
            "• Số điện thoại / Zalo\n" +
            "• Số lượng khách (người lớn / trẻ em)\n" +
            "• Ngày đi (hoặc ngày nhận phòng / trả phòng)\n" +
            "• Ngân sách dự kiến (nếu có).\n\n" +
            "Bạn cứ gửi theo dạng gạch đầu dòng đơn giản, mình sẽ tư vấn phương án phù hợp nhất nhé 😊";

        public GeminiClient(
            HttpClient http,
            IOptions<GeminiOptions> opt,
            ILogger<GeminiClient> logger,
            TourSearchService tourSearch,
            HotelSearchService hotelSearch)
        {
            _http = http;
            _logger = logger;
            _opt = opt.Value;
            _tourSearch = tourSearch;
            _hotelSearch = hotelSearch;
        }

        public async Task<string> GenerateTextAsync(string prompt, string? modelOverride = null)
        {
            var model = string.IsNullOrWhiteSpace(modelOverride) ? _opt.Model : modelOverride;
            var url = $"v1beta/models/{model}:generateContent";
            var body = new { contents = new[] { new { parts = new object[] { new { text = prompt } } } } };

            using var req = new HttpRequestMessage(HttpMethod.Post, url)
            { Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json") };

            var res = await _http.SendAsync(req);
            var text = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini error {Status}: {Body}", res.StatusCode, text);
                throw new HttpRequestException($"Gemini error {(int)res.StatusCode}: {text}");
            }

            using var doc = JsonDocument.Parse(text);
            return doc.RootElement.GetProperty("candidates")[0]
                                  .GetProperty("content")
                                  .GetProperty("parts")[0]
                                  .GetProperty("text")
                                  .GetString() ?? string.Empty;
        }

        public async IAsyncEnumerable<string> StreamGenerateTextAsync(string prompt, string? modelOverride = null)
        {
            var model = string.IsNullOrWhiteSpace(modelOverride) ? _opt.Model : modelOverride;
            var url = $"v1beta/models/{model}:streamGenerateContent";
            var body = new { contents = new[] { new { parts = new object[] { new { text = prompt } } } } };

            using var req = new HttpRequestMessage(HttpMethod.Post, url)
            { Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json") };

            using var res = await _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead);
            res.EnsureSuccessStatusCode();

            using var stream = await res.Content.ReadAsStreamAsync();
            using var reader = new StreamReader(stream);
            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync();
                if (string.IsNullOrWhiteSpace(line)) continue;
                yield return line;
            }
        }

        public async Task<string> DescribeImageFromUrlAsync(string imageUrl, string prompt, string? modelOverride = null)
        {
            var model = string.IsNullOrWhiteSpace(modelOverride) ? _opt.Model : modelOverride;
            var url = $"v1beta/models/{model}:generateContent";

            var raw = await _http.GetByteArrayAsync(imageUrl);
            var b64 = Convert.ToBase64String(raw);

            var body = new
            {
                contents = new[] {
                    new {
                        parts = new object[] {
                            new { text = prompt },
                            new { inlineData = new { mimeType = "image/jpeg", data = b64 } }
                        }
                    }
                }
            };

            using var req = new HttpRequestMessage(HttpMethod.Post, url)
            { Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json") };

            var res = await _http.SendAsync(req);
            var text = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini vision error {Status}: {Body}", res.StatusCode, text);
                throw new HttpRequestException($"Gemini vision error {(int)res.StatusCode}: {text}");
            }

            using var doc = JsonDocument.Parse(text);
            return doc.RootElement.GetProperty("candidates")[0]
                                  .GetProperty("content")
                                  .GetProperty("parts")[0]
                                  .GetProperty("text")
                                  .GetString() ?? string.Empty;
        }

        // Tương thích cũ
        public async Task<string> ChatToursAsync(string userMessage)
            => await ChatTravelAsync(userMessage);

        // STRICT (DB-only) – trả TEXT
        public async Task<string> ChatTravelAsync(string userMessage)
        {
            var r = await ChatTravelWithDataAsync(userMessage);
            return r.Text;
        }

        // ====== ⭐ STRICT (DB-only) – TEXT + DATA (có chào hỏi, gợi ý & fallback khi mơ hồ) ======
        public async Task<ChatWithDataResult> ChatTravelWithDataAsync(string userMessage)
        {
            var model = _opt.Model;
            var url = $"v1beta/models/{model}:generateContent";

            // ROUND 1: cấu hình đúng systemInstruction + ÉP gọi function
            var firstPayload = new
            {
                systemInstruction = new
                {
                    role = "user",
                    parts = new[] { new { text =
                        "Bạn là Trợ lý Du lịch VirtualTravel. " +
                        "CHỈ trả lời dựa trên dữ liệu từ tool `search_tours` và `search_hotels` (DB-only, không bịa). " +
                        "Khi người dùng hỏi có nhắc tới tour/khách sạn, địa danh, giá, ngày, HÃY GỌI tool phù hợp để lấy dữ liệu. " +
                        "Luôn mở đầu bằng lời chào; khi đủ dữ liệu thì trình bày kết quả rõ ràng (tối đa 5 mục) và kết bằng lời chúc." } }
                },
                contents = new object[] {
                    new { role = "user", parts = new[] { new { text = userMessage } } }
                },
                tools = new[] { new { functionDeclarations = GeminiTools.GetFunctionDeclarations() } },
                toolConfig = new { functionCallingConfig = new { mode = "ANY" } } // ép model gọi function khi phù hợp
            };

            using var req1 = new HttpRequestMessage(HttpMethod.Post, url)
            { Content = new StringContent(JsonSerializer.Serialize(firstPayload), Encoding.UTF8, "application/json") };
            using var res1 = await _http.SendAsync(req1);
            var text1 = await res1.Content.ReadAsStringAsync();

            if (!res1.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini (round1) error {Status}: {Body}", res1.StatusCode, text1);
                throw new HttpRequestException($"Gemini error {(int)res1.StatusCode}: {text1}");
            }

            var firstJson = JsonNode.Parse(text1);
            var parts = firstJson?["candidates"]?[0]?["content"]?["parts"]?.AsArray();
            var funcCall = parts?.FirstOrDefault(p => p?["functionCall"] != null)?["functionCall"];

            // ❗Không gọi function => Fallback quyết liệt: tự thử search theo tên (Keyword = toàn bộ câu)
            if (funcCall == null)
            {
                // 2.1. Thử TOUR
                var toursTry = await _tourSearch.SearchAsync(new TourSearchRequest
                {
                    Keyword = userMessage,
                    Page = 1,
                    PageSize = 5
                });
                var toursNode = JsonNode.Parse(JsonSerializer.Serialize(toursTry));
                var toursTotal = toursNode?["total"]?.GetValue<int>() ?? 0;
                if (toursTotal > 0)
                {
                    var text =
                        "Xin chào 👋 Mình đã tìm thấy một số **tour** khớp từ khoá bạn vừa nhập. " +
                        "Bạn có thể bổ sung địa điểm hoặc khoảng giá để lọc chính xác hơn. " +
                        "Chúc bạn có hành trình tuyệt vời!";

                    return new ChatWithDataResult
                    {
                        Function = "search_tours",
                        Data = toursTry,
                        Text = text + "\n\n" + CustomerInfoHint
                    };
                }

                // 2.2. Thử HOTEL
                var hotelsTry = await _hotelSearch.SearchAsync(new HotelSearchRequest
                {
                    Keyword = userMessage,
                    Page = 1,
                    PageSize = 5
                });
                var hotelsNode = JsonNode.Parse(JsonSerializer.Serialize(hotelsTry));
                var hotelsTotal = hotelsNode?["total"]?.GetValue<int>() ?? 0;
                if (hotelsTotal > 0)
                {
                    var text =
                        "Xin chào 👋 Mình đã tìm thấy một số **khách sạn** khớp từ khoá bạn vừa nhập. " +
                        "Bạn có thể thêm ngày nhận/trả phòng hoặc khoảng giá để kết quả chính xác hơn. " +
                        "Chúc bạn có hành trình tuyệt vời!";

                    return new ChatWithDataResult
                    {
                        Function = "search_hotels",
                        Data = hotelsTry,
                        Text = text + "\n\n" + CustomerInfoHint
                    };
                }

                // 2.3. Không có gì => trả suggestions
                var suggestData = await BuildSuggestionPayloadAsync();
                var suggestText =
                    "Xin chào 👋\n" +
                    "Mình có thể giúp bạn tìm **tour** hoặc **khách sạn** dựa trên dữ liệu trong hệ thống.\n\n" +
                    "Bạn có thể nhập tự nhiên (không phân biệt hoa/thường, có/không dấu), ví dụ:\n" +
                    "• tim khach san da lat duoi 800k checkin 2025-11-20 checkout 2025-11-22\n" +
                    "• tour ha long 3 ngay duoi 3tr\n" +
                    "• khach san da nang gan bien checkin 2025-12-01 den 2025-12-03\n" +
                    "• tour sapa 2 ngay 1 dem duoi 2tr5\n\n" +
                    "Mình đã gửi kèm vài gợi ý và một số tour/khách sạn nổi bật để bạn tham khảo. " +
                    "Chúc bạn có hành trình tuyệt vời!";

                return new ChatWithDataResult
                {
                    Function = "suggestions",
                    Data = suggestData,
                    Text = suggestText + "\n\n" + CustomerInfoHint
                };
            }

            var name = funcCall?["name"]?.GetValue<string>() ?? "";
            var args = funcCall?["args"]?.AsObject();
            _logger.LogInformation("🔧 function = {Name}, args = {Args}", name, args?.ToJsonString() ?? "<null>");

            // Gọi DB theo function
            object dbResult;
            if (name == "search_tours")
            {
                var rq = new TourSearchRequest
                {
                    Keyword = args?["keyword"]?.GetValue<string>(),
                    Location = args?["location"]?.GetValue<string>(),
                    MinPrice = args?["minPrice"]?.GetValue<decimal?>(),
                    MaxPrice = args?["maxPrice"]?.GetValue<decimal?>(),
                    DurationDays = args?["durationDays"]?.GetValue<int?>(),
                    MinRating = args?["minRating"]?.GetValue<double?>(),
                    Page = Math.Max(1, args?["page"]?.GetValue<int?>() ?? 1),
                    PageSize = Math.Clamp(args?["pageSize"]?.GetValue<int?>() ?? 5, 1, 20)
                };
                dbResult = await _tourSearch.SearchAsync(rq);
            }
            else if (name == "search_hotels")
            {
                DateTime? checkin = null, checkout = null;
                if (DateTime.TryParse(args?["checkin"]?.GetValue<string>(), out var ci)) checkin = ci;
                if (DateTime.TryParse(args?["checkout"]?.GetValue<string>(), out var co)) checkout = co;

                // ƯU TIÊN availability.Price; vẫn đọc minPricePerNight/maxPricePerNight để tương thích ngược
                decimal? minPrice =
                    args?["minPrice"]?.GetValue<decimal?>() ??
                    args?["minPricePerNight"]?.GetValue<decimal?>();

                decimal? maxPrice =
                    args?["maxPrice"]?.GetValue<decimal?>() ??
                    args?["maxPricePerNight"]?.GetValue<decimal?>();

                var rq = new HotelSearchRequest
                {
                    HotelID = args?["hotelID"]?.GetValue<int?>(),
                    Keyword = args?["keyword"]?.GetValue<string>(),
                    Location = args?["location"]?.GetValue<string>(),
                    MinPrice = minPrice,     // << gửi MinPrice/MaxPrice cho service
                    MaxPrice = maxPrice,
                    Checkin = checkin,
                    Checkout = checkout,
                    MinRating = args?["minRating"]?.GetValue<double?>(),
                    Page = Math.Max(1, args?["page"]?.GetValue<int?>() ?? 1),
                    PageSize = Math.Clamp(args?["pageSize"]?.GetValue<int?>() ?? 5, 1, 20),
                };

                dbResult = await _hotelSearch.SearchAsync(rq);
            }
            else
            {
                // Thông báo + nhắc info khách
                return new ChatWithDataResult
                {
                    Text = "Chỉ hỗ trợ function `search_tours` và `search_hotels`.\n\n" + CustomerInfoHint,
                    Function = "",
                    Data = null
                };
            }

            // ROUND 2: để model viết tóm tắt (có chào hỏi + chi tiết + lời kết)
            var toolRound = new
            {
                contents = new object[] {
                    new { role = "user", parts = new[] { new { text =
                        "Bạn là Trợ lý Du lịch VirtualTravel. Viết tóm tắt: chào hỏi, liệt kê chi tiết (tối đa 5), và lời chúc cuối." } } },
                    new { role = "user", parts = new[] { new { text = userMessage } } },
                    new { role = "model", parts = new[] { new { functionCall = new { name, args } } } },
                    new { role = "tool",  parts = new[] { new { functionResponse = new { name, response = dbResult } } } }
                }
            };

            using var req2 = new HttpRequestMessage(HttpMethod.Post, url)
            { Content = new StringContent(JsonSerializer.Serialize(toolRound), Encoding.UTF8, "application/json") };
            using var res2 = await _http.SendAsync(req2);
            var text2 = await res2.Content.ReadAsStringAsync();

            if (!res2.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini (round2) error {Status}: {Body}", res2.StatusCode, text2);
                throw new HttpRequestException($"Gemini error {(int)res2.StatusCode}: {text2}");
            }

            var finalJson = JsonNode.Parse(text2);
            var finalText = finalJson?["candidates"]?[0]?["content"]?["parts"]?[0]?["text"]?.GetValue<string>() ?? string.Empty;

            // 🔹 Luôn gắn thêm đoạn nhắc thông tin khách
            var finalWithInfo = string.IsNullOrWhiteSpace(finalText)
                ? CustomerInfoHint
                : finalText + "\n\n" + CustomerInfoHint;

            return new ChatWithDataResult
            {
                Text = finalWithInfo,
                Function = name,
                Data = dbResult
            };
        }

        // ====== Payload gợi ý khi câu hỏi mơ hồ ======
        private async Task<object> BuildSuggestionPayloadAsync()
        {
            // Lấy nhanh 3 tour + 3 khách sạn đầu tiên (DB-only)
            var tours = await _tourSearch.SearchAsync(new TourSearchRequest
            {
                Page = 1,
                PageSize = 3
            });

            var hotels = await _hotelSearch.SearchAsync(new HotelSearchRequest
            {
                Page = 1,
                PageSize = 3
            });

            // Một vài ví dụ prompt gợi ý
            var prompts = new[]
            {
                "Tìm khách sạn Đà Nẵng gần biển, giá dưới 1.000.000, checkin 2025-12-01, checkout 2025-12-03",
                "Tour Hạ Long 3 ngày dưới 3.000.000",
                "Khách sạn Đà Lạt rẻ, checkin 2025-11-20",
                "Tour Sapa 2 ngày 1 đêm cho 2 người dưới 2.500.000",
            };

            return new
            {
                examples = prompts,
                topTours = tours,   // { total, items }
                topHotels = hotels  // { total, items }
            };
        }
    }
}

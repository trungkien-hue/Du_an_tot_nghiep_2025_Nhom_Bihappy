using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;
using VirtualTravel.Options;
using VirtualTravel.Services.Gemini;
using Microsoft.Extensions.Options;

namespace VirtualTravel.Controllers
{
    [ApiController]
    [Route("api/ai/assistant")]
    public class AssistantController : ControllerBase
    {
        private readonly IHttpClientFactory _http;
        private readonly IGeminiClient _gemini;
        private readonly GeminiOptions _opt;
        private readonly string _model;

        public AssistantController(IHttpClientFactory http, IGeminiClient gemini, IOptions<GeminiOptions> opt)
        {
            _http = http;
            _gemini = gemini;
            _opt = opt.Value;
            _model = _opt.Model ?? "gemini-2.5-flash";
        }

        public record UserQuery(string Prompt);

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] UserQuery req)
        {
            // 1) Khai báo "tools" để Gemini có thể gọi hàm
            var tools = new
            {
                functionDeclarations = new object[]
                {
                    new {
                        name = "searchTours",
                        description = "Tìm tour theo địa điểm, tháng/khung ngày, ngân sách, số người.",
                        parameters = new {
                            type = "OBJECT",
                            properties = new {
                                destination = new { type = "STRING", description = "Địa điểm, ví dụ: Đà Nẵng" },
                                month = new { type = "INTEGER", description = "Tháng (1-12), tuỳ chọn", nullable = true },
                                budgetVnd = new { type = "NUMBER", description = "Ngân sách tối đa (VND), tuỳ chọn", nullable = true },
                                adults = new { type = "INTEGER", description = "Số người lớn, tuỳ chọn", nullable = true }
                            },
                            required = new [] { "destination" }
                        }
                    },
                    new {
                        name = "checkHotelAvailability",
                        description = "Kiểm tra phòng còn trống theo khách sạn, ngày nhận/trả.",
                        parameters = new {
                            type = "OBJECT",
                            properties = new {
                                hotelId = new { type = "INTEGER" },
                                checkIn = new { type = "STRING", description = "yyyy-MM-dd" },
                                checkOut = new { type = "STRING", description = "yyyy-MM-dd" },
                                rooms = new { type = "INTEGER", nullable = true }
                            },
                            required = new [] { "hotelId", "checkIn", "checkOut" }
                        }
                    }
                }
            };

            var systemPrompt =
@"Bạn là trợ lý du lịch của VirtualTravel. 
- Khi cần dữ liệu thật (tour/hotel), hãy gọi đúng hàm đã khai báo với tham số ít nhất và rõ ràng.
- Sau khi nhận kết quả hàm, hãy tóm tắt gọn gàng, nêu giá, điểm nổi bật, gợi ý tiếp theo.";

            // 2) Gửi sang Gemini với tools
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent";

            var body = new
            {
                tools = new[] { tools },
                toolConfig = new
                {
                    functionCallingConfig = new
                    {
                        mode = "AUTO"
                    }
                },
                contents = new object[]
                {
                    new {
                        role = "user",
                        parts = new object[] { new { text = systemPrompt + "\n\n" + req.Prompt } }
                    }
                }
            };

            var http = _http.CreateClient("Gemini"); // đã có BaseAddress
            using var reqMsg = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
            };
            var res = await http.SendAsync(reqMsg);
            var json = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode) return StatusCode((int)res.StatusCode, json);

            // 3) Kiểm tra xem có functionCall không
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var candidates = root.GetProperty("candidates");
            var parts = candidates[0].GetProperty("content").GetProperty("parts");

            // Tìm functionCall trong các parts
            JsonElement? fnCall = null;
            foreach (var p in parts.EnumerateArray())
            {
                if (p.TryGetProperty("functionCall", out var fc))
                {
                    fnCall = fc;
                    break;
                }
            }

            if (fnCall is null)
            {
                // Không cần gọi hàm -> trả text thẳng
                var text = parts[0].GetProperty("text").GetString() ?? "";
                return Ok(new { text });
            }

            var fnName = fnCall.Value.GetProperty("name").GetString()!;
            var argsObj = fnCall.Value.GetProperty("args");

            // 4) Thực thi hàm tương ứng
            object toolResult;
            switch (fnName)
            {
                case "searchTours":
                    {
                        var destination = argsObj.GetProperty("destination").GetString() ?? "";
                        int? month = argsObj.TryGetProperty("month", out var m) && m.ValueKind == JsonValueKind.Number
                                    ? m.GetInt32() : null;
                        double? budget = argsObj.TryGetProperty("budgetVnd", out var b) && b.ValueKind == JsonValueKind.Number
                                    ? b.GetDouble() : null;
                        int? adults = argsObj.TryGetProperty("adults", out var a) && a.ValueKind == JsonValueKind.Number
                                    ? a.GetInt32() : null;

                        // Gọi API nội bộ của bạn. Ví dụ:
                        // GET /api/tours/search?destination=...&month=...&maxPrice=...&adults=...
                        var myApi = _http.CreateClient();
                        var urlSearch = new StringBuilder("http://localhost:5059/api/tours/search?");
                        urlSearch.Append($"destination={Uri.EscapeDataString(destination)}");
                        if (month.HasValue) urlSearch.Append($"&month={month.Value}");
                        if (budget.HasValue) urlSearch.Append($"&maxPrice={budget.Value}");
                        if (adults.HasValue) urlSearch.Append($"&adults={adults.Value}");

                        var data = await myApi.GetStringAsync(urlSearch.ToString());
                        toolResult = new { tool = fnName, destination, month, budgetVnd = budget, adults, data = JsonDocument.Parse(data).RootElement };
                        break;
                    }
                case "checkHotelAvailability":
                    {
                        var hotelId = argsObj.GetProperty("hotelId").GetInt32();
                        var checkIn = argsObj.GetProperty("checkIn").GetString()!;
                        var checkOut = argsObj.GetProperty("checkOut").GetString()!;
                        int? rooms = argsObj.TryGetProperty("rooms", out var r) && r.ValueKind == JsonValueKind.Number ? r.GetInt32() : null;

                        // Ví dụ gọi nội bộ:
                        // GET /api/hotels/{id}/availability?checkIn=...&checkOut=...&rooms=...
                        var myApi = _http.CreateClient();
                        var urlAvail = new StringBuilder($"http://localhost:5059/api/hotels/{hotelId}/availability?");
                        urlAvail.Append($"checkIn={Uri.EscapeDataString(checkIn)}&checkOut={Uri.EscapeDataString(checkOut)}");
                        if (rooms.HasValue) urlAvail.Append($"&rooms={rooms.Value}");

                        var data = await myApi.GetStringAsync(urlAvail.ToString());
                        toolResult = new { tool = fnName, hotelId, checkIn, checkOut, rooms, data = JsonDocument.Parse(data).RootElement };
                        break;
                    }
                default:
                    toolResult = new { tool = fnName, error = "Function not implemented." };
                    break;
            }

            // 5) Gửi "tool result" lại cho Gemini để nó soạn câu trả lời đẹp
            var toolResponse = new
            {
                contents = new object[]
                {
                    new {
                        role = "user",
                        parts = new object[] { new { text = req.Prompt } }
                    },
                    new {
                        role = "model",
                        parts = new object[] {
                            new {
                                functionCall = new {
                                    name = fnName,
                                    args = argsObj
                                }
                            }
                        }
                    },
                    new {
                        role = "tool",
                        parts = new object[] {
                            new {
                                functionResponse = new {
                                    name = fnName,
                                    response = toolResult
                                }
                            }
                        }
                    }
                }
            };

            using var req2 = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(toolResponse), Encoding.UTF8, "application/json")
            };
            var res2 = await http.SendAsync(req2);
            var json2 = await res2.Content.ReadAsStringAsync();
            if (!res2.IsSuccessStatusCode) return StatusCode((int)res2.StatusCode, json2);

            using var doc2 = JsonDocument.Parse(json2);
            var outText = doc2.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? "";

            return Ok(new { text = outText, tool = fnName });
        }
    }
}

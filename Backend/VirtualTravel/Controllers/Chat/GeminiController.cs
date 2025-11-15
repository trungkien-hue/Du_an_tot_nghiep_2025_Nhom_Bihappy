using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using VirtualTravel.Services.Gemini;

namespace VirtualTravel.Controllers.Chat
{
    [ApiController]
    [Route("api/ai")]
    public class GeminiController : ControllerBase
    {
        private readonly IGeminiClient _gemini;
        public GeminiController(IGeminiClient gemini) => _gemini = gemini;

        public record GeminiChatRequest(string Prompt);

        // === JSON: Tours + Hotels (STRICT, DB-only) – trả cả text + data để UI render ảnh/cards
        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] GeminiChatRequest req)
        {
            var result = await _gemini.ChatTravelWithDataAsync(req.Prompt ?? "");
            return Ok(new
            {
                text = result.Text,
                function = result.Function, // "search_tours" | "search_hotels"
                data = result.Data           // { total, items } hoặc hotel detail
            });
        }

        // === STREAM (SSE): chỉ stream text (giữ nguyên nếu bạn vẫn muốn hiệu ứng gõ chữ)
        [HttpPost("chat/stream")]
        public async Task Stream([FromBody] GeminiChatRequest req)
        {
            Response.Headers.ContentType = "text/event-stream";
            Response.Headers.CacheControl = "no-cache";
            Response.Headers["X-Accel-Buffering"] = "no";
            Response.Headers["Connection"] = "keep-alive";

            await Response.WriteAsync(": ping\n\n");
            await Response.Body.FlushAsync();

            var full = await _gemini.ChatTravelAsync(req.Prompt ?? ""); // chỉ text
            foreach (var chunk in Chunk(full, 120))
            {
                await Response.WriteAsync($"data: {JsonSerializer.Serialize(chunk)}\n\n");
                await Response.Body.FlushAsync();
            }
            await Response.WriteAsync("data: [DONE]\n\n");
            await Response.Body.FlushAsync();

            static IEnumerable<string> Chunk(string s, int size)
            {
                for (int i = 0; i < s.Length; i += size)
                    yield return s.Substring(i, Math.Min(size, s.Length - i));
            }
        }

        // Vision (không ảnh hưởng tới chat strict)
        [HttpPost("vision")]
        public async Task<IActionResult> Vision(
            [FromQuery] string url,
            [FromQuery] string prompt = "Mô tả ảnh cho marketing du lịch.")
        {
            var text = await _gemini.DescribeImageFromUrlAsync(url, prompt);
            return Ok(new { text });
        }
    }
}

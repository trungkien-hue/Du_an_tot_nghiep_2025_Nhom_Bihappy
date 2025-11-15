using Microsoft.AspNetCore.Mvc;
using VirtualTravel.Services.Gemini;

namespace VirtualTravel.Controllers.Chat
{
    [ApiController]
    [Route("api/ai/tours")]
    public class GeminiTourController : ControllerBase
    {
        private readonly IGeminiClient _gemini;
        public GeminiTourController(IGeminiClient gemini) => _gemini = gemini;

        public record ChatReq(string Message);

        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] ChatReq req)
        {
            var text = await _gemini.ChatToursAsync(req.Message ?? "");
            return Ok(new { text });
        }
    }
}

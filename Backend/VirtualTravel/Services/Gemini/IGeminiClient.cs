using System.Collections.Generic;
using System.Threading.Tasks;
using VirtualTravel.Models;

namespace VirtualTravel.Services.Gemini
{
    public interface IGeminiClient
    {
        Task<string> GenerateTextAsync(string prompt, string? modelOverride = null);
        IAsyncEnumerable<string> StreamGenerateTextAsync(string prompt, string? modelOverride = null);
        Task<string> DescribeImageFromUrlAsync(string imageUrl, string prompt, string? modelOverride = null);

        // Tương thích cũ:
        Task<string> ChatToursAsync(string userMessage);

        // Mới: Tour + Hotel (STRICT, DB-only)
        Task<string> ChatTravelAsync(string userMessage);

        // Trả TEXT + DATA (để UI render cards)
        Task<ChatWithDataResult> ChatTravelWithDataAsync(string userMessage);
    }
}

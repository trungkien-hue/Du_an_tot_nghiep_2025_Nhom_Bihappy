using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using VirtualTravel.Data;
using VirtualTravel.Models;

namespace VirtualTravel.Integrations.PartnerHotel
{
    // ===== Verify HMAC (X-Timestamp, X-Signature) =====
    public interface IWebhookVerifier
    {
        bool Verify(string rawBody, string signatureHeader, string timestampHeader, string secret);
    }

    public sealed class HmacWebhookVerifier : IWebhookVerifier
    {
        public bool Verify(string rawBody, string signatureHeader, string timestampHeader, string secret)
        {
            if (string.IsNullOrWhiteSpace(signatureHeader) || string.IsNullOrWhiteSpace(timestampHeader)) return false;
            var payload = $"{timestampHeader}.{rawBody}";
            using var h = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var hex = Convert.ToHexString(h.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
            return string.Equals(hex, signatureHeader.Trim(), StringComparison.OrdinalIgnoreCase);
        }
    }

    // ===== Idempotency chống xử lý trùng =====
    public interface IIdempotencyStore
    {
        Task<bool> ExistsAsync(string id);
        Task RememberAsync(string id);
    }

    public sealed class EfIdempotencyStore : IIdempotencyStore
    {
        private readonly AppDbContext _db;
        public EfIdempotencyStore(AppDbContext db) => _db = db;

        public async Task<bool> ExistsAsync(string id)
            => await _db.ProcessedWebhooks.AsNoTracking().AnyAsync(x => x.Id == id);

        public async Task RememberAsync(string id)
        {
            _db.ProcessedWebhooks.Add(new ProcessedWebhook { Id = id });
            await _db.SaveChangesAsync();
        }
    }

    // ===== Ghi log webhook vào DB =====
    public interface IWebhookLogger
    {
        Task LogAsync(WebhookLog log);
    }

    public sealed class EfWebhookLogger : IWebhookLogger
    {
        private readonly AppDbContext _db;
        public EfWebhookLogger(AppDbContext db) => _db = db;

        public async Task LogAsync(WebhookLog log)
        {
            if (string.IsNullOrWhiteSpace(log.Provider)) log.Provider = "hotel";
            if (log.ReceivedUtc == default) log.ReceivedUtc = DateTime.UtcNow;

            _db.WebhookLogs.Add(log);
            await _db.SaveChangesAsync();
        }
    }
}

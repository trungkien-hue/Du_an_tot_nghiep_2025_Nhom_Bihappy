using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace VirtualTravel.Integrations.PartnerHotel
{
    public interface IPartnerHotelClient
    {
        Task<PartnerCreateBookingResponse> CreateBookingAsync(PartnerCreateBookingRequest req, CancellationToken ct = default);
        Task<PartnerGenericResponse> ModifyBookingAsync(string externalBookingId, PartnerModifyBookingRequest req, CancellationToken ct = default);
        Task<PartnerGenericResponse> CancelBookingAsync(string externalBookingId, string reason, CancellationToken ct = default);
        Task<PartnerAriResponse> GetAriAsync(string externalHotelCode, DateOnly from, DateOnly to, CancellationToken ct = default);
    }

    public sealed record PartnerCreateBookingRequest(
        string HotelCode, string RoomTypeCode, string RatePlanCode,
        DateOnly CheckIn, DateOnly CheckOut, int Adults, int Children,
        string CustomerName, string CustomerPhone, string CustomerEmail
    );

    public sealed record PartnerModifyBookingRequest(
        DateOnly CheckIn, DateOnly CheckOut, int Adults, int Children,
        string? RatePlanCode = null, string? RoomTypeCode = null
    );

    public sealed record PartnerCreateBookingResponse(
        string ExternalBookingId, string Status,
        string PolicySnapshotJson, string PriceBreakdownJson
    );

    public sealed record PartnerGenericResponse(string Status = "OK");

    public sealed record AriItem(DateOnly Date, int Allotment, decimal Price, bool StopSell, int? MinLos = null, int? MaxLos = null, bool? Cta = null, bool? Ctd = null);
    public sealed record PartnerAriResponse(List<AriItem> Items);

    public sealed class PartnerHotelClient : IPartnerHotelClient
    {
        private readonly HttpClient _http;
        private readonly VirtualTravel.Options.PartnerHotelOptions _opt;

        public PartnerHotelClient(HttpClient http, IOptions<VirtualTravel.Options.PartnerHotelOptions> opt)
        {
            _http = http;
            _opt = opt.Value;

            if (_http.BaseAddress is null && !string.IsNullOrWhiteSpace(_opt.BaseUrl))
                _http.BaseAddress = new Uri(_opt.BaseUrl);

            if (!_http.DefaultRequestHeaders.Contains("X-API-KEY") && !string.IsNullOrWhiteSpace(_opt.ApiKey))
                _http.DefaultRequestHeaders.Add("X-API-KEY", _opt.ApiKey);
        }

        public async Task<PartnerCreateBookingResponse> CreateBookingAsync(PartnerCreateBookingRequest req, CancellationToken ct = default)
        {
            var payload = new
            {
                req.HotelCode,
                req.RoomTypeCode,
                req.RatePlanCode,
                CheckIn = req.CheckIn.ToString("yyyy-MM-dd"),
                CheckOut = req.CheckOut.ToString("yyyy-MM-dd"),
                req.Adults,
                req.Children,
                req.CustomerName,
                req.CustomerPhone,
                req.CustomerEmail
            };

            using var res = await _http.PostAsJsonAsync("/api/bookings", payload, ct);
            res.EnsureSuccessStatusCode();

            return await res.Content.ReadFromJsonAsync<PartnerCreateBookingResponse>(cancellationToken: ct)
                   ?? throw new InvalidOperationException("Empty response from partner /api/bookings");
        }

        public async Task<PartnerGenericResponse> ModifyBookingAsync(string id, PartnerModifyBookingRequest req, CancellationToken ct = default)
        {
            var payload = new
            {
                CheckIn = req.CheckIn.ToString("yyyy-MM-dd"),
                CheckOut = req.CheckOut.ToString("yyyy-MM-dd"),
                req.Adults,
                req.Children,
                req.RatePlanCode,
                req.RoomTypeCode
            };

            using var res = await _http.PutAsJsonAsync($"/api/bookings/{id}", payload, ct);
            res.EnsureSuccessStatusCode();

            return await res.Content.ReadFromJsonAsync<PartnerGenericResponse>(cancellationToken: ct)
                   ?? new PartnerGenericResponse();
        }

        public async Task<PartnerGenericResponse> CancelBookingAsync(string id, string reason, CancellationToken ct = default)
        {
            using var res = await _http.PostAsJsonAsync($"/api/bookings/{id}/cancel", new { reason }, ct);
            res.EnsureSuccessStatusCode();

            return await res.Content.ReadFromJsonAsync<PartnerGenericResponse>(cancellationToken: ct)
                   ?? new PartnerGenericResponse();
        }

        public async Task<PartnerAriResponse> GetAriAsync(string hotelCode, DateOnly from, DateOnly to, CancellationToken ct = default)
        {
            var url = $"/api/ari?hotelCode={Uri.EscapeDataString(hotelCode)}&from={from:yyyy-MM-dd}&to={to:yyyy-MM-dd}";
            using var res = await _http.GetAsync(url, ct);
            res.EnsureSuccessStatusCode();

            return await res.Content.ReadFromJsonAsync<PartnerAriResponse>(cancellationToken: ct)
                   ?? new PartnerAriResponse(new());
        }
    }
}

using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using VirtualTravel.Options;

namespace VirtualTravel.Services.Gemini
{
    public class GeminiAuthHandler : DelegatingHandler
    {
        private readonly string _apiKey;

        public GeminiAuthHandler(IOptions<GeminiOptions> opt)
        {
            _apiKey = opt.Value.ApiKey ?? string.Empty;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (!request.Headers.Contains("x-goog-api-key"))
            {
                request.Headers.Add("x-goog-api-key", _apiKey);
            }
            return base.SendAsync(request, cancellationToken);
        }
    }
}

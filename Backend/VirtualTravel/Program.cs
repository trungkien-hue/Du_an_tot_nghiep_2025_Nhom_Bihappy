// File: Program.cs
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.IO;
using System.Text;
using System.Text.Json.Serialization;
using VirtualTravel.Data;
using VirtualTravel.Hubs;
using VirtualTravel.Integrations.PartnerHotel;
using VirtualTravel.Models;
using VirtualTravel.Options;
using VirtualTravel.Services;
using VirtualTravel.Services.Gemini;
using VirtualTravel.Services.Hotels;
using VirtualTravel.Services.Notifications;
using VirtualTravel.Services.Tours;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        o.JsonSerializerOptions.PropertyNamingPolicy = null;
        o.JsonSerializerOptions.DictionaryKeyPolicy = null;
        o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.CustomSchemaIds(t => (t.FullName ?? t.Name).Replace("+", "."));
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập token: Bearer {JWT}"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement {
        { new OpenApiSecurityScheme{ Reference = new OpenApiReference{ Type = ReferenceType.SecurityScheme, Id = "Bearer"}}, Array.Empty<string>() }
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(builder.Configuration["Jwt:Key"])),
        ClockSkew = TimeSpan.Zero
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var path = context.HttpContext.Request.Path;
            bool isHub =
                path.StartsWithSegments("/hubs/notifications") ||
                path.StartsWithSegments("/hubs/partner-notifications");

            if (isHub)
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken))
                    context.Token = accessToken;

                if (string.IsNullOrEmpty(context.Token))
                {
                    var auth = context.Request.Headers.Authorization.ToString();
                    if (!string.IsNullOrWhiteSpace(auth) &&
                        auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                    {
                        context.Token = auth.Substring("Bearer ".Length).Trim();
                    }
                }
            }
            return Task.CompletedTask;
        }
    };
});

// ✅ Cập nhật CORS để cho phép Vercel và các nguồn khác truy cập
builder.Services.AddCors(options =>
{
    options.AddPolicy("Dev", policy =>
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod()
    // .AllowCredentials() // Lưu ý: Không dùng AllowCredentials chung với AllowAnyOrigin
    );
});

builder.Services.AddSignalR();
builder.Services.Configure<GeminiOptions>(builder.Configuration.GetSection("Gemini"));
builder.Services.AddTransient<GeminiAuthHandler>();
builder.Services.AddScoped<TourSearchService>();
builder.Services.AddScoped<HotelSearchService>();
builder.Services.AddHttpClient<IGeminiClient, GeminiClient>(client =>
{
    client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
})
.AddHttpMessageHandler<GeminiAuthHandler>();

builder.Services.AddHostedService<OldBookingCleanupService>();
builder.Services.Configure<PartnerHotelOptions>(builder.Configuration.GetSection("PartnerHotel"));

builder.Services.AddHttpClient<IPartnerHotelClient, PartnerHotelClient>((sp, http) =>
{
    var opt = sp.GetRequiredService<IOptions<PartnerHotelOptions>>().Value;
    if (!string.IsNullOrWhiteSpace(opt.BaseUrl))
        http.BaseAddress = new Uri(opt.BaseUrl);
    if (!string.IsNullOrWhiteSpace(opt.ApiKey))
        http.DefaultRequestHeaders.Add("X-API-KEY", opt.ApiKey);
});

builder.Services.AddScoped<IWebhookVerifier, HmacWebhookVerifier>();
builder.Services.AddScoped<IIdempotencyStore, EfIdempotencyStore>();
builder.Services.AddScoped<IWebhookLogger, EfWebhookLogger>();
builder.Services.AddScoped<IBookingSyncService, BookingSyncService>();
builder.Services.AddScoped<IAriSyncService, AriSyncService>();
builder.Services.AddScoped<INotificationPublisher, NotificationPublisher>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IPartnerNotificationPublisher, PartnerNotificationPublisher>();

builder.Services.Configure<PartnerWebhookOptions>(builder.Configuration.GetSection("PartnerWebhook"));

builder.Services.AddHttpClient("partner-webhook", (sp, http) =>
{
    var opts = sp.GetRequiredService<IOptions<PartnerWebhookOptions>>().Value;
    if (!string.IsNullOrWhiteSpace(opts.BaseUrl))
        http.BaseAddress = new Uri(opts.BaseUrl);
    var timeout = opts.TimeoutSeconds <= 0 ? 5 : opts.TimeoutSeconds;
    http.Timeout = TimeSpan.FromSeconds(timeout);
});

builder.Services.AddSingleton<IPartnerWebhookSender>(sp =>
{
    var flag = sp.GetRequiredService<IOptions<PartnerWebhookOptions>>().Value;
    if (!flag.Enabled) return new NoOpPartnerWebhookSender();

    var db = sp.GetRequiredService<AppDbContext>();
    var http = sp.GetRequiredService<IHttpClientFactory>().CreateClient("partner-webhook");
    var partnerHotelOpts = sp.GetRequiredService<IOptions<PartnerHotelOptions>>();
    return new PartnerWebhookSender(db, http, partnerHotelOpts);
});

var app = builder.Build();

// ✅ Đưa Swagger ra ngoài if (IsDevelopment) để chạy trên Server
app.UseDeveloperExceptionPage();
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "VirtualTravel API V1");
    c.RoutePrefix = string.Empty; // Truy cập link gốc là ra Swagger ngay
});

await app.SeedDefaultMockMappingsAsync();
var seedFolder = Path.Combine(app.Environment.ContentRootPath, "Seed", "Partners");
await app.SeedAllPartnersFromJsonAsync(seedFolder);

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(builder.Environment.WebRootPath, "uploads")),
    RequestPath = "/uploads"
});

app.UseCors("Dev");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications").RequireCors("Dev");
app.MapHub<PartnerNotificationHub>("/hubs/partner-notifications").RequireCors("Dev");

app.Run();

public class OldBookingCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<OldBookingCleanupService> _logger;

    public OldBookingCleanupService(IServiceScopeFactory scopeFactory, ILogger<OldBookingCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await Cleanup(stoppingToken); }
            catch (Exception ex) { _logger.LogError(ex, "Cleanup old bookings failed"); }
            try { await Task.Delay(TimeSpan.FromHours(6), stoppingToken); }
            catch (TaskCanceledException) { }
        }
    }

    private async Task Cleanup(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var cutoff = DateTime.UtcNow.AddDays(-15);
        var olds = await db.Bookings.Where(b => !b.IsDeleted && b.BookingDate < cutoff).ToListAsync(ct);
        if (olds.Count == 0) return;
        db.Bookings.RemoveRange(olds);
        await db.SaveChangesAsync(ct);
        _logger.LogInformation("Deleted {Count} bookings older than {Cutoff}", olds.Count, cutoff);
    }
}
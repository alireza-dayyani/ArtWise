using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ArtWise.Data;
using ArtWise.Data.Repositories;
using ArtWise.Domain.DTOs;
using ArtWise.Domain.Entities;
using ArtWise.Domain.Interfaces;
using ArtWise.Services;

var builder = WebApplication.CreateBuilder(args);

// Load .env file
var envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");
if (File.Exists(envPath))
{
    foreach (var line in File.ReadAllLines(envPath))
    {
        var parts = line.Split('=', 2);
        if (parts.Length == 2)
        {
            Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim().Trim('"'));
        }
    }
}

// Database — SQL Server (appsettings ConnectionStrings:DefaultConnection)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IArtworkRepository, ArtworkRepository>();
builder.Services.AddScoped<IMessageRepository, MessageRepository>();
builder.Services.AddScoped<IAppConfigRepository, AppConfigRepository>();

// AI services — Composite picks Gemini when key exists (env or DB), else Fallback
builder.Services.AddScoped<IGeminiApiKeyProvider, GeminiApiKeyProvider>();
builder.Services.AddScoped<GeminiService>();
builder.Services.AddScoped<FallbackAiService>();
builder.Services.AddScoped<IAiService, CompositeAiService>();
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

builder.Services.AddHttpClient();
builder.Services.AddEndpointsApiExplorer();

builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
});

var app = builder.Build();

var passwordHasher = app.Services.GetRequiredService<IPasswordHasher<User>>();

// Auto-migrate / seed
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbSchemaUpgrader.UpgradeAsync(db, connectionString);

    var userRepo = scope.ServiceProvider.GetRequiredService<IUserRepository>();
    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();

    async Task EnsureUserAsync(string email, string name, string password)
    {
        var existing = await userRepo.GetByEmailAsync(email);
        if (existing is not null)
        {
            return;
        }

        var user = new User { Email = email, Name = name };
        user.PasswordHash = hasher.HashPassword(user, password);
        await userRepo.CreateAsync(user);
    }

    await EnsureUserAsync("default@artwise.app", "Default User", "password123");
    await EnsureUserAsync("admin@artwise.com", "Super Admin", "admin");
    await EnsureUserAsync("eleanor.whistler@gallery.com", "Eleanor Whistler", "password123");
}

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseStaticFiles();
app.UseRouting();

var api = app.MapGroup("/api");

var superAdminKey = builder.Configuration["SuperAdmin:ApiKey"]
    ?? Environment.GetEnvironmentVariable("SUPERADMIN_API_KEY")
    ?? "superadmin-secret-key";

static bool IsAdminEmail(string email) =>
    email.Equals("admin@artwise.com", StringComparison.OrdinalIgnoreCase)
    || email.Equals("admin", StringComparison.OrdinalIgnoreCase);

static object MapUser(User user) => new
{
    id = user.Id.ToString(),
    email = user.Email,
    name = user.Name,
    avatarUrl = user.AvatarUrl,
    createdAt = user.CreatedAt.ToString("O"),
    isAdmin = IsAdminEmail(user.Email)
};

static object MapArtwork(Artwork a) => new
{
    id = a.Id.ToString(),
    userId = a.UserId.ToString(),
    imageUrl = a.ImageUrl,
    title = a.Title,
    artist = a.Artist,
    year = a.Year,
    style = a.Style,
    summary = a.Summary,
    detailedAnalysis = a.DetailedAnalysis,
    historicalContext = a.HistoricalContext,
    stylisticInfluences = a.StylisticInfluences,
    interpretation = a.Interpretation,
    categories = a.Categories,
    tags = a.Tags,
    createdAt = a.CreatedAt.ToString("O")
};

static object MapMessage(Message m) => new
{
    id = m.Id.ToString(),
    artworkId = m.ArtworkId.ToString(),
    threadId = m.ArtworkId.ToString(),
    role = m.Role,
    content = m.Content,
    createdAt = m.CreatedAt.ToString("O")
};

async Task<User?> ResolveUserAsync(HttpRequest request, IUserRepository userRepo)
{
    var userIdHeader = request.Headers["X-User-Id"].FirstOrDefault();
    if (!string.IsNullOrEmpty(userIdHeader) && Guid.TryParse(userIdHeader, out var userId))
    {
        return await userRepo.GetByIdAsync(userId);
    }

    var emailHeader = request.Headers["X-User-Email"].FirstOrDefault();
    if (!string.IsNullOrEmpty(emailHeader))
    {
        return await userRepo.GetByEmailAsync(emailHeader);
    }

    return null;
}

PasswordVerificationResult VerifyPassword(IPasswordHasher<User> hasher, User user, string password)
{
    if (string.IsNullOrEmpty(user.PasswordHash))
        return PasswordVerificationResult.Failed;

    return hasher.VerifyHashedPassword(user, user.PasswordHash, password);
}

// ==================== AUTH ====================

api.MapPost("/auth/register", async (RegisterRequest request, IUserRepository userRepo, IPasswordHasher<User> hasher) =>
{
    if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest(new { error = "Email, password, and name are required." });

    if (request.Password.Length < 6)
        return Results.BadRequest(new { error = "Password must be at least 6 characters." });

    var email = request.Email.Trim().ToLowerInvariant();
    if (await userRepo.EmailExistsAsync(email))
        return Results.Conflict(new { error = "An account with this email already exists." });

    var user = new User
    {
        Email = email,
        Name = request.Name.Trim()
    };
    user.PasswordHash = hasher.HashPassword(user, request.Password);
    user = await userRepo.CreateAsync(user);

    return Results.Ok(MapUser(user));
});

api.MapPost("/auth/login", async (LoginRequest request, IUserRepository userRepo, IPasswordHasher<User> hasher) =>
{
    if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        return Results.BadRequest(new { error = "Email and password are required." });

    var email = request.Email.Trim().ToLowerInvariant();
    // Allow "admin" shorthand
    if (email == "admin")
        email = "admin@artwise.com";

    var user = await userRepo.GetByEmailAsync(email);
    if (user is null)
        return Results.Json(new { error = "Invalid email or password." }, statusCode: 401);

    var result = VerifyPassword(hasher, user, request.Password);
    if (result == PasswordVerificationResult.Failed)
        return Results.Json(new { error = "Invalid email or password. Try admin/admin for SuperAdmin." }, statusCode: 401);

    if (result == PasswordVerificationResult.SuccessRehashNeeded)
    {
        user.PasswordHash = hasher.HashPassword(user, request.Password);
        await userRepo.UpdateAsync(user);
    }

    return Results.Ok(MapUser(user));
});

api.MapPost("/auth/demo", async (IUserRepository userRepo) =>
{
    var user = await userRepo.GetByEmailAsync("eleanor.whistler@gallery.com");
    if (user is null)
        return Results.NotFound(new { error = "Demo user not seeded." });

    return Results.Ok(MapUser(user));
});

api.MapGet("/debug-env", async (IGeminiApiKeyProvider keyProvider) =>
{
    var key = await keyProvider.GetApiKeyAsync();
    return Results.Ok(new
    {
        gemini_key_exists = !string.IsNullOrEmpty(key),
        gemini_key_length = key?.Length ?? 0,
        gemini_key_prefix = key?.Length >= 4 ? key.Substring(0, 4) : "none",
        node_env = app.Environment.EnvironmentName
    });
});

// ==================== ANALYZE ====================

api.MapPost("/analyze", async (HttpRequest httpRequest, AnalyzeRequest request, IAiService aiService, IArtworkRepository artworkRepo, IUserRepository userRepo) =>
{
    if (string.IsNullOrEmpty(request.Image))
        return Results.BadRequest(new { error = "Image payload is required." });

    // Validate image format
    if (!request.Image.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase) 
        && !request.Image.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
        && !request.Image.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
    {
        return Results.BadRequest(new { error = "Image must be a data URL (data:image/...) or HTTP(S) URL." });
    }

    var user = await ResolveUserAsync(httpRequest, userRepo);
    if (user is null)
        return Results.Unauthorized();

    try
    {
        var jsonResult = await aiService.AnalyzeArtworkAsync(request.Image);
        using var doc = JsonDocument.Parse(jsonResult);
        var root = doc.RootElement;

        string Prop(string name, string fallback) =>
            root.TryGetProperty(name, out var p) ? p.GetString() ?? fallback : fallback;

        List<string> Arr(string name) =>
            root.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.Array
                ? p.EnumerateArray().Select(c => c.GetString()!).Where(s => s is not null).ToList()!
                : new List<string>();

        var artwork = new Artwork
        {
            UserId = user.Id,
            ImageUrl = request.Image,
            Title = Prop("title", "Untitled Artwork"),
            Artist = Prop("artist", "Unknown Artist"),
            Year = Prop("year", "Unknown Year"),
            Style = Prop("style", "Unknown Movement"),
            Summary = Prop("summary", "No summary provided."),
            DetailedAnalysis = Prop("detailedAnalysis", "No analysis provided."),
            HistoricalContext = Prop("historicalContext", "No context provided."),
            StylisticInfluences = Prop("stylisticInfluences", "No influences specified."),
            Interpretation = Prop("interpretation", "No interpretation details provided."),
            Categories = Arr("categories"),
            Tags = Arr("tags")
        };

        artwork = await artworkRepo.CreateAsync(artwork);
        return Results.Ok(MapArtwork(artwork));
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

// ==================== CHAT ====================

api.MapPost("/chat", async (HttpRequest httpRequest, ChatRequest request, IAiService aiService, IMessageRepository messageRepo, IArtworkRepository artworkRepo, IUserRepository userRepo) =>
{
    var user = await ResolveUserAsync(httpRequest, userRepo);
    if (user is null)
        return Results.Unauthorized();

    try
    {
        var reply = await aiService.ChatAsync(request.Artwork, request.Messages, request.NewMessage);

        // Persist both sides when artwork id is a valid GUID owned by the user
        if (Guid.TryParse(request.Artwork.Id, out var artworkId))
        {
            var artwork = await artworkRepo.GetByIdAsync(artworkId);
            if (artwork is not null && artwork.UserId == user.Id)
            {
                await messageRepo.CreateAsync(new Message
                {
                    ArtworkId = artworkId,
                    Role = "user",
                    Content = request.NewMessage
                });
                await messageRepo.CreateAsync(new Message
                {
                    ArtworkId = artworkId,
                    Role = "assistant",
                    Content = reply
                });
            }
        }

        return Results.Ok(new { reply });
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

// ==================== ARTWORKS ====================

api.MapGet("/artworks", async (HttpRequest httpRequest, IArtworkRepository artworkRepo, IUserRepository userRepo) =>
{
    var user = await ResolveUserAsync(httpRequest, userRepo);
    if (user is null)
        return Results.Unauthorized();

    var artworks = await artworkRepo.GetByUserIdAsync(user.Id);
    return Results.Ok(artworks.Select(MapArtwork));
});

api.MapPost("/artworks", async (HttpRequest httpRequest, ImportArtworkRequest request, IArtworkRepository artworkRepo, IUserRepository userRepo) =>
{
    var user = await ResolveUserAsync(httpRequest, userRepo);
    if (user is null)
        return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.ImageUrl))
        return Results.BadRequest(new { error = "Title and imageUrl are required." });

    var artwork = new Artwork
    {
        UserId = user.Id,
        ImageUrl = request.ImageUrl,
        Title = request.Title,
        Artist = request.Artist ?? "Unknown Artist",
        Year = request.Year ?? "Unknown Year",
        Style = request.Style ?? "Unknown Movement",
        Summary = request.Summary ?? "",
        DetailedAnalysis = request.DetailedAnalysis ?? "",
        HistoricalContext = request.HistoricalContext ?? "",
        StylisticInfluences = request.StylisticInfluences ?? "",
        Interpretation = request.Interpretation ?? "",
        Categories = request.Categories?.ToList() ?? new List<string>(),
        Tags = request.Tags?.ToList() ?? new List<string>()
    };

    artwork = await artworkRepo.CreateAsync(artwork);
    return Results.Ok(MapArtwork(artwork));
});

api.MapGet("/artworks/{id:guid}/messages", async (Guid id, HttpRequest httpRequest, IMessageRepository messageRepo, IArtworkRepository artworkRepo, IUserRepository userRepo) =>
{
    var user = await ResolveUserAsync(httpRequest, userRepo);
    if (user is null)
        return Results.Unauthorized();

    var artwork = await artworkRepo.GetByIdAsync(id);
    if (artwork is null || artwork.UserId != user.Id)
        return Results.NotFound();

    var messages = await messageRepo.GetByArtworkIdAsync(id);
    return Results.Ok(messages.Select(MapMessage));
});

api.MapPost("/artworks/{id:guid}/messages", async (Guid id, HttpRequest httpRequest, ChatMessageDto message, IMessageRepository messageRepo, IArtworkRepository artworkRepo, IUserRepository userRepo) =>
{
    var user = await ResolveUserAsync(httpRequest, userRepo);
    if (user is null)
        return Results.Unauthorized();

    var artwork = await artworkRepo.GetByIdAsync(id);
    if (artwork is null || artwork.UserId != user.Id)
        return Results.NotFound();

    var msg = new Message
    {
        ArtworkId = id,
        Role = message.Role,
        Content = message.Content
    };
    msg = await messageRepo.CreateAsync(msg);
    return Results.Ok(MapMessage(msg));
});

api.MapPatch("/artworks/{id:guid}/tags", async (Guid id, HttpRequest httpRequest, string[] tags, IArtworkRepository artworkRepo, IUserRepository userRepo) =>
{
    var user = await ResolveUserAsync(httpRequest, userRepo);
    if (user is null)
        return Results.Unauthorized();

    var artwork = await artworkRepo.GetByIdAsync(id);
    if (artwork is null || artwork.UserId != user.Id)
        return Results.NotFound();

    artwork.Tags = tags.ToList();
    await artworkRepo.UpdateAsync(artwork);
    return Results.Ok(new { tags = artwork.Tags });
});

api.MapDelete("/artworks/{id:guid}", async (Guid id, HttpRequest httpRequest, IArtworkRepository artworkRepo, IMessageRepository messageRepo, IUserRepository userRepo) =>
{
    var user = await ResolveUserAsync(httpRequest, userRepo);
    if (user is null)
        return Results.Unauthorized();

    var artwork = await artworkRepo.GetByIdAsync(id);
    if (artwork is null || artwork.UserId != user.Id)
        return Results.NotFound();

    await messageRepo.DeleteByArtworkIdAsync(id);
    await artworkRepo.DeleteAsync(id);
    return Results.NoContent();
});

api.MapDelete("/artworks/{id:guid}/messages", async (Guid id, HttpRequest httpRequest, IMessageRepository messageRepo, IArtworkRepository artworkRepo, IUserRepository userRepo) =>
{
    var user = await ResolveUserAsync(httpRequest, userRepo);
    if (user is null)
        return Results.Unauthorized();

    var artwork = await artworkRepo.GetByIdAsync(id);
    if (artwork is null || artwork.UserId != user.Id)
        return Results.NotFound();

    await messageRepo.DeleteByArtworkIdAsync(id);
    return Results.NoContent();
});

// ==================== PROFILE ====================

api.MapGet("/profile", async (HttpRequest httpRequest, IUserRepository userRepo) =>
{
    var user = await ResolveUserAsync(httpRequest, userRepo);
    if (user is null)
        return Results.Unauthorized();

    return Results.Ok(MapUser(user));
});

api.MapPatch("/profile", async (HttpRequest httpRequest, UpdateProfileRequest request, IUserRepository userRepo) =>
{
    var user = await ResolveUserAsync(httpRequest, userRepo);
    if (user is null)
        return Results.Unauthorized();

    if (request.Name is not null)
        user.Name = request.Name;

    if (request.AvatarUrl is not null)
        user.AvatarUrl = request.AvatarUrl;

    await userRepo.UpdateAsync(user);
    return Results.Ok(MapUser(user));
});

api.MapPost("/profile/password", async (HttpRequest httpRequest, ChangePasswordRequest request, IUserRepository userRepo, IPasswordHasher<User> hasher) =>
{
    var user = await ResolveUserAsync(httpRequest, userRepo);
    if (user is null)
        return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
        return Results.BadRequest(new { error = "New password must be at least 6 characters." });

    if (!string.IsNullOrEmpty(user.PasswordHash))
    {
        var verify = VerifyPassword(hasher, user, request.CurrentPassword ?? string.Empty);
        if (verify == PasswordVerificationResult.Failed)
            return Results.BadRequest(new { error = "Current password is incorrect." });
    }

    user.PasswordHash = hasher.HashPassword(user, request.NewPassword);
    await userRepo.UpdateAsync(user);
    return Results.Ok(new { message = "Password updated successfully." });
});

// ==================== SUPERADMIN CONFIG ====================

bool IsSuperAdmin(string? apiKey, User? user) =>
    (!string.IsNullOrEmpty(apiKey) && apiKey == superAdminKey)
    || (user is not null && IsAdminEmail(user.Email));

api.MapGet("/admin/configs", async (HttpRequest httpRequest, string? apiKey, IAppConfigRepository configRepo, IUserRepository userRepo, IGeminiApiKeyProvider keyProvider) =>
{
    var user = await ResolveUserAsync(httpRequest, userRepo);
    if (!IsSuperAdmin(apiKey, user))
        return Results.Unauthorized();

    var configs = await configRepo.GetAllAsync();
    var key = await keyProvider.GetApiKeyAsync();
    return Results.Ok(new
    {
        configs = configs.Select(c => new
        {
            c.Key,
            Value = c.Key.Contains("KEY", StringComparison.OrdinalIgnoreCase) && c.Value.Length > 8
                ? c.Value[..4] + "…" + c.Value[^4..]
                : c.Value,
            c.Description,
            c.UpdatedAt,
            hasValue = !string.IsNullOrEmpty(c.Value)
        }),
        geminiConfigured = !string.IsNullOrEmpty(key)
    });
});

api.MapPost("/admin/configs", async (HttpRequest httpRequest, string? apiKey, AppConfigRequest request, IAppConfigRepository configRepo, IUserRepository userRepo) =>
{
    var user = await ResolveUserAsync(httpRequest, userRepo);
    if (!IsSuperAdmin(apiKey, user))
        return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(request.Key))
        return Results.BadRequest(new { error = "Key is required." });

    await configRepo.SetAsync(request.Key, request.Value, request.Description ?? string.Empty);
    return Results.Ok(new { message = "Configuration updated successfully" });
});

app.MapFallbackToFile("index.html");

app.Run();

using System.Text.Json;
using Microsoft.Extensions.Logging;
using ArtWise.Domain.DTOs;
using ArtWise.Domain.Interfaces;

namespace ArtWise.Services;

/// <summary>
/// Free fallback AI service that provides artwork analysis without external API calls.
/// Uses pattern matching and descriptive defaults when Gemini is unavailable.
/// </summary>
public class FallbackAiService : IAiService
{
    private readonly ILogger<FallbackAiService> _logger;

    public FallbackAiService(ILogger<FallbackAiService> logger)
    {
        _logger = logger;
    }

    public Task<string> AnalyzeArtworkAsync(string image, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Using FallbackAiService for artwork analysis (no Gemini key configured)");

        var result = new
        {
            title = "Artwork Analysis (Limited Mode)",
            artist = "Unknown / User Creation",
            year = "Unknown Year",
            style = "Not Classified",
            summary = "This artwork was analyzed in offline/limited mode. Full analysis requires a configured Gemini API key. Please contact your administrator to set up the GEMINI_API_KEY in the SuperAdmin panel.",
            detailedAnalysis = "Detailed AI analysis is unavailable because no Gemini API key has been configured. The application is running in fallback mode. To enable full AI-powered analysis:\n\n1. Go to the SuperAdmin settings panel\n2. Enter a valid Google Gemini API key\n3. The system will automatically switch to using Gemini for all artwork analysis and chat features.\n\nIn the meantime, you can still use the application to browse and organize your artwork collection.",
            historicalContext = "Historical context generation requires an active Gemini API connection.",
            stylisticInfluences = "Style analysis unavailable in fallback mode.",
            interpretation = "Meaning interpretation requires an active AI service connection.",
            categories = new[] { "Unclassified", "Fallback Mode" },
            tags = new[] { "offline", "limited", "no-api-key", "fallback-mode" }
        };

        return Task.FromResult(JsonSerializer.Serialize(result));
    }

    public Task<string> ChatAsync(ArtworkDto artwork, ChatMessageDto[] messages, string newMessage, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Using FallbackAiService for chat (no Gemini key configured)");

        var reply = $@"**ArtWise Curator (Fallback Mode)**

I'm currently operating in offline/limited mode because no Gemini API key has been configured. 

Here's what I know about this artwork:
- **Title:** {artwork.Title}
- **Artist:** {artwork.Artist}
- **Year:** {artwork.Year}
- **Style:** {artwork.Style}

To enable full interactive AI conversations with deep art historical insights, please ask your administrator to configure a valid Gemini API key in the SuperAdmin panel.

Once configured, I'll be able to discuss techniques, composition, symbolism, historical context, and much more!";

        return Task.FromResult(reply);
    }
}
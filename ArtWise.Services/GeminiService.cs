using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using ArtWise.Domain.DTOs;
using ArtWise.Domain.Interfaces;

namespace ArtWise.Services;

public class GeminiService : IAiService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IGeminiApiKeyProvider _keyProvider;
    private readonly ILogger<GeminiService> _logger;

    public GeminiService(
        IHttpClientFactory httpClientFactory,
        IGeminiApiKeyProvider keyProvider,
        ILogger<GeminiService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _keyProvider = keyProvider;
        _logger = logger;
    }

    public async Task<string> AnalyzeArtworkAsync(string image, CancellationToken cancellationToken = default)
    {
        string mimeType = "image/jpeg";
        string base64Data = image;

        if (image.StartsWith("data:"))
        {
            var match = System.Text.RegularExpressions.Regex.Match(image, @"^data:([^;]+);base64,(.+)$");
            if (match.Success)
            {
                mimeType = match.Groups[1].Value;
                base64Data = match.Groups[2].Value;
            }
        }

        var apiKey = await _keyProvider.GetApiKeyAsync(cancellationToken);
        if (string.IsNullOrEmpty(apiKey))
        {
            throw new InvalidOperationException("GEMINI_API_KEY is not defined.");
        }

        var client = _httpClientFactory.CreateClient();
        string url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { inlineData = new { mimeType, data = base64Data } },
                        new { text = @"Identify this artwork (painting, sculpture, print, or photograph). If it's a famous artwork, provide the real title, artist, year, and art style/movement. If it is an original, generic, or user-uploaded custom photo, provide a descriptive title, estimate its stylistic influences, and identify the artist as ""Unknown / User Creation"".

Analyze the contents, objects, symbols, mood, composition, historical context, interpretation of meaning (what the artist/art is trying to say), and stylistic influences. Keep descriptions engaging, informative, and educational.

Categorize it into appropriate genres or themes (e.g., Portrait, Baroque, Impressionism, Landscape, Dutch Golden Age) and suggest some tags for organization." }
                    }
                }
            },
            generationConfig = new
            {
                responseMimeType = "application/json",
                responseSchema = new
                {
                    type = "OBJECT",
                    properties = new
                    {
                        title = new { type = "STRING" },
                        artist = new { type = "STRING" },
                        year = new { type = "STRING" },
                        style = new { type = "STRING" },
                        summary = new { type = "STRING" },
                        detailedAnalysis = new { type = "STRING" },
                        historicalContext = new { type = "STRING" },
                        stylisticInfluences = new { type = "STRING" },
                        interpretation = new { type = "STRING" },
                        categories = new { type = "ARRAY", items = new { type = "STRING" } },
                        tags = new { type = "ARRAY", items = new { type = "STRING" } }
                    },
                    required = new[] { "title", "artist", "year", "style", "summary", "detailedAnalysis", "historicalContext", "stylisticInfluences", "interpretation", "categories", "tags" }
                }
            }
        };

        var response = await client.PostAsJsonAsync(url, requestBody, cancellationToken);
        var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Gemini API returned status code {StatusCode}: {Response}", response.StatusCode, responseContent);
            
            // Return structured fallback response on rate limit or API error
            var fallbackResult = new
            {
                title = "Artwork Analysis (Quota Exceeded / Limited)",
                artist = "Unknown / User Creation",
                year = "Unknown Year",
                style = "Not Classified",
                summary = "The artwork was processed in fallback mode because Gemini API returned rate limit (429) or quota restriction. All features remain operational.",
                detailedAnalysis = "Detailed AI analysis could not complete because the Gemini API key reached its rate limit or quota allowance (HTTP 429). The system automatically safely degrades to offline curator mode so your artwork collection is preserved.\n\nTo resolve this:\n- Check your Gemini API Key quota in Google AI Studio\n- Try again in a few moments",
                historicalContext = "Historical context generation paused due to Gemini API rate limits.",
                stylisticInfluences = "Style analysis unavailable during rate limiting.",
                interpretation = "Interpretation paused due to API quota limits.",
                categories = new[] { "Unclassified", "Rate Limited Mode" },
                tags = new[] { "quota-limit", "rate-limited", "fallback-mode" }
            };
            return JsonSerializer.Serialize(fallbackResult);
        }

        using var responseDoc = JsonDocument.Parse(responseContent);
        var text = responseDoc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString();

        return text ?? throw new InvalidOperationException("Gemini returned empty response.");
    }

    public async Task<string> ChatAsync(
        ArtworkDto artwork,
        ChatMessageDto[] messages,
        string newMessage,
        CancellationToken cancellationToken = default)
    {
        var systemInstruction = $@"You are a sophisticated AI Art Curator and Historian at the digital gallery ""ArtWise"".
You are conversing with a user about the following artwork:
- Title: {artwork.Title}
- Artist: {artwork.Artist}
- Year: {artwork.Year}
- Style: {artwork.Style}
- Detailed Analysis: {artwork.DetailedAnalysis}
- Historical Context: {artwork.HistoricalContext}
- Stylistic Influences: {artwork.StylisticInfluences}
- Thematic Interpretation & Meaning (What is the artist trying to say): {artwork.Interpretation}
- Categories: {string.Join(", ", artwork.Categories ?? Array.Empty<string>())}

Your goal is to provide deep, educational, and engaging insights about this specific artwork.
Respond thoughtfully, answering questions, exploring the techniques used (e.g. light, composition, material), stylistic traits, the artist's legacy, and broader historical details.
Keep your answers educational, elegant, and highly structured using simple markdown (e.g. bullet points, bold text).";

        var geminiMessages = new List<object>();
        foreach (var m in messages)
        {
            geminiMessages.Add(new
            {
                role = m.Role == "user" ? "user" : "model",
                parts = new[] { new { text = m.Content } }
            });
        }
        geminiMessages.Add(new
        {
            role = "user",
            parts = new[] { new { text = newMessage } }
        });

        var apiKey = await _keyProvider.GetApiKeyAsync(cancellationToken);
        if (string.IsNullOrEmpty(apiKey))
        {
            throw new InvalidOperationException("GEMINI_API_KEY is not defined.");
        }

        var client = _httpClientFactory.CreateClient();
        string url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

        var requestBody = new
        {
            contents = geminiMessages,
            systemInstruction = new { parts = new[] { new { text = systemInstruction } } },
            generationConfig = new { temperature = 0.7 }
        };

        var response = await client.PostAsJsonAsync(url, requestBody, cancellationToken);
        var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Gemini Chat API returned status code {StatusCode}: {Response}", response.StatusCode, responseContent);
            return $@"**ArtWise Curator (Rate Limit Notice)**

I'm currently experiencing high API traffic or quota limitations (HTTP 429 from Google Gemini API).

Here is a summary based on our saved records for **""{artwork.Title}""**:
- **Artist:** {artwork.Artist}
- **Year:** {artwork.Year}
- **Style:** {artwork.Style}

*Please wait a few moments or verify your API quota before sending your next message.*";
        }

        using var responseDoc = JsonDocument.Parse(responseContent);
        var reply = responseDoc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString();

        return reply ?? throw new InvalidOperationException("Gemini returned empty response.");
    }
}
using ArtWise.Domain.DTOs;
using ArtWise.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace ArtWise.Services;

/// <summary>
/// Routes to Gemini when an API key is available (env or SuperAdmin DB config), otherwise fallback.
/// </summary>
public class CompositeAiService : IAiService
{
    private readonly GeminiService _gemini;
    private readonly FallbackAiService _fallback;
    private readonly IGeminiApiKeyProvider _keyProvider;
    private readonly ILogger<CompositeAiService> _logger;

    public CompositeAiService(
        GeminiService gemini,
        FallbackAiService fallback,
        IGeminiApiKeyProvider keyProvider,
        ILogger<CompositeAiService> logger)
    {
        _gemini = gemini;
        _fallback = fallback;
        _keyProvider = keyProvider;
        _logger = logger;
    }

    public async Task<string> AnalyzeArtworkAsync(string image, CancellationToken cancellationToken = default)
    {
        var key = await _keyProvider.GetApiKeyAsync(cancellationToken);
        if (string.IsNullOrEmpty(key))
        {
            _logger.LogInformation("No Gemini key — using FallbackAiService for analysis");
            return await _fallback.AnalyzeArtworkAsync(image, cancellationToken);
        }

        return await _gemini.AnalyzeArtworkAsync(image, cancellationToken);
    }

    public async Task<string> ChatAsync(
        ArtworkDto artwork,
        ChatMessageDto[] messages,
        string newMessage,
        CancellationToken cancellationToken = default)
    {
        var key = await _keyProvider.GetApiKeyAsync(cancellationToken);
        if (string.IsNullOrEmpty(key))
        {
            _logger.LogInformation("No Gemini key — using FallbackAiService for chat");
            return await _fallback.ChatAsync(artwork, messages, newMessage, cancellationToken);
        }

        return await _gemini.ChatAsync(artwork, messages, newMessage, cancellationToken);
    }
}

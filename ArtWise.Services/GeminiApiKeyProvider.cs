using ArtWise.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace ArtWise.Services;

public class GeminiApiKeyProvider : IGeminiApiKeyProvider
{
    private readonly IAppConfigRepository _configRepo;
    private readonly ILogger<GeminiApiKeyProvider> _logger;

    public GeminiApiKeyProvider(IAppConfigRepository configRepo, ILogger<GeminiApiKeyProvider> logger)
    {
        _configRepo = configRepo;
        _logger = logger;
    }

    public async Task<string?> GetApiKeyAsync(CancellationToken cancellationToken = default)
    {
        var envKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
        if (!string.IsNullOrWhiteSpace(envKey))
            return envKey.Trim();

        var config = await _configRepo.GetByKeyAsync("GEMINI_API_KEY", cancellationToken);
        if (!string.IsNullOrWhiteSpace(config?.Value))
            return config.Value.Trim();

        _logger.LogDebug("No Gemini API key found in environment or AppConfig");
        return null;
    }
}

namespace ArtWise.Domain.Interfaces;

public interface IGeminiApiKeyProvider
{
    Task<string?> GetApiKeyAsync(CancellationToken cancellationToken = default);
}

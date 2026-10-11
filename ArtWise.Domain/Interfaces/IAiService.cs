using ArtWise.Domain.DTOs;

namespace ArtWise.Domain.Interfaces;

public interface IAiService
{
    Task<string> AnalyzeArtworkAsync(string image, CancellationToken cancellationToken = default);
    Task<string> ChatAsync(ArtworkDto artwork, ChatMessageDto[] messages, string newMessage, CancellationToken cancellationToken = default);
}
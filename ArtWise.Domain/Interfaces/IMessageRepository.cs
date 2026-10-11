using ArtWise.Domain.Entities;

namespace ArtWise.Domain.Interfaces;

public interface IMessageRepository
{
    Task<IEnumerable<Message>> GetByArtworkIdAsync(Guid artworkId, CancellationToken cancellationToken = default);
    Task<Message> CreateAsync(Message message, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task DeleteByArtworkIdAsync(Guid artworkId, CancellationToken cancellationToken = default);
}
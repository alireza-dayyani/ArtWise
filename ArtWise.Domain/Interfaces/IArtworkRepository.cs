using ArtWise.Domain.Entities;

namespace ArtWise.Domain.Interfaces;

public interface IArtworkRepository
{
    Task<Artwork?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Artwork>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Artwork> CreateAsync(Artwork artwork, CancellationToken cancellationToken = default);
    Task UpdateAsync(Artwork artwork, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
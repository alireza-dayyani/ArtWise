using ArtWise.Domain.Entities;

namespace ArtWise.Domain.Interfaces;

public interface IAppConfigRepository
{
    Task<AppConfig?> GetByKeyAsync(string key, CancellationToken cancellationToken = default);
    Task<IEnumerable<AppConfig>> GetAllAsync(CancellationToken cancellationToken = default);
    Task SetAsync(string key, string value, string description, CancellationToken cancellationToken = default);
}
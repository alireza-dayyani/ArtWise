using Microsoft.EntityFrameworkCore;
using ArtWise.Domain.Entities;
using ArtWise.Domain.Interfaces;

namespace ArtWise.Data.Repositories;

public class AppConfigRepository : IAppConfigRepository
{
    private readonly AppDbContext _context;

    public AppConfigRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<AppConfig?> GetByKeyAsync(string key, CancellationToken cancellationToken = default)
    {
        return await _context.AppConfigs
            .FirstOrDefaultAsync(config => config.Key == key, cancellationToken);
    }

    public async Task<IEnumerable<AppConfig>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.AppConfigs
            .OrderBy(config => config.Key)
            .ToListAsync(cancellationToken);
    }

    public async Task SetAsync(string key, string value, string description, CancellationToken cancellationToken = default)
    {
        var existing = await _context.AppConfigs
            .FirstOrDefaultAsync(config => config.Key == key, cancellationToken);

        if (existing is not null)
        {
            existing.Value = value;
            existing.Description = description;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _context.AppConfigs.Add(new AppConfig
            {
                Key = key,
                Value = value,
                Description = description
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}
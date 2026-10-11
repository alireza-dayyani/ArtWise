using Microsoft.EntityFrameworkCore;
using ArtWise.Domain.Entities;
using ArtWise.Domain.Interfaces;

namespace ArtWise.Data.Repositories;

public class ArtworkRepository : IArtworkRepository
{
    private readonly AppDbContext _context;

    public ArtworkRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Artwork?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _context.Artworks
            .Include(a => a.Messages)
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<Artwork>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _context.Artworks
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<Artwork> CreateAsync(Artwork artwork, CancellationToken cancellationToken = default)
    {
        _context.Artworks.Add(artwork);
        await _context.SaveChangesAsync(cancellationToken);
        return artwork;
    }

    public async Task UpdateAsync(Artwork artwork, CancellationToken cancellationToken = default)
    {
        _context.Artworks.Update(artwork);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var artwork = await _context.Artworks.FindAsync(new object[] { id }, cancellationToken);
        if (artwork is not null)
        {
            _context.Artworks.Remove(artwork);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
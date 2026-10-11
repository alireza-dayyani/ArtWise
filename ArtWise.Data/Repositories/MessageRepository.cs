using Microsoft.EntityFrameworkCore;
using ArtWise.Domain.Entities;
using ArtWise.Domain.Interfaces;

namespace ArtWise.Data.Repositories;

public class MessageRepository : IMessageRepository
{
    private readonly AppDbContext _context;

    public MessageRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Message>> GetByArtworkIdAsync(Guid artworkId, CancellationToken cancellationToken = default)
    {
        return await _context.Messages
            .Where(m => m.ArtworkId == artworkId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<Message> CreateAsync(Message message, CancellationToken cancellationToken = default)
    {
        _context.Messages.Add(message);
        await _context.SaveChangesAsync(cancellationToken);
        return message;
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var message = await _context.Messages.FindAsync([id], cancellationToken);
        if (message is not null)
        {
            _context.Messages.Remove(message);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task DeleteByArtworkIdAsync(Guid artworkId, CancellationToken cancellationToken = default)
    {
        var messages = await _context.Messages
            .Where(m => m.ArtworkId == artworkId)
            .ToListAsync(cancellationToken);
        _context.Messages.RemoveRange(messages);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
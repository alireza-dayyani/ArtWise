using Microsoft.EntityFrameworkCore;
using ArtWise.Domain.Entities;

namespace ArtWise.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Artwork> Artworks => Set<Artwork>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<AppConfig> AppConfigs => Set<AppConfig>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Name).HasMaxLength(200);
            entity.Property(e => e.Email).HasMaxLength(300);
            entity.Property(e => e.AvatarUrl).HasColumnType("TEXT");
        });

        modelBuilder.Entity<Artwork>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(500);
            entity.Property(e => e.Artist).HasMaxLength(300);
            entity.Property(e => e.Year).HasMaxLength(50);
            entity.Property(e => e.Style).HasMaxLength(200);
            entity.Property(e => e.ImageUrl).HasColumnType("TEXT");
            entity.Property(e => e.Summary).HasColumnType("TEXT");
            entity.Property(e => e.DetailedAnalysis).HasColumnType("TEXT");
            entity.Property(e => e.HistoricalContext).HasColumnType("TEXT");
            entity.Property(e => e.StylisticInfluences).HasColumnType("TEXT");
            entity.Property(e => e.Interpretation).HasColumnType("TEXT");
            entity.Property(e => e.CategoriesSerialized).HasColumnName("Categories").HasColumnType("TEXT");
            entity.Property(e => e.TagsSerialized).HasColumnName("Tags").HasColumnType("TEXT");

            entity.HasOne(e => e.User)
                  .WithMany(u => u.Artworks)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Role).HasMaxLength(20);
            entity.Property(e => e.Content).HasColumnType("TEXT");

            entity.HasOne(e => e.Artwork)
                  .WithMany(a => a.Messages)
                  .HasForeignKey(e => e.ArtworkId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AppConfig>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Key).IsUnique();
            entity.Property(e => e.Key).HasMaxLength(200);
            entity.Property(e => e.Value).HasColumnType("TEXT");
            entity.Property(e => e.Description).HasMaxLength(1000);
        });
    }
}

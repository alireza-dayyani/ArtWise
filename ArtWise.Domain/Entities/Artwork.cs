namespace ArtWise.Domain.Entities;

public class Artwork
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string Year { get; set; } = string.Empty;
    public string Style { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string DetailedAnalysis { get; set; } = string.Empty;
    public string HistoricalContext { get; set; } = string.Empty;
    public string StylisticInfluences { get; set; } = string.Empty;
    public string Interpretation { get; set; } = string.Empty;
    public string CategoriesSerialized { get; set; } = "[]";
    public string TagsSerialized { get; set; } = "[]";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public ICollection<Message> Messages { get; set; } = new List<Message>();

    public List<string> Categories
    {
        get => System.Text.Json.JsonSerializer.Deserialize<List<string>>(CategoriesSerialized) ?? new();
        set => CategoriesSerialized = System.Text.Json.JsonSerializer.Serialize(value);
    }

    public List<string> Tags
    {
        get => System.Text.Json.JsonSerializer.Deserialize<List<string>>(TagsSerialized) ?? new();
        set => TagsSerialized = System.Text.Json.JsonSerializer.Serialize(value);
    }
}
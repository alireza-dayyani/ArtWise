namespace ArtWise.Domain.DTOs;

public record ChatRequest(
    ArtworkDto Artwork,
    ChatMessageDto[] Messages,
    string NewMessage
);

public record ChatMessageDto(string Role, string Content);

public record ArtworkDto(
    string? Id,
    string Title,
    string Artist,
    string Year,
    string Style,
    string DetailedAnalysis,
    string HistoricalContext,
    string StylisticInfluences,
    string Interpretation,
    string[] Categories
);

public record ImportArtworkRequest(
    string Title,
    string ImageUrl,
    string? Artist,
    string? Year,
    string? Style,
    string? Summary,
    string? DetailedAnalysis,
    string? HistoricalContext,
    string? StylisticInfluences,
    string? Interpretation,
    string[]? Categories,
    string[]? Tags
);

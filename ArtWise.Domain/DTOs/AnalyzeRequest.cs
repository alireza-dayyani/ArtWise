namespace ArtWise.Domain.DTOs;

public record AnalyzeRequest(
    string? Image = null,
    string? Text = null,
    string? Audio = null,
    string? Video = null
);
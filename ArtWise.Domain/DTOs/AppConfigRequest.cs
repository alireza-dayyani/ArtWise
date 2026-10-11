namespace ArtWise.Domain.DTOs;

public record AppConfigRequest(string Key, string Value, string? Description);

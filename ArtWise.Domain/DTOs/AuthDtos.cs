namespace ArtWise.Domain.DTOs;

public record RegisterRequest(string Email, string Password, string Name);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Id, string Email, string Name, string? AvatarUrl, string CreatedAt, bool IsAdmin);

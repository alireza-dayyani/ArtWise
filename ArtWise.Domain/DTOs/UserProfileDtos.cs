namespace ArtWise.Domain.DTOs;

public record UpdateProfileRequest(string? Name, string? AvatarUrl);
public record ChangePasswordRequest(string? CurrentPassword, string NewPassword);

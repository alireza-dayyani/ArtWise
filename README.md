# ArtWise - .NET 10 Enterprise Artwork Analyzer

A full enterprise .NET 10 solution with a React frontend for AI-powered artwork analysis using Google's Gemini API.

## Architecture

```
ArtWise.slnx
├── ArtWise.Domain/          # Domain layer - Entities, DTOs, Interfaces
│   ├── Entities/            # User, Artwork, Message
│   ├── DTOs/                # Request/Response DTOs
│   └── Interfaces/          # Repository interfaces
├── ArtWise.Data/            # Data layer - EF Core, Repositories
│   ├── AppDbContext.cs      # EF Core DbContext
│   └── Repositories/        # Repository implementations
├── ArtWise.Services/        # Service layer - Business logic
│   └── GeminiService.cs     # Google Gemini API integration
├── ArtWise.csproj           # Web API project (Minimal API)
├── Program.cs               # API endpoints & configuration
└── ClientApp/               # React frontend (Vite, Tailwind CSS v4)
```

## Features

- **Multi-project .NET 10 solution** with clean architecture (Domain, Data, Services, Web)
- **Entity Framework Core** with SQLite database for persistence
- **Repository pattern** with dependency injection
- **Google Gemini AI** integration for artwork analysis and chat
- **React SPA** frontend with Vite, Tailwind CSS v4, and Lucide icons
- **SPA Proxy** for seamless development experience

## Run Locally

**Prerequisites:** .NET 10 SDK, Node.js (for frontend)

1. **Setup Environment:**
   Create a `.env` file in the root with your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

2. **Run the Project:**
   ```bash
   dotnet run
   ```
   This will start both the .NET backend and the React frontend (via SPA proxy).

3. **Production Build:**
   ```bash
   dotnet publish -c Release
   ```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze` | Analyze an artwork image |
| POST | `/api/chat` | Chat with AI about an artwork |
| GET | `/api/artworks` | List all artworks |
| GET | `/api/artworks/{id}/messages` | Get messages for an artwork |
| POST | `/api/artworks/{id}/messages` | Save a message |
| PATCH | `/api/artworks/{id}/tags` | Update artwork tags |
| DELETE | `/api/artworks/{id}` | Delete an artwork |
| GET | `/api/debug-env` | Debug environment variables |
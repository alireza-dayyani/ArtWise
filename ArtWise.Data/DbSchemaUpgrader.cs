using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace ArtWise.Data;

/// <summary>
/// EnsureCreated does not alter existing schemas. Apply additive upgrades and create the DB if needed.
/// </summary>
public static class DbSchemaUpgrader
{
    public static async Task UpgradeAsync(AppDbContext db, string connectionString, CancellationToken cancellationToken = default)
    {
        await EnsureSqlServerDatabaseExistsAsync(connectionString, cancellationToken);
        await db.Database.EnsureCreatedAsync(cancellationToken);

        var provider = db.Database.ProviderName ?? "";
        if (provider.Contains("SqlServer", StringComparison.OrdinalIgnoreCase))
        {
            await db.Database.ExecuteSqlRawAsync("""
                IF COL_LENGTH('Users', 'AvatarUrl') IS NULL
                    ALTER TABLE Users ADD AvatarUrl nvarchar(max) NULL;
                """, cancellationToken);

            await db.Database.ExecuteSqlRawAsync("""
                IF COL_LENGTH('Users', 'PasswordHash') IS NULL
                    ALTER TABLE Users ADD PasswordHash nvarchar(max) NOT NULL CONSTRAINT DF_Users_PasswordHash DEFAULT '';
                """, cancellationToken);

            await db.Database.ExecuteSqlRawAsync("""
                IF OBJECT_ID(N'dbo.AppConfigs', N'U') IS NULL
                BEGIN
                    CREATE TABLE AppConfigs (
                        Id uniqueidentifier NOT NULL CONSTRAINT PK_AppConfigs PRIMARY KEY,
                        [Key] nvarchar(200) NOT NULL,
                        Value nvarchar(max) NOT NULL,
                        Description nvarchar(1000) NOT NULL,
                        UpdatedAt datetime2 NOT NULL
                    );
                    CREATE UNIQUE INDEX IX_AppConfigs_Key ON AppConfigs ([Key]);
                END
                """, cancellationToken);
        }
        else if (provider.Contains("Sqlite", StringComparison.OrdinalIgnoreCase))
        {
            await EnsureSqliteColumnAsync(db, "Users", "AvatarUrl", "TEXT NULL", cancellationToken);
            await EnsureSqliteColumnAsync(db, "Users", "PasswordHash", "TEXT NOT NULL DEFAULT ''", cancellationToken);
            await EnsureSqliteTableAppConfigsAsync(db, cancellationToken);
        }
    }

    private static async Task EnsureSqlServerDatabaseExistsAsync(string connectionString, CancellationToken cancellationToken)
    {
        var builder = new SqlConnectionStringBuilder(connectionString);
        var databaseName = builder.InitialCatalog;
        if (string.IsNullOrWhiteSpace(databaseName))
            return;

        builder.InitialCatalog = "master";
        await using var connection = new SqlConnection(builder.ConnectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            IF DB_ID(N'{databaseName.Replace("'", "''")}') IS NULL
                CREATE DATABASE [{databaseName.Replace("]", "]]")}];
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task EnsureSqliteColumnAsync(
        AppDbContext db,
        string table,
        string column,
        string columnDef,
        CancellationToken cancellationToken)
    {
        var connection = db.Database.GetDbConnection();
        await db.Database.OpenConnectionAsync(cancellationToken);
        try
        {
            await using var cmd = connection.CreateCommand();
            cmd.CommandText = $"PRAGMA table_info(\"{table}\")";
            var columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            await using (var reader = await cmd.ExecuteReaderAsync(cancellationToken))
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    columns.Add(reader.GetString(1));
                }
            }

            if (!columns.Contains(column))
            {
                var sql = $"ALTER TABLE \"{table}\" ADD COLUMN \"{column}\" {columnDef}";
                await db.Database.ExecuteSqlRawAsync(sql, cancellationToken);
            }
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }

    private static async Task EnsureSqliteTableAppConfigsAsync(AppDbContext db, CancellationToken cancellationToken)
    {
        await db.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS "AppConfigs" (
                "Id" TEXT NOT NULL CONSTRAINT "PK_AppConfigs" PRIMARY KEY,
                "Key" TEXT NOT NULL,
                "Value" TEXT NOT NULL,
                "Description" TEXT NOT NULL,
                "UpdatedAt" TEXT NOT NULL
            );
            """, cancellationToken);

        await db.Database.ExecuteSqlRawAsync("""
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_AppConfigs_Key" ON "AppConfigs" ("Key");
            """, cancellationToken);
    }
}

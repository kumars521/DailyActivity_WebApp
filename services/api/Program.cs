
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace DailyActivity.Api;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        var connectionString = builder.Configuration["DATABASE_CONNECTION_STRING"]
            ?? builder.Configuration.GetConnectionString("Database")
            ?? builder.Configuration["Database:ConnectionString"]
            ?? "Server=localhost;Database=DailyActivityDb;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=True;Encrypt=False";

        builder.Services.AddDbContext<ActivityDbContext>(options =>
            options.UseSqlServer(connectionString));

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("LocalDevelopment", policy =>
            {
                policy.AllowAnyOrigin();
                policy.AllowAnyHeader();
                policy.AllowAnyMethod();
            });
        });

        var jwtKey = builder.Configuration["JWT_KEY"] ?? builder.Configuration["Jwt:Key"] ?? "development-secret-key-1234567890";

        builder.Services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        }).AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
            };
        });

        builder.Services.AddAuthorization();

        var app = builder.Build();

        using (var scope = app.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<ActivityDbContext>();
            dbContext.Database.Migrate();
        }

        app.UseCors("LocalDevelopment");
        app.UseAuthentication();
        app.UseAuthorization();

        app.MapGet("/api/health", async (ActivityDbContext dbContext) =>
        {
            var databaseReady = await dbContext.Database.CanConnectAsync();

            return Results.Ok(new
            {
                status = databaseReady ? "ok" : "degraded",
                services = new { database = databaseReady ? "connected" : "unavailable", auth = "jwt" }
            });
        });

        app.MapPost("/api/auth/login", async (ActivityDbContext dbContext, LoginRequest request) =>
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return Results.BadRequest(new
                {
                    error = new { code = "INVALID_REQUEST", message = "Email and password are required." }
                });
            }

            var normalizedEmail = request.Email.Trim();
            var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);

            if (user is null)
            {
                user = new UserAccount
                {
                    ExternalId = "u_1001",
                    Name = "Alex Morgan",
                    Email = normalizedEmail,
                    Role = "Product Lead",
                    PasswordHash = request.Password
                };

                dbContext.Users.Add(user);
                await dbContext.SaveChangesAsync();
            }

            if (!string.Equals(user.PasswordHash, request.Password, StringComparison.Ordinal))
            {
                return Results.Unauthorized();
            }

            var token = CreateToken(jwtKey, new AuthUser(user.ExternalId, user.Name, user.Email, user.Role));

            return Results.Ok(new
            {
                token,
                expiresAt = DateTime.UtcNow.AddHours(8),
                user = new { id = user.ExternalId, name = user.Name, email = user.Email, role = user.Role }
            });
        });

        app.MapGet("/api/activities", [Authorize] async (ActivityDbContext dbContext, ClaimsPrincipal claims) =>
        {
            var currentUserId = GetCurrentUserId(claims);
            var items = await dbContext.Activities
                .Where(entry => entry.User.ExternalId == currentUserId)
                .OrderByDescending(entry => entry.Date)
                .Select(entry => new
                {
                    id = entry.ExternalId,
                    date = entry.Date.ToString("yyyy-MM-dd"),
                    category = entry.Category,
                    durationMinutes = entry.DurationMinutes,
                    notes = entry.Description,
                    status = entry.Status
                })
                .ToListAsync();

            return Results.Ok(new { items });
        });

        app.MapPost("/api/activities", [Authorize] async (ActivityDbContext dbContext, ClaimsPrincipal claims, CreateActivityRequest request) =>
        {
            if (string.IsNullOrWhiteSpace(request.Date) || string.IsNullOrWhiteSpace(request.Category) || request.DurationMinutes <= 0)
            {
                return Results.BadRequest(new
                {
                    error = new { code = "INVALID_ACTIVITY", message = "Date, category, and duration are required." }
                });
            }

            var currentUserId = GetCurrentUserId(claims);
            var user = await dbContext.Users.FirstAsync(item => item.ExternalId == currentUserId);
            var activity = new ActivityEntry
            {
                ExternalId = $"a_{DateTime.UtcNow:yyyyMMddHHmmss}",
                UserId = user.Id,
                Date = DateOnly.TryParse(request.Date, out var date) ? date : DateOnly.FromDateTime(DateTime.UtcNow),
                Category = request.Category.Trim(),
                DurationMinutes = request.DurationMinutes,
                Description = request.Description.Trim(),
                Status = "Draft",
                CreatedAt = DateTime.UtcNow,
                User = user
            };

            dbContext.Activities.Add(activity);
            await dbContext.SaveChangesAsync();

            return Results.Created($"/api/activities/{activity.ExternalId}", new
            {
                id = activity.ExternalId,
                createdAt = activity.CreatedAt,
                status = activity.Status
            });
        });

        app.MapPut("/api/activities/{id}", [Authorize] async (ActivityDbContext dbContext, ClaimsPrincipal claims, string id, CreateActivityRequest request) =>
        {
            if (string.IsNullOrWhiteSpace(request.Date) || string.IsNullOrWhiteSpace(request.Category) || request.DurationMinutes <= 0)
            {
                return Results.BadRequest(new
                {
                    error = new { code = "INVALID_ACTIVITY", message = "Date, category, and duration are required." }
                });
            }

            var currentUserId = GetCurrentUserId(claims);
            var activity = await dbContext.Activities
                .Include(item => item.User)
                .FirstOrDefaultAsync(item => item.ExternalId == id && item.User.ExternalId == currentUserId);

            if (activity is null)
            {
                return Results.NotFound();
            }

            activity.Date = DateOnly.TryParse(request.Date, out var date) ? date : DateOnly.FromDateTime(DateTime.UtcNow);
            activity.Category = request.Category.Trim();
            activity.DurationMinutes = request.DurationMinutes;
            activity.Description = request.Description.Trim();

            await dbContext.SaveChangesAsync();

            return Results.Ok(new
            {
                id = activity.ExternalId,
                date = activity.Date.ToString("yyyy-MM-dd"),
                category = activity.Category,
                durationMinutes = activity.DurationMinutes,
                notes = activity.Description,
                status = activity.Status
            });
        });

        app.MapPatch("/api/activities/{id}/status", [Authorize] async (ActivityDbContext dbContext, ClaimsPrincipal claims, string id, UpdateActivityStatusRequest request) =>
        {
            var requestedStatus = request.Status?.Trim();
            var allowedStatuses = new[] { "Pending", "Draft", "Completed" };
            var status = allowedStatuses.FirstOrDefault(item => string.Equals(item, requestedStatus, StringComparison.OrdinalIgnoreCase));
            if (status is null)
            {
                return Results.BadRequest(new
                {
                    error = new { code = "INVALID_STATUS", message = "Status must be Pending, Draft, or Completed." }
                });
            }

            var currentUserId = GetCurrentUserId(claims);
            var activity = await dbContext.Activities
                .Include(item => item.User)
                .FirstOrDefaultAsync(item => item.ExternalId == id && item.User.ExternalId == currentUserId);

            if (activity is null)
            {
                return Results.NotFound();
            }

            activity.Status = status;
            await dbContext.SaveChangesAsync();

            return Results.Ok(new { id = activity.ExternalId, status = activity.Status });
        });

        app.MapGet("/api/users/me", [Authorize] async (ActivityDbContext dbContext, ClaimsPrincipal claims) =>
        {
            var currentUserId = GetCurrentUserId(claims);
            var user = await dbContext.Users.FirstOrDefaultAsync(item => item.ExternalId == currentUserId);

            if (user is null)
            {
                return Results.NotFound();
            }

            return Results.Ok(new { id = user.ExternalId, name = user.Name, email = user.Email, role = user.Role });
        });

        app.MapGet("/api/activity-summary", [Authorize] async (ActivityDbContext dbContext, ClaimsPrincipal claims) =>
        {
            var currentUserId = GetCurrentUserId(claims);
            var entries = await dbContext.Activities
                .Where(entry => entry.User.ExternalId == currentUserId)
                .OrderByDescending(entry => entry.Date)
                .Select(entry => new
                {
                    id = entry.ExternalId,
                    date = entry.Date.ToString("yyyy-MM-dd"),
                    category = entry.Category,
                    durationMinutes = entry.DurationMinutes,
                    notes = entry.Description,
                    status = entry.Status
                })
                .ToListAsync();

            return Results.Ok(new
            {
                totalMinutes = entries.Sum(item => item.durationMinutes),
                activeDays = entries.Select(item => item.date).Distinct().Count(),
                recentCategories = entries.Select(item => item.category).Distinct().Take(3).ToArray(),
                entries
            });
        });

        app.Run();
    }

    private static string GetCurrentUserId(ClaimsPrincipal user)
    {
        return user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? "u_1001";
    }

    private static string CreateToken(string key, AuthUser user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var token = new JwtSecurityToken(
            issuer: "DailyActivity.Api",
            audience: "DailyActivity.Client",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials);

        return tokenHandler.WriteToken(token);
    }
}


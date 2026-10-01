using Microsoft.EntityFrameworkCore;

namespace DailyActivity.Api;

public class ActivityDbContext : DbContext
{
    public ActivityDbContext(DbContextOptions<ActivityDbContext> options)
        : base(options)
    {
    }

    public DbSet<UserAccount> Users => Set<UserAccount>();
    public DbSet<ActivityEntry> Activities => Set<ActivityEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserAccount>(entity =>
        {
            entity.HasKey(user => user.Id);
            entity.Property(user => user.ExternalId).HasMaxLength(64).IsRequired();
            entity.Property(user => user.Name).HasMaxLength(200).IsRequired();
            entity.Property(user => user.Email).HasMaxLength(200).IsRequired();
            entity.HasIndex(user => user.Email).IsUnique();
            entity.Property(user => user.Role).HasMaxLength(100).IsRequired();
            entity.Property(user => user.PasswordHash).HasMaxLength(256).IsRequired();
        });

        modelBuilder.Entity<ActivityEntry>(entity =>
        {
            entity.HasKey(item => item.Id);
            entity.Property(item => item.ExternalId).HasMaxLength(64).IsRequired();
            entity.Property(item => item.Category).HasMaxLength(120).IsRequired();
            entity.Property(item => item.Description).HasMaxLength(1000);
            entity.Property(item => item.Status).HasMaxLength(50).IsRequired();
            entity.HasOne(item => item.User)
                .WithMany(user => user.Activities)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(item => item.UserId);
            entity.HasIndex(item => item.Date);
        });

        base.OnModelCreating(modelBuilder);
    }
}

public class UserAccount
{
    public int Id { get; set; }
    public string ExternalId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public ICollection<ActivityEntry> Activities { get; set; } = new List<ActivityEntry>();
}

public class ActivityEntry
{
    public int Id { get; set; }
    public string ExternalId { get; set; } = string.Empty;
    public int UserId { get; set; }
    public UserAccount User { get; set; } = null!;
    public DateOnly Date { get; set; }
    public string Category { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "Draft";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public record AuthUser(string Id, string Name, string Email, string Role);
public record LoginRequest(string Email, string Password);
public record CreateActivityRequest(string Date, string Category, int DurationMinutes, string Description);
public record UpdateActivityStatusRequest(string Status);

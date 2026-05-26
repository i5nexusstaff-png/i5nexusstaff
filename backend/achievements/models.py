from django.db import models
from django.conf import settings


class Achievement(models.Model):
    PERIOD_CHOICES = [('weekly','Weekly'),('monthly','Monthly'),('yearly','Yearly')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='achievements')
    period_type = models.CharField(max_length=10, choices=PERIOD_CHOICES)
    period_label = models.CharField(max_length=50)  # e.g. "May 2026", "Week 20 2026"
    plots_sold = models.IntegerField(default=0)
    revenue = models.FloatField(default=0)
    rank = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'period_type', 'period_label']
        ordering = ['rank']

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.period_label} - Rank {self.rank}"


# ─── Team Achievement Models ────────────────────────────────────────────────

TEAM_TYPE_CHOICES = [('sales', 'Sales'), ('pre_sales', 'Pre-Sales')]


class TeamMember(models.Model):
    # employee_id is now informational only (not a key); unique identity is (employee_name, team_name, team_type)
    employee_name = models.CharField(max_length=200)
    department    = models.CharField(max_length=100, blank=True)
    team_type     = models.CharField(max_length=20, choices=TEAM_TYPE_CHOICES)
    team_name     = models.CharField(max_length=200)
    designation   = models.CharField(max_length=200, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('employee_name', 'team_name', 'team_type')]

    def __str__(self):
        return f"{self.employee_name} — {self.team_name}"


class TeamAchievement(models.Model):
    employee        = models.ForeignKey(TeamMember, on_delete=models.CASCADE, related_name='team_achievements')
    team_name       = models.CharField(max_length=200)
    team_type       = models.CharField(max_length=20, choices=TEAM_TYPE_CHOICES)
    site_visits     = models.IntegerField(default=0)
    appointments    = models.IntegerField(default=0)
    meetings        = models.IntegerField(default=0)
    bookings        = models.IntegerField(default=0)
    registrations   = models.IntegerField(default=0)
    square_feet_sold = models.FloatField(default=0)
    units_sold      = models.IntegerField(default=0)
    month           = models.IntegerField()   # 1-12
    year            = models.IntegerField()
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['employee', 'month', 'year']
        ordering = ['-year', '-month']

    def __str__(self):
        return f"{self.employee.employee_name} — {self.month}/{self.year}"


class TeamRanking(models.Model):
    team_name      = models.CharField(max_length=200)
    team_type      = models.CharField(max_length=20, choices=TEAM_TYPE_CHOICES)
    total_sqft     = models.FloatField(default=0)
    total_units    = models.IntegerField(default=0)
    total_bookings = models.IntegerField(default=0)
    member_count   = models.IntegerField(default=0)
    rank           = models.IntegerField(default=0)
    month          = models.IntegerField()
    year           = models.IntegerField()

    class Meta:
        unique_together = ['team_name', 'team_type', 'month', 'year']
        ordering = ['team_type', 'rank']

    def __str__(self):
        return f"{self.team_name} Rank #{self.rank} ({self.month}/{self.year})"


class UploadHistory(models.Model):
    uploaded_by       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    uploaded_at       = models.DateTimeField(auto_now_add=True)
    filename          = models.CharField(max_length=500)
    month             = models.IntegerField()
    year              = models.IntegerField()
    records_processed = models.IntegerField(default=0)
    records_added     = models.IntegerField(default=0)
    records_updated   = models.IntegerField(default=0)
    errors_count      = models.IntegerField(default=0)
    error_report      = models.JSONField(default=list)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.filename} by {self.uploaded_by} ({self.month}/{self.year})"

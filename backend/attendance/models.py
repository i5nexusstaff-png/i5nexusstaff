from django.db import models
from django.conf import settings
import math


def haversine_m(lat1, lng1, lat2, lng2):
    """Return distance in metres between two GPS coordinates."""
    R = 6371000
    phi1, phi2 = math.radians(float(lat1)), math.radians(float(lat2))
    a = (math.sin(math.radians(float(lat2) - float(lat1)) / 2) ** 2
         + math.cos(phi1) * math.cos(phi2)
         * math.sin(math.radians(float(lng2) - float(lng1)) / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(min(1.0, a)))


class AttendanceSettings(models.Model):
    """Singleton (pk=1) — company-wide attendance configuration."""
    shift_start      = models.TimeField(default='09:00')
    shift_end        = models.TimeField(default='18:00')
    grace_minutes    = models.IntegerField(default=15)
    geofence_enabled = models.BooleanField(default=True)

    class Meta:
        verbose_name = verbose_name_plural = 'Attendance Settings'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return 'Attendance Settings'


class OfficeLocation(models.Model):
    """One pinned office location used for geofencing."""
    name          = models.CharField(max_length=200)
    lat           = models.FloatField()
    lng           = models.FloatField()
    radius_meters = models.IntegerField(default=50)
    address       = models.CharField(max_length=500, blank=True)
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Attendance(models.Model):
    STATUS_CHOICES     = [('present','Present'),('absent','Absent'),('half_day','Half Day'),('leave','On Leave')]
    PUNCH_MODE_CHOICES = [('geofence','Geofence'),('gps_tagged','GPS Tagged')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField()
    punch_in = models.DateTimeField(null=True, blank=True)
    punch_out = models.DateTimeField(null=True, blank=True)
    punch_in_selfie  = models.ImageField(upload_to='attendance/selfies/', null=True, blank=True)
    punch_out_selfie = models.ImageField(upload_to='attendance/selfies/', null=True, blank=True)
    punch_in_lat     = models.FloatField(null=True, blank=True)
    punch_in_lng     = models.FloatField(null=True, blank=True)
    punch_in_address = models.CharField(max_length=500, blank=True)
    punch_out_lat    = models.FloatField(null=True, blank=True)
    punch_out_lng    = models.FloatField(null=True, blank=True)
    punch_out_address = models.CharField(max_length=500, blank=True)
    site_location    = models.CharField(max_length=255, blank=True)
    punch_mode       = models.CharField(max_length=20, choices=PUNCH_MODE_CHOICES, blank=True)
    within_geofence  = models.BooleanField(null=True, blank=True)   # True=inside, False=outside, None=no fence/GPS denied
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present')
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ['user', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.date}"

    @property
    def hours_worked(self):
        if self.punch_in and self.punch_out:
            delta = self.punch_out - self.punch_in
            return round(delta.total_seconds() / 3600, 2)
        return None

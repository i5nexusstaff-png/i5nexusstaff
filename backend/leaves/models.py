from django.db import models
from django.conf import settings


class LeaveRequest(models.Model):
    TYPE_CHOICES = [('casual','Casual'),('sick','Sick'),('emergency','Emergency'),('other','Other')]
    STATUS_CHOICES = [('pending','Pending'),('approved','Approved'),('rejected','Rejected')]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='casual')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='leaves_reviewed')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.leave_type} ({self.start_date} to {self.end_date})"

    @property
    def days_count(self):
        return (self.end_date - self.start_date).days + 1

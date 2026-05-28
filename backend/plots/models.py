from django.db import models
from projects.models import Project


class Plot(models.Model):
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('booked', 'Booked'),
        ('in_process', 'In Process'),
        ('blocked', 'Blocked'),
        ('sold', 'Sold'),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='plots')
    plot_no = models.CharField(max_length=50)
    area_sqft = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    facing = models.CharField(max_length=100, blank=True)
    road_width = models.CharField(max_length=100, blank=True)
    rate_per_sqft = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    survey_no = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['project', 'plot_no']
        unique_together = ['project', 'plot_no']

    def __str__(self):
        return f"{self.project.name} - Plot {self.plot_no}"

    def save(self, *args, **kwargs):
        if self.rate_per_sqft and self.area_sqft and not self.total_cost:
            self.total_cost = self.rate_per_sqft * self.area_sqft
        super().save(*args, **kwargs)


class BookingRequest(models.Model):
    REQUEST_STATUS = [
        ('pending',  'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('on_hold',  'On Hold'),
    ]

    REQUESTED_STATUS_CHOICES = [
        ('blocked', 'Blocked'),
        ('booked',  'Booked'),
        ('sold',    'Sold'),
    ]

    plot          = models.ForeignKey(Plot, on_delete=models.CASCADE, related_name='booking_requests')
    requested_status = models.CharField(
        max_length=20,
        choices=REQUESTED_STATUS_CHOICES,
        default='blocked',
    )
    requested_by  = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, related_name='booking_requests'
    )
    reviewed_by   = models.ForeignKey(
        'accounts.User', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='reviewed_bookings'
    )
    status         = models.CharField(max_length=20, choices=REQUEST_STATUS, default='pending')
    customer_name  = models.CharField(max_length=200, blank=True)
    customer_phone = models.CharField(max_length=20, blank=True)
    notes          = models.TextField(blank=True)
    admin_notes    = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'BookingRequest #{self.id} – {self.plot} ({self.status})'

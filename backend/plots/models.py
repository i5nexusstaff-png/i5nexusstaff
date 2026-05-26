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

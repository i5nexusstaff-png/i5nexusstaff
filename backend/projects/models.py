from django.db import models


class Project(models.Model):
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    total_plots = models.IntegerField(default=0)
    image = models.ImageField(upload_to='projects/', null=True, blank=True)
    layout_image = models.ImageField(upload_to='projects/layouts/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    # NOTE: sold_plots, available_plots and sold_percentage are provided via
    # ORM annotations in ProjectViewSet.get_queryset() — no @property needed.
    # Keeping a lightweight helper only for non-queryset call-sites.
    def get_plot_summary(self):
        """One-shot summary used outside the viewset. Avoids multiple queries."""
        from django.db.models import Count, Q
        result = self.plots.aggregate(
            total=Count('id'),
            sold=Count('id', filter=Q(status='sold')),
            available=Count('id', filter=Q(status='available')),
        )
        total = result['total'] or 0
        sold = result['sold'] or 0
        return {
            'total': total,
            'sold': sold,
            'available': result['available'] or 0,
            'sold_percentage': round((sold / total) * 100, 1) if total else 0,
        }

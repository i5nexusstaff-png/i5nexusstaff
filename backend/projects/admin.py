from django.contrib import admin
from django.db.models import Count, Q
from .models import Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'location', 'total_plots', 'get_sold_plots', 'get_available_plots', 'get_sold_percentage']
    search_fields = ['name', 'location']
    readonly_fields = ['created_at', 'updated_at']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _sold_plots=Count('plots', filter=Q(plots__status='sold')),
            _available_plots=Count('plots', filter=Q(plots__status='available')),
            _total_plot_count=Count('plots'),
        )

    @admin.display(description='Sold', ordering='_sold_plots')
    def get_sold_plots(self, obj):
        return getattr(obj, '_sold_plots', 0)

    @admin.display(description='Available', ordering='_available_plots')
    def get_available_plots(self, obj):
        return getattr(obj, '_available_plots', 0)

    @admin.display(description='Sold %', ordering='_sold_plots')
    def get_sold_percentage(self, obj):
        total = getattr(obj, '_total_plot_count', 0)
        sold = getattr(obj, '_sold_plots', 0)
        return f"{round((sold / total) * 100, 1)}%" if total else "0%"

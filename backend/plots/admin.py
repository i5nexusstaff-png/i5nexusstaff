from django.contrib import admin
from .models import Plot


@admin.register(Plot)
class PlotAdmin(admin.ModelAdmin):
    list_display = ['project', 'plot_no', 'area_sqft', 'facing', 'rate_per_sqft', 'total_cost', 'status', 'survey_no']
    list_filter = ['project', 'status', 'facing']
    search_fields = ['plot_no', 'survey_no']
    readonly_fields = ['created_at', 'updated_at']
    list_editable = ['status']

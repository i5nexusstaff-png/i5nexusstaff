from rest_framework import serializers
from .models import Plot


class PlotSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Plot
        fields = [
            'id', 'project', 'project_name', 'plot_no', 'area_sqft',
            'facing', 'road_width', 'rate_per_sqft', 'total_cost',
            'survey_no', 'status', 'notes', 'created_at', 'updated_at',
        ]

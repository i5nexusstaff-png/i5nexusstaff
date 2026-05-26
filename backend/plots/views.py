from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Plot
from .serializers import PlotSerializer


class PlotViewSet(viewsets.ModelViewSet):
    queryset = Plot.objects.select_related('project').all()
    serializer_class = PlotSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['plot_no', 'facing', 'survey_no', 'status']
    ordering_fields = ['plot_no', 'area_sqft', 'rate_per_sqft', 'total_cost', 'status']

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        status = self.request.query_params.get('status')
        if project_id:
            qs = qs.filter(project_id=project_id)
        if status:
            qs = qs.filter(status=status)
        return qs

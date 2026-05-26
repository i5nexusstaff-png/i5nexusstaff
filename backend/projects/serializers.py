from rest_framework import serializers
from .models import Project


class ProjectListSerializer(serializers.ModelSerializer):
    # These are populated via ORM annotations in ProjectViewSet.get_queryset().
    # Using IntegerField(default=0) so non-annotated instances don't raise errors.
    sold_plots       = serializers.IntegerField(read_only=True, default=0)
    available_plots  = serializers.IntegerField(read_only=True, default=0)
    sold_percentage  = serializers.SerializerMethodField()
    total_plots      = serializers.ReadOnlyField()
    image_url        = serializers.SerializerMethodField()
    layout_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'location', 'description', 'total_plots',
            'sold_plots', 'available_plots', 'sold_percentage',
            'image', 'image_url', 'layout_image', 'layout_image_url',
            'created_at', 'updated_at',
        ]

    def get_sold_percentage(self, obj):
        # `total_plot_count` is the annotated live count; fall back to model field.
        total = getattr(obj, 'total_plot_count', None)
        if total is None:
            total = obj.total_plots or 0
        if total == 0:
            return 0
        sold = getattr(obj, 'sold_plots', 0) or 0
        return round((sold / total) * 100, 1)

    def _build_url(self, field_value):
        if not field_value:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(field_value.url)
        return None

    def get_image_url(self, obj):
        return self._build_url(obj.image)

    def get_layout_image_url(self, obj):
        return self._build_url(obj.layout_image)


class ProjectDetailSerializer(ProjectListSerializer):
    class Meta(ProjectListSerializer.Meta):
        fields = ProjectListSerializer.Meta.fields

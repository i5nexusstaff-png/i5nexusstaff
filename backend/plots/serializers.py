from rest_framework import serializers
from .models import Plot, BookingRequest


class PlotSerializer(serializers.ModelSerializer):
    project_name    = serializers.CharField(source='project.name', read_only=True)
    pending_booking = serializers.SerializerMethodField()

    class Meta:
        model  = Plot
        fields = [
            'id', 'project', 'project_name', 'plot_no', 'area_sqft',
            'facing', 'road_width', 'rate_per_sqft', 'total_cost',
            'survey_no', 'status', 'notes', 'pending_booking',
            'created_at', 'updated_at',
        ]

    def get_pending_booking(self, obj):
        req = obj.booking_requests.filter(status__in=['pending', 'on_hold']).first()
        if req:
            return {
                'id':               req.id,
                'customer_name':    req.customer_name,
                'customer_phone':   req.customer_phone,
                'notes':            req.notes,
                'requested_by':     req.requested_by.get_full_name() or req.requested_by.username,
                'requested_by_id':  req.requested_by_id,
                'requested_status': req.requested_status,
                'request_status':   req.status,
                'created_at':       req.created_at.isoformat(),
            }
        return None


class BookingRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.SerializerMethodField()
    reviewed_by_name  = serializers.SerializerMethodField()
    plot_no    = serializers.CharField(source='plot.plot_no',    read_only=True)
    area_sqft  = serializers.DecimalField(
        source='plot.area_sqft', max_digits=12, decimal_places=2, read_only=True
    )
    total_cost = serializers.DecimalField(
        source='plot.total_cost', max_digits=14, decimal_places=2, read_only=True
    )
    facing     = serializers.CharField(source='plot.facing',    read_only=True)
    project_id = serializers.IntegerField(source='plot.project_id', read_only=True)

    class Meta:
        model  = BookingRequest
        fields = [
            'id', 'plot', 'plot_no', 'area_sqft', 'total_cost', 'facing', 'project_id',
            'requested_by', 'requested_by_name',
            'reviewed_by',  'reviewed_by_name',
            'status', 'requested_status',
            'customer_name', 'customer_phone',
            'notes', 'admin_notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['requested_by', 'reviewed_by', 'status']

    def get_requested_by_name(self, obj):
        u = obj.requested_by
        return u.get_full_name() or u.username

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            u = obj.reviewed_by
            return u.get_full_name() or u.username
        return None

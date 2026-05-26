from rest_framework import serializers
from .models import Attendance, OfficeLocation, AttendanceSettings
from accounts.serializers import UserMiniSerializer


class OfficeLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = OfficeLocation
        fields = ['id', 'name', 'lat', 'lng', 'radius_meters', 'address', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class AttendanceSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AttendanceSettings
        fields = ['id', 'shift_start', 'shift_end', 'grace_minutes', 'geofence_enabled']


def _abs_url(request, field):
    """Return absolute URL for an ImageField, works with or without request context."""
    if not field:
        return None
    if request:
        return request.build_absolute_uri(field.url)
    return f'http://localhost:8000{field.url}'


class AttendanceSerializer(serializers.ModelSerializer):
    user_detail          = UserMiniSerializer(source='user', read_only=True)
    hours_worked         = serializers.ReadOnlyField()
    selfie_url           = serializers.SerializerMethodField()
    punch_out_selfie_url = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = [
            'id', 'user', 'user_detail', 'date',
            'punch_in', 'punch_out',
            'punch_in_selfie',  'selfie_url',
            'punch_out_selfie', 'punch_out_selfie_url',
            'punch_in_lat',  'punch_in_lng',  'punch_in_address',
            'punch_out_lat', 'punch_out_lng', 'punch_out_address',
            'site_location', 'punch_mode', 'within_geofence',
            'status', 'notes', 'hours_worked',
        ]
        read_only_fields = ['user']

    def get_selfie_url(self, obj):
        return _abs_url(self.context.get('request'), obj.punch_in_selfie)

    def get_punch_out_selfie_url(self, obj):
        return _abs_url(self.context.get('request'), obj.punch_out_selfie)

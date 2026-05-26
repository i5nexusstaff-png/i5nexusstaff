from django.contrib import admin
from .models import Attendance, OfficeLocation, AttendanceSettings


@admin.register(OfficeLocation)
class OfficeLocationAdmin(admin.ModelAdmin):
    list_display = ['name', 'lat', 'lng', 'radius_meters', 'is_active', 'created_at']
    list_filter  = ['is_active']
    search_fields = ['name', 'address']


@admin.register(AttendanceSettings)
class AttendanceSettingsAdmin(admin.ModelAdmin):
    list_display = ['shift_start', 'shift_end', 'grace_minutes', 'geofence_enabled']


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display  = ['user', 'date', 'punch_in', 'punch_out', 'status', 'site_location']
    list_filter   = ['status', 'date']
    search_fields = ['user__username', 'user__first_name', 'user__last_name']
    raw_id_fields = ['user']

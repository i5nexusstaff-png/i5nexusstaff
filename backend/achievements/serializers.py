from rest_framework import serializers
from .models import Achievement, TeamMember, TeamAchievement, TeamRanking, UploadHistory
from accounts.serializers import UserMiniSerializer
import calendar


class AchievementSerializer(serializers.ModelSerializer):
    user_detail = UserMiniSerializer(source='user', read_only=True)

    class Meta:
        model  = Achievement
        fields = ['id', 'user', 'user_detail', 'period_type', 'period_label',
                  'plots_sold', 'revenue', 'rank', 'created_at', 'updated_at']
        read_only_fields = ['rank', 'created_at', 'updated_at']


class TeamMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TeamMember
        fields = ['id', 'employee_name', 'designation',
                  'department', 'team_type', 'team_name', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class TeamAchievementSerializer(serializers.ModelSerializer):
    employee_detail = TeamMemberSerializer(source='employee', read_only=True)
    month_name      = serializers.SerializerMethodField()

    class Meta:
        model  = TeamAchievement
        fields = ['id', 'employee', 'employee_detail', 'team_name', 'team_type',
                  'site_visits', 'appointments', 'meetings', 'bookings', 'registrations',
                  'square_feet_sold', 'units_sold', 'month', 'year', 'month_name',
                  'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_month_name(self, obj):
        try:
            return calendar.month_name[obj.month]
        except (IndexError, TypeError):
            return ''


class TeamRankingSerializer(serializers.ModelSerializer):
    month_name   = serializers.SerializerMethodField()
    team_type_display = serializers.SerializerMethodField()

    class Meta:
        model  = TeamRanking
        fields = ['id', 'team_name', 'team_type', 'team_type_display',
                  'total_sqft', 'total_units', 'total_bookings', 'member_count',
                  'rank', 'month', 'year', 'month_name']

    def get_month_name(self, obj):
        try:
            return calendar.month_name[obj.month]
        except (IndexError, TypeError):
            return ''

    def get_team_type_display(self, obj):
        return 'Pre-Sales' if obj.team_type == 'pre_sales' else 'Sales'


class UploadHistorySerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    month_name       = serializers.SerializerMethodField()

    class Meta:
        model  = UploadHistory
        fields = ['id', 'uploaded_by', 'uploaded_by_name', 'uploaded_at',
                  'filename', 'month', 'year', 'month_name',
                  'records_processed', 'records_added', 'records_updated',
                  'errors_count', 'error_report']
        read_only_fields = ['uploaded_at']

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.username
        return '—'

    def get_month_name(self, obj):
        try:
            return calendar.month_name[obj.month]
        except (IndexError, TypeError):
            return ''

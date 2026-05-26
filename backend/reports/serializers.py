from rest_framework import serializers
from .models import DailyReport
from accounts.serializers import UserMiniSerializer


class DailyReportSerializer(serializers.ModelSerializer):
    user_detail        = UserMiniSerializer(source='user', read_only=True)
    report_type_label  = serializers.CharField(source='get_report_type_display', read_only=True)

    class Meta:
        model  = DailyReport
        fields = [
            'id', 'user', 'user_detail',
            'report_type', 'report_type_label',
            'report_date', 'data', 'status', 'admin_notes',
            'submitted_at', 'updated_at', 'created_at',
        ]
        read_only_fields = ['user', 'submitted_at', 'updated_at', 'created_at']

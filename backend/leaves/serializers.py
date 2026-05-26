from rest_framework import serializers
from .models import LeaveRequest
from accounts.serializers import UserMiniSerializer


class LeaveRequestSerializer(serializers.ModelSerializer):
    user_detail = UserMiniSerializer(source='user', read_only=True)
    days_count = serializers.ReadOnlyField()

    class Meta:
        model = LeaveRequest
        fields = ['id','user','user_detail','leave_type','start_date','end_date',
                  'reason','status','admin_notes','reviewed_by','reviewed_at',
                  'days_count','created_at']
        read_only_fields = ['user','status','admin_notes','reviewed_by','reviewed_at','created_at']

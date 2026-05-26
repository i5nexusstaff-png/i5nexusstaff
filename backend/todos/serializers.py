from rest_framework import serializers
from .models import TodoItem
from accounts.serializers import UserMiniSerializer


class TodoItemSerializer(serializers.ModelSerializer):
    completed_by_me = serializers.SerializerMethodField()
    is_completed_by_me = serializers.SerializerMethodField()
    completion_count = serializers.SerializerMethodField()

    class Meta:
        model = TodoItem
        fields = ['id','title','description','priority','status','week_start',
                  'created_by','assigned_to_all','assigned_to','due_date',
                  'completed_by_me','is_completed_by_me','completion_count','created_at']
        read_only_fields = ['created_by']

    def get_completed_by_me(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.completions.filter(id=request.user.id).exists()
        return False

    def get_is_completed_by_me(self, obj):
        return self.get_completed_by_me(obj)

    def get_completion_count(self, obj):
        return obj.completions.count()

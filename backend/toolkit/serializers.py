from rest_framework import serializers
from .models import ToolkitItem


class ToolkitItemSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    file_url         = serializers.SerializerMethodField()

    class Meta:
        model  = ToolkitItem
        fields = [
            'id', 'title', 'description', 'category',
            'file', 'file_url', 'file_name', 'file_type', 'file_size',
            'uploaded_by', 'uploaded_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'file_name', 'file_type', 'file_size',
                            'uploaded_by', 'uploaded_by_name', 'created_at', 'updated_at']

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.username
        return None

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None

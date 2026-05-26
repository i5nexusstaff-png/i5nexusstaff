import os
from rest_framework import serializers
from .models import Tutorial
from accounts.serializers import UserMiniSerializer


def _abs(request, field):
    """Return absolute URL for a FileField/ImageField, or None."""
    if not field:
        return None
    if request:
        return request.build_absolute_uri(field.url)
    return f'http://localhost:8000{field.url}'


class TutorialSerializer(serializers.ModelSerializer):
    uploaded_by_detail = UserMiniSerializer(source='uploaded_by', read_only=True)
    file_url           = serializers.SerializerMethodField()
    thumbnail_url      = serializers.SerializerMethodField()
    file_name          = serializers.SerializerMethodField()
    file_extension     = serializers.SerializerMethodField()
    file_size_display  = serializers.SerializerMethodField()

    class Meta:
        model  = Tutorial
        fields = [
            'id', 'title', 'description', 'file_type',
            'file', 'file_url', 'file_name', 'file_extension',
            'thumbnail', 'thumbnail_url',
            'file_size', 'file_size_display',
            'uploaded_by', 'uploaded_by_detail',
            'uploaded_at', 'views',
        ]
        read_only_fields = ['uploaded_by', 'uploaded_at', 'views', 'file_size']

    def get_file_url(self, obj):
        return _abs(self.context.get('request'), obj.file)

    def get_thumbnail_url(self, obj):
        return _abs(self.context.get('request'), obj.thumbnail)

    def get_file_name(self, obj):
        return os.path.basename(obj.file.name) if obj.file else ''

    def get_file_extension(self, obj):
        return obj.file_extension

    def get_file_size_display(self, obj):
        size = obj.file_size
        if not size:
            return ''
        if size < 1024:
            return f'{size} B'
        if size < 1024 * 1024:
            return f'{size / 1024:.1f} KB'
        if size < 1024 * 1024 * 1024:
            return f'{size / (1024 * 1024):.1f} MB'
        return f'{size / (1024 * 1024 * 1024):.2f} GB'

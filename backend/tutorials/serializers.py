from rest_framework import serializers
from .models import Tutorial


class TutorialSerializer(serializers.ModelSerializer):
    video_id      = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    embed_url     = serializers.SerializerMethodField()
    added_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = Tutorial
        fields = [
            'id', 'title', 'description', 'youtube_url',
            'video_id', 'thumbnail_url', 'embed_url',
            'uploaded_by', 'added_by_name', 'uploaded_at', 'views',
        ]
        read_only_fields = ['uploaded_by', 'uploaded_at', 'views']

    def get_video_id(self, obj):
        return obj.video_id

    def get_thumbnail_url(self, obj):
        vid = obj.video_id
        return f'https://img.youtube.com/vi/{vid}/hqdefault.jpg' if vid else None

    def get_embed_url(self, obj):
        vid = obj.video_id
        return f'https://www.youtube.com/embed/{vid}' if vid else None

    def get_added_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.username
        return None

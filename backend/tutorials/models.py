import re
from django.db import models
from django.conf import settings


def extract_video_id(url):
    """Extract YouTube video ID from any common URL format."""
    patterns = [
        r'youtu\.be/([^?&/\s]+)',
        r'youtube\.com/watch\?v=([^&/\s]+)',
        r'youtube\.com/embed/([^?&/\s]+)',
        r'youtube\.com/v/([^?&/\s]+)',
        r'youtube\.com/shorts/([^?&/\s]+)',
    ]
    for pattern in patterns:
        m = re.search(pattern, url)
        if m:
            return m.group(1)
    return None


class Tutorial(models.Model):
    title       = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    youtube_url = models.URLField(max_length=500)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='tutorials',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    views       = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.title

    @property
    def video_id(self):
        return extract_video_id(self.youtube_url)

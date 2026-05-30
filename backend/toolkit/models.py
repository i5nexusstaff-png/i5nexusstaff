import os
from django.db import models
from django.conf import settings


def toolkit_upload_path(instance, filename):
    ext = os.path.splitext(filename)[1].lower()
    safe = filename.replace(' ', '_')
    return f'toolkit/{safe}'


def _detect_type(filename):
    ext = os.path.splitext(filename)[1].lower()
    images = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'}
    docs   = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'}
    videos = {'.mp4', '.mov', '.avi', '.mkv', '.webm'}
    audio  = {'.mp3', '.wav', '.ogg', '.m4a'}
    if ext in images: return 'image'
    if ext in docs:   return 'document'
    if ext in videos: return 'video'
    if ext in audio:  return 'audio'
    return 'other'


class ToolkitItem(models.Model):
    title       = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category    = models.CharField(max_length=100, blank=True)
    file        = models.FileField(upload_to=toolkit_upload_path)
    file_name   = models.CharField(max_length=255, blank=True)
    file_type   = models.CharField(max_length=20, blank=True)   # image|document|video|audio|other
    file_size   = models.PositiveIntegerField(default=0)         # bytes
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='toolkit_uploads',
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if self.file and not self.file_name:
            self.file_name = os.path.basename(self.file.name)
        if self.file and not self.file_type:
            self.file_type = _detect_type(self.file_name or '')
        if self.file and not self.file_size:
            try: self.file_size = self.file.size
            except Exception: pass
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

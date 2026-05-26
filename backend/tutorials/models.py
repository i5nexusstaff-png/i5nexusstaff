import os
from django.db import models
from django.conf import settings


class Tutorial(models.Model):
    TYPE_CHOICES = [('video','Video'), ('document','Document'),
                    ('image','Image'), ('other','Other')]

    title        = models.CharField(max_length=255)
    description  = models.TextField(blank=True)
    file_type    = models.CharField(max_length=20, choices=TYPE_CHOICES, default='document')
    file         = models.FileField(upload_to='tutorials/')
    thumbnail    = models.ImageField(upload_to='tutorials/thumbs/', null=True, blank=True)
    file_size    = models.PositiveIntegerField(default=0)   # bytes
    uploaded_by  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    uploaded_at  = models.DateTimeField(auto_now_add=True)
    views        = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.title

    @property
    def original_filename(self):
        return os.path.basename(self.file.name) if self.file else ''

    @property
    def file_extension(self):
        _, ext = os.path.splitext(self.original_filename)
        return ext.lower().lstrip('.')

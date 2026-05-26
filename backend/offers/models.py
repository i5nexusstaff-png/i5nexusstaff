from django.db import models
from django.conf import settings


THEME_CHOICES = [
    ('orange', 'Orange'),
    ('purple', 'Purple'),
    ('blue',   'Blue'),
    ('green',  'Green'),
    ('red',    'Red'),
    ('gold',   'Gold'),
]


class Offer(models.Model):
    title       = models.CharField(max_length=200)
    description = models.TextField()
    reward      = models.CharField(max_length=200, blank=True)
    emoji       = models.CharField(max_length=10, default='🎯')
    color_theme = models.CharField(max_length=20, choices=THEME_CHOICES, default='orange')
    priority    = models.PositiveSmallIntegerField(default=5)
    is_active   = models.BooleanField(default=True)
    created_by  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    expires_at  = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['priority', '-created_at']

    def __str__(self):
        return self.title

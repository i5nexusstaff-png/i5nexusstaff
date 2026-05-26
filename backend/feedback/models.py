from django.db import models
from django.conf import settings


class Feedback(models.Model):
    CATEGORY_CHOICES = [
        ('general','General'),('complaint','Complaint'),('suggestion','Suggestion'),('appreciation','Appreciation'),
    ]
    STATUS_CHOICES = [('unread','Unread'),('read','Read'),('replied','Replied')]

    from_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='feedbacks_sent')
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='general')
    subject = models.CharField(max_length=200)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unread')
    admin_reply = models.TextField(blank=True)
    replied_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.from_user.get_full_name()} - {self.subject}"

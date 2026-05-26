from django.db import models
from django.conf import settings


class TodoItem(models.Model):
    PRIORITY_CHOICES = [('low','Low'),('medium','Medium'),('high','High')]
    STATUS_CHOICES   = [('todo','To-do'),('in_progress','In Progress'),('done','Done')]

    title       = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    priority    = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    week_start  = models.DateField()
    created_by  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='todos_created')
    assigned_to_all = models.BooleanField(default=True)
    assigned_to = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='todos_assigned')
    completions = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='todos_completed')
    due_date    = models.DateField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-week_start', 'priority']

    def __str__(self):
        return self.title

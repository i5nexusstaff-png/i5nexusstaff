from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
import datetime
from .models import TodoItem
from .serializers import TodoItemSerializer


def get_week_start():
    today = timezone.localdate()
    return today - datetime.timedelta(days=today.weekday())


class TodoViewSet(viewsets.ModelViewSet):
    serializer_class = TodoItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        week_start = self.request.query_params.get('week_start', str(get_week_start()))
        qs = TodoItem.objects.filter(week_start=week_start)
        user = self.request.user
        if user.role == 'staff':
            qs = qs.filter(assigned_to_all=True) | qs.filter(assigned_to=user)
        return qs.distinct()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def perform_create(self, serializer):
        if not self.request.data.get('week_start'):
            serializer.save(created_by=self.request.user, week_start=get_week_start())
        else:
            serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def toggle_complete(self, request, pk=None):
        todo = self.get_object()
        user = request.user
        if todo.completions.filter(id=user.id).exists():
            todo.completions.remove(user)
            done = False
        else:
            todo.completions.add(user)
            done = True
        return Response({'completed': done, 'completion_count': todo.completions.count()})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        todo = self.get_object()
        todo.completions.add(request.user)
        return Response({'completed': True, 'completion_count': todo.completions.count()})

    @action(detail=True, methods=['post'])
    def uncomplete(self, request, pk=None):
        todo = self.get_object()
        todo.completions.remove(request.user)
        return Response({'completed': False, 'completion_count': todo.completions.count()})

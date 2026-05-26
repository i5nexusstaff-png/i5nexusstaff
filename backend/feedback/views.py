from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import Feedback
from .serializers import FeedbackSerializer
from notifications.models import Notification

User = get_user_model()


class FeedbackViewSet(viewsets.ModelViewSet):
    serializer_class = FeedbackSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Feedback.objects.select_related('from_user').all()
        if user.role == 'staff':
            qs = qs.filter(from_user=user)
        return qs

    def perform_create(self, serializer):
        fb = serializer.save(from_user=self.request.user)
        # Notify all admins
        for admin in User.objects.filter(role__in=['admin', 'super_admin'], is_active=True):
            Notification.objects.create(
                recipient=admin,
                title='New Feedback',
                message=f"{self.request.user.get_full_name()} sent a {fb.category}: \"{fb.subject}\"",
                notif_type='feedback',
            )

    @action(detail=False, methods=['get'])
    def my(self, request):
        qs = Feedback.objects.filter(from_user=request.user).order_by('-created_at')
        return Response(FeedbackSerializer(qs, many=True).data)

    @action(detail=True, methods=['patch'])
    def reply(self, request, pk=None):
        fb = self.get_object()
        fb.admin_reply = request.data.get('admin_reply', '')
        fb.status = 'replied'
        fb.replied_at = timezone.now()
        fb.save()
        # Notify the staff member
        Notification.objects.create(
            recipient=fb.from_user,
            title='Admin replied to your feedback',
            message=f"Your feedback \"{fb.subject}\" received a reply from admin.",
            notif_type='feedback',
        )
        return Response(FeedbackSerializer(fb).data)

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        fb = self.get_object()
        if fb.status == 'unread':
            fb.status = 'read'
            fb.save()
        return Response(FeedbackSerializer(fb).data)

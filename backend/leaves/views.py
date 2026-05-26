from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.contrib.auth import get_user_model
from .models import LeaveRequest
from .serializers import LeaveRequestSerializer
from notifications.models import Notification

User = get_user_model()


class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = LeaveRequest.objects.select_related('user', 'reviewed_by').all()
        if user.role == 'staff':
            qs = qs.filter(user=user)
        status_f = self.request.query_params.get('status')
        if status_f:
            qs = qs.filter(status=status_f)
        return qs

    def perform_create(self, serializer):
        leave = serializer.save(user=self.request.user)
        # Notify all admins
        for admin in User.objects.filter(role__in=['admin', 'super_admin'], is_active=True):
            Notification.objects.create(
                recipient=admin,
                title='New Leave Request',
                message=f"{self.request.user.get_full_name()} applied for {leave.leave_type} leave from {leave.start_date} to {leave.end_date}.",
                notif_type='leave',
            )

    @action(detail=False, methods=['get'])
    def my(self, request):
        qs = LeaveRequest.objects.filter(user=request.user).order_by('-created_at')
        return Response(LeaveRequestSerializer(qs, many=True).data)

    @action(detail=True, methods=['patch'])
    def review(self, request, pk=None):
        leave = self.get_object()
        leave.status = request.data.get('status', 'approved')
        leave.admin_notes = request.data.get('admin_notes', '')
        leave.reviewed_by = request.user
        leave.reviewed_at = timezone.now()
        leave.save()
        # Notify the staff member
        emoji = '✅' if leave.status == 'approved' else '❌'
        Notification.objects.create(
            recipient=leave.user,
            title=f'Leave {leave.status.capitalize()}',
            message=f"{emoji} Your {leave.leave_type} leave request ({leave.start_date} to {leave.end_date}) has been {leave.status}.",
            notif_type='leave',
        )
        return Response(LeaveRequestSerializer(leave).data)

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification, PushSubscription
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

    @action(detail=False, methods=['get'])
    def unread(self, request):
        qs = self.get_queryset().filter(is_read=False)
        return Response(NotificationSerializer(qs, many=True).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': 'ok'})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        # Use update() instead of get-set-save to avoid a second SELECT + full-row UPDATE
        self.get_queryset().filter(pk=pk).update(is_read=True)
        return Response({'status': 'ok'})

    # ── Push subscription management ──

    @action(detail=False, methods=['post'], url_path='push/subscribe')
    def push_subscribe(self, request):
        endpoint = request.data.get('endpoint')
        keys     = request.data.get('keys', {})
        p256dh   = keys.get('p256dh')
        auth     = keys.get('auth')

        if not all([endpoint, p256dh, auth]):
            return Response({'error': 'Missing subscription fields'}, status=400)

        PushSubscription.objects.update_or_create(
            user=request.user,
            endpoint=endpoint,
            defaults={'p256dh': p256dh, 'auth': auth},
        )
        return Response({'status': 'subscribed'})

    @action(detail=False, methods=['post'], url_path='push/unsubscribe')
    def push_unsubscribe(self, request):
        endpoint = request.data.get('endpoint')
        PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
        return Response({'status': 'unsubscribed'})

    @action(detail=False, methods=['get'], url_path='push/vapid-key')
    def vapid_key(self, request):
        from django.conf import settings
        key = getattr(settings, 'VAPID_PUBLIC_KEY', '')
        return Response({'vapid_public_key': key})

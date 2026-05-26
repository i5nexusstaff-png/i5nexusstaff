from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import Offer
from .serializers import OfferSerializer
from accounts.permissions import IsAdminRole


class OfferViewSet(viewsets.ModelViewSet):
    serializer_class = OfferSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Offer.objects.all()

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminRole()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def active(self, request):
        today = timezone.localdate()
        qs = Offer.objects.filter(is_active=True).filter(
            expires_at__isnull=True
        ) | Offer.objects.filter(is_active=True, expires_at__gte=today)
        return Response(OfferSerializer(qs.distinct(), many=True).data)

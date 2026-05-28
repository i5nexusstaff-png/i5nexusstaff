from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PlotViewSet, BookingRequestViewSet

router = DefaultRouter()
router.register(r'plots',           PlotViewSet,          basename='plot')
router.register(r'booking-requests', BookingRequestViewSet, basename='booking-request')

urlpatterns = [
    path('', include(router.urls)),
]

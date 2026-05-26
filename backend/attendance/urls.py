from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AttendanceViewSet, OfficeLocationViewSet, AttendanceSettingsViewSet

router = DefaultRouter()
router.register(r'attendance',           AttendanceViewSet,         basename='attendance')
router.register(r'office-locations',     OfficeLocationViewSet,     basename='office-locations')
router.register(r'attendance-settings',  AttendanceSettingsViewSet, basename='attendance-settings')

urlpatterns = [path('', include(router.urls))]

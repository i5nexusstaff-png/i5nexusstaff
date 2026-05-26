from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DailyReportViewSet

router = DefaultRouter()
router.register(r'reports', DailyReportViewSet, basename='report')
urlpatterns = [path('', include(router.urls))]

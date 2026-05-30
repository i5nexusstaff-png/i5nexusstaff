from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ToolkitViewSet

router = DefaultRouter()
router.register(r'toolkit', ToolkitViewSet, basename='toolkit')

urlpatterns = [path('', include(router.urls))]

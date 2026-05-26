from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AchievementViewSet, TeamAchievementViewSet, TeamMemberViewSet, UploadHistoryViewSet

router = DefaultRouter()
router.register(r'achievements',        AchievementViewSet,     basename='achievement')
router.register(r'team-achievements',   TeamAchievementViewSet, basename='team-achievement')
router.register(r'team-members',        TeamMemberViewSet,      basename='team-member')
router.register(r'upload-history',      UploadHistoryViewSet,   basename='upload-history')

urlpatterns = [path('', include(router.urls))]

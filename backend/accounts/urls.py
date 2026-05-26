from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import CustomTokenObtainPairView, UserViewSet, forgot_password_request, forgot_password_verify, CompanyProfileViewSet
from .excel_import import ExcelImportView

router = DefaultRouter()
router.register(r'users',           UserViewSet,           basename='user')
router.register(r'company-profile', CompanyProfileViewSet, basename='company-profile')

urlpatterns = [
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/forgot-password/', forgot_password_request, name='forgot_password'),
    path('auth/reset-password/', forgot_password_verify, name='reset_password'),
    path('excel-import/', ExcelImportView.as_view(), name='excel_import'),
    path('', include(router.urls)),
]

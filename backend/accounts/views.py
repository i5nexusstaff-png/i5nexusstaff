from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes as pc, throttle_classes as tc
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone
from .serializers import UserSerializer, UserMiniSerializer, CompanyProfileSerializer
from .models import PasswordResetOTP, CompanyProfile


class AuthRateThrottle(AnonRateThrottle):
    """5 requests/minute per IP for login and OTP endpoints (set via THROTTLE_AUTH in .env)."""
    scope = 'auth'

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['user'] = {
            'id': user.id,
            'username': user.username,
            'full_name': user.get_full_name() or user.username,
            'role': user.role,
            'position': user.position,
            'department': user.department,
            'email': user.email,
            'phone': user.phone,
            'profile_photo': user.profile_photo.url if user.profile_photo else None,
            'employee_id': user.employee_id,
            'site_location': user.site_location,
            'site_lat': user.site_lat,
            'site_lng': user.site_lng,
        }
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [AuthRateThrottle]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('first_name')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'])
    def update_me(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def staff_list(self, request):
        users = User.objects.filter(role='staff').order_by('first_name')
        serializer = UserMiniSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def set_role(self, request, pk=None):
        """Promote or demote a user's role. Admin only."""
        if request.user.role not in ('admin', 'super_admin'):
            return Response({'error': 'Admin access required'}, status=403)
        user = self.get_object()
        new_role = request.data.get('role')
        if new_role not in ['admin', 'staff', 'super_admin']:
            return Response({'error': 'Role must be admin, staff, or super_admin'}, status=400)
        user.role = new_role
        user.is_staff = (new_role == 'admin')
        user.save()
        return Response({'status': 'ok', 'username': user.username, 'role': user.role})


@api_view(['POST'])
@pc([AllowAny])
@tc([AuthRateThrottle])
def forgot_password_request(request):
    username = request.data.get('username', '').strip()
    if not username:
        return Response({'error': 'Username is required'}, status=400)
    try:
        user = User.objects.get(username=username, is_active=True)
    except User.DoesNotExist:
        return Response({'error': 'No active account found with that username'}, status=404)
    if not user.phone:
        return Response({'error': 'No phone number registered for this account. Contact admin.'}, status=400)

    otp_obj = PasswordResetOTP.generate_for(user)

    # Log OTP to console (replace with SMS gateway in production)
    print(f"\n{'='*40}")
    print(f"OTP for {user.username} ({user.get_full_name()}): {otp_obj.otp_code}")
    print(f"Phone: {user.phone}")
    print(f"{'='*40}\n")

    masked_phone = user.phone[-4:].rjust(len(user.phone), '*')
    return Response({
        'message': f'OTP sent to {masked_phone}',
        'masked_phone': masked_phone,
        'name': user.get_full_name() or user.username,
    })


@api_view(['POST'])
@pc([AllowAny])
@tc([AuthRateThrottle])
def forgot_password_verify(request):
    username = request.data.get('username', '').strip()
    otp_code = request.data.get('otp', '').strip()
    new_password = request.data.get('new_password', '').strip()

    if not all([username, otp_code, new_password]):
        return Response({'error': 'Username, OTP, and new password are required'}, status=400)
    if len(new_password) < 6:
        return Response({'error': 'Password must be at least 6 characters'}, status=400)

    try:
        user = User.objects.get(username=username, is_active=True)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    otp_obj = PasswordResetOTP.objects.filter(
        user=user, otp_code=otp_code, is_used=False
    ).order_by('-created_at').first()

    if not otp_obj:
        return Response({'error': 'Invalid OTP'}, status=400)
    if not otp_obj.is_valid():
        return Response({'error': 'OTP has expired. Please request a new one.'}, status=400)

    user.set_password(new_password)
    user.save()
    otp_obj.is_used = True
    otp_obj.save()
    return Response({'message': 'Password reset successful. Please login with your new password.'})


# ─── Company Profile (singleton, admin-write, all-read) ────────────────────────
class CompanyProfileViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _ctx(self):
        return {'request': self.request}

    def list(self, request):
        obj = CompanyProfile.get()
        return Response(CompanyProfileSerializer(obj, context=self._ctx()).data)

    def create(self, request):
        if request.user.role not in ('admin', 'super_admin'):
            return Response({'error': 'Admin only'}, status=403)
        obj = CompanyProfile.get()
        ser = CompanyProfileSerializer(obj, data=request.data, partial=True, context=self._ctx())
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

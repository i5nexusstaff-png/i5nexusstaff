from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.contrib.auth import get_user_model
import datetime
from .models import Attendance, OfficeLocation, AttendanceSettings, haversine_m
from .serializers import AttendanceSerializer, OfficeLocationSerializer, AttendanceSettingsSerializer

User = get_user_model()


def _serialize(att, request):
    return AttendanceSerializer(att, context={'request': request}).data


def _has_active_fences():
    """True when geofencing is enabled and at least one active location exists."""
    settings_obj = AttendanceSettings.get()
    if not settings_obj.geofence_enabled:
        return False
    return OfficeLocation.objects.filter(is_active=True).exists()


def _check_geofence(lat, lng):
    """
    Returns (allowed, matched_location_or_nearest, distance_m).
    - If geofencing disabled or no active locations → (True, None, None)
    - If lat/lng missing                            → (False, None, None)
    - If within radius of any location              → (True, matched, dist)
    - If outside all locations                      → (False, nearest, dist)
    """
    settings_obj = AttendanceSettings.get()
    if not settings_obj.geofence_enabled:
        return True, None, None

    locations = list(OfficeLocation.objects.filter(is_active=True))
    if not locations:
        return True, None, None   # no fences configured → open

    if lat is None or lng is None:
        return False, None, None  # GPS required when fences exist

    try:
        lat, lng = float(lat), float(lng)
    except (ValueError, TypeError):
        return False, None, None

    best_match = None
    best_dist  = float('inf')

    for loc in locations:
        dist = haversine_m(lat, lng, loc.lat, loc.lng)
        if dist <= loc.radius_meters:
            return True, loc, round(dist)
        if dist < best_dist:
            best_dist  = dist
            best_match = loc

    return False, best_match, round(best_dist)


# ─── 45-day auto-cleanup ──────────────────────────────────────────────────────
def _cleanup_old_records():
    """
    Delete Attendance records (+ their selfie files) older than 45 days.
    Throttled via cache so it runs at most once per 24 h regardless of how
    many admin users trigger it.
    Returns the number of rows deleted.
    """
    from django.core.cache import cache
    if cache.get('_att_cleanup_done'):
        return 0
    cutoff = timezone.now().date() - datetime.timedelta(days=45)
    old_qs = Attendance.objects.filter(date__lt=cutoff)
    # Delete associated media files first so storage is freed
    for att in old_qs.only('id', 'punch_in_selfie', 'punch_out_selfie'):
        for fld in (att.punch_in_selfie, att.punch_out_selfie):
            if fld:
                try:
                    fld.delete(save=False)
                except Exception:
                    pass
    deleted, _ = old_qs.delete()
    cache.set('_att_cleanup_done', True, timeout=86400)   # re-run after 24 h
    return deleted


# ─── Attendance Settings (singleton, admin-write) ──────────────────────────────
class AttendanceSettingsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        obj = AttendanceSettings.get()
        return Response(AttendanceSettingsSerializer(obj).data)

    def create(self, request):
        if request.user.role not in ('admin', 'super_admin'):
            return Response({'error': 'Admin only'}, status=403)
        obj = AttendanceSettings.get()
        ser = AttendanceSettingsSerializer(obj, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


# ─── Office Locations (admin CRUD, all authenticated can read) ─────────────────
class OfficeLocationViewSet(viewsets.ModelViewSet):
    serializer_class   = OfficeLocationSerializer
    permission_classes = [IsAuthenticated]
    queryset           = OfficeLocation.objects.all()
    pagination_class   = None          # always return plain array, never paginated

    def _require_admin(self):
        if self.request.user.role not in ('admin', 'super_admin'):
            return Response({'error': 'Admin only'}, status=403)
        return None

    def create(self, request, *args, **kwargs):
        err = self._require_admin()
        if err: return err
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        err = self._require_admin()
        if err: return err
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        err = self._require_admin()
        if err: return err
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        err = self._require_admin()
        if err: return err
        return super().destroy(request, *args, **kwargs)


# ─── Main Attendance viewset ───────────────────────────────────────────────────
class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class   = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def get_queryset(self):
        user = self.request.user
        qs   = Attendance.objects.select_related('user').all()

        if user.role == 'staff':
            qs = qs.filter(user=user)
        else:
            if self.request.query_params.get('staff_only'):
                qs = qs.filter(user__role='staff')

        date    = self.request.query_params.get('date')
        user_id = self.request.query_params.get('user_id')
        month   = self.request.query_params.get('month')
        year    = self.request.query_params.get('year')
        if date:                               qs = qs.filter(date=date)
        role_f = self.request.query_params.get('role')
        if role_f and user.role in ('admin', 'super_admin'):
            qs = qs.filter(user__role=role_f)
        if user_id and user.role in ('admin', 'super_admin'):   qs = qs.filter(user_id=user_id)
        if month:                              qs = qs.filter(date__month=month)
        if year:                               qs = qs.filter(date__year=year)
        return qs

    def list(self, request, *args, **kwargs):
        # Trigger 45-day cleanup lazily (admin/super_admin calls only, max once/day)
        if request.user.role in ('admin', 'super_admin'):
            try:
                _cleanup_old_records()
            except Exception:
                pass
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    # ── Punch In ─────────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'])
    def punch_in(self, request):
        user  = request.user
        today = timezone.localdate()

        att, created = Attendance.objects.get_or_create(user=user, date=today)
        if not created and att.punch_in:
            return Response({'error': 'Already punched in today'}, status=400)

        lat    = request.data.get('latitude')  or request.data.get('lat')
        lng    = request.data.get('longitude') or request.data.get('lng')
        selfie = request.FILES.get('selfie')
        bypass = request.data.get('bypass_geofence') in (True, 'true', '1', 'True')

        # ── Geofence check ───────────────────────────────────────────────────
        if bypass:
            # Free-location punch (client visit, outside office, GPS denied)
            has_fences = _has_active_fences()
            within_gf  = False if has_fences else None
            mode       = 'gps_tagged'
            location_obj = None
        else:
            allowed, location_obj, dist = _check_geofence(lat, lng)
            if not allowed:
                if created:
                    att.delete()    # remove the brand-new empty record we just created
                if location_obj:
                    return Response({
                        'error': (
                            f'You are {dist}m away from "{location_obj.name}". '
                            f'Must be within {location_obj.radius_meters}m to punch in.'
                        ),
                        'distance': dist,
                        'nearest_office': location_obj.name,
                    }, status=400)
                return Response(
                    {'error': 'GPS location is required for attendance. Please enable location access.'},
                    status=400,
                )
            within_gf = True if location_obj else None
            mode      = 'geofence' if location_obj else 'gps_tagged'

        att.punch_in         = timezone.now()
        att.punch_in_lat     = float(lat) if lat not in (None, '') else None
        att.punch_in_lng     = float(lng) if lng not in (None, '') else None
        att.punch_in_address = request.data.get('address', '')
        att.within_geofence  = within_gf
        att.punch_mode       = mode
        # Store matched office name (or user's site_location as fallback)
        att.site_location    = (location_obj.name if location_obj
                                else getattr(user, 'site_location', '') or '')
        if selfie:
            att.punch_in_selfie = selfie
        att.save()

        return Response(_serialize(att, request))

    # ── Punch Out ────────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'])
    def punch_out(self, request):
        user  = request.user
        today = timezone.localdate()

        try:
            att = Attendance.objects.get(user=user, date=today)
        except Attendance.DoesNotExist:
            return Response({'error': 'No punch-in record found for today'}, status=400)

        if not att.punch_in:
            return Response({'error': 'Please punch in first'}, status=400)
        if att.punch_out:
            return Response({'error': 'Already punched out today'}, status=400)

        lat    = request.data.get('latitude')  or request.data.get('lat')
        lng    = request.data.get('longitude') or request.data.get('lng')
        selfie = request.FILES.get('selfie')
        bypass = request.data.get('bypass_geofence') in (True, 'true', '1', 'True')

        # ── Geofence check ───────────────────────────────────────────────────
        if bypass:
            location_obj = None
        else:
            allowed, location_obj, dist = _check_geofence(lat, lng)
            if not allowed:
                if location_obj:
                    return Response({
                        'error': (
                            f'You are {dist}m away from "{location_obj.name}". '
                            f'Must be within {location_obj.radius_meters}m to punch out.'
                        ),
                        'distance': dist,
                        'nearest_office': location_obj.name,
                    }, status=400)
                return Response(
                    {'error': 'GPS location is required for attendance. Please enable location access.'},
                    status=400,
                )

        att.punch_out         = timezone.now()
        att.punch_out_lat     = float(lat) if lat not in (None, '') else None
        att.punch_out_lng     = float(lng) if lng not in (None, '') else None
        att.punch_out_address = request.data.get('address', '')
        att.status            = 'present'
        if selfie:
            att.punch_out_selfie = selfie
        att.save()

        return Response(_serialize(att, request))

    # ── Today Status ─────────────────────────────────────────────────────────
    @action(detail=False, methods=['get'])
    def today_status(self, request):
        today = timezone.localdate()
        try:
            att = Attendance.objects.get(user=request.user, date=today)
            return Response(_serialize(att, request))
        except Attendance.DoesNotExist:
            return Response({'punch_in': None, 'punch_out': None, 'hours_worked': None})

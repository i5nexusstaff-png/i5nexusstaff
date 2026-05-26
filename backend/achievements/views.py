import calendar
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum, Count

from .models import (Achievement, TeamMember, TeamAchievement,
                     TeamRanking, UploadHistory)
from .serializers import (AchievementSerializer, TeamMemberSerializer,
                           TeamAchievementSerializer, TeamRankingSerializer,
                           UploadHistorySerializer)
from .excel_parser import parse_achievements_excel
from .ranking import recalculate_rankings
from .template_generator import generate_sales_template, generate_presales_template


# ── Existing Achievement ViewSet (unchanged) ──────────────────────────────────

class AchievementViewSet(viewsets.ModelViewSet):
    queryset           = Achievement.objects.select_related('user').all()
    serializer_class   = AchievementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        period_type  = self.request.query_params.get('period_type')
        period_label = self.request.query_params.get('period_label')
        user_id      = self.request.query_params.get('user_id')
        if period_type:  qs = qs.filter(period_type=period_type)
        if period_label: qs = qs.filter(period_label=period_label)
        if user_id:      qs = qs.filter(user_id=user_id)
        return qs.order_by('rank')

    @action(detail=False, methods=['get'])
    def labels(self, request):
        period_type = request.query_params.get('period_type', 'monthly')
        labels = (Achievement.objects
                  .filter(period_type=period_type)
                  .values_list('period_label', flat=True)
                  .distinct()
                  .order_by('-period_label'))
        seen = []
        for l in labels:
            if l not in seen:
                seen.append(l)
        return Response(seen)

    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        period_type = request.query_params.get('period_type', 'monthly')
        now = timezone.localdate()
        if period_type == 'monthly':
            label = now.strftime('%B %Y')
        elif period_type == 'weekly':
            week  = now.isocalendar()[1]
            label = f'Week {week} {now.year}'
        else:
            label = str(now.year)
        period_label = request.query_params.get('period_label', label)
        qs = Achievement.objects.filter(
            period_type=period_type, period_label=period_label
        ).select_related('user').order_by('rank')
        return Response(AchievementSerializer(qs, many=True).data)


# ── Team Achievement ViewSet ──────────────────────────────────────────────────

class TeamMemberViewSet(viewsets.ModelViewSet):
    """Full CRUD for TeamMember (admin only for write)."""
    serializer_class   = TeamMemberSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = TeamMember.objects.all().order_by('team_type', 'team_name', 'employee_name')
        team_type = self.request.query_params.get('team_type')
        team_name = self.request.query_params.get('team_name')
        if team_type: qs = qs.filter(team_type=team_type)
        if team_name: qs = qs.filter(team_name=team_name)
        return qs

    def _require_admin(self, request):
        if getattr(request.user, 'role', None) not in ('admin', 'super_admin'):
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        return None

    def create(self, request, *args, **kwargs):
        err = self._require_admin(request)
        if err: return err
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        err = self._require_admin(request)
        if err: return err
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        err = self._require_admin(request)
        if err: return err
        # Cascade deletes TeamAchievement records via FK
        return super().destroy(request, *args, **kwargs)


class TeamAchievementViewSet(viewsets.ModelViewSet):
    serializer_class   = TeamAchievementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = TeamAchievement.objects.select_related('employee').all()
        month     = self.request.query_params.get('month')
        year      = self.request.query_params.get('year')
        team_type = self.request.query_params.get('team_type')
        team_name = self.request.query_params.get('team_name')
        if month:     qs = qs.filter(month=month)
        if year:      qs = qs.filter(year=year)
        if team_type: qs = qs.filter(team_type=team_type)
        if team_name: qs = qs.filter(team_name=team_name)
        return qs.order_by('team_name', 'employee__employee_name')

    def _require_admin(self, request):
        if getattr(request.user, 'role', None) not in ('admin', 'super_admin'):
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
        return None

    def create(self, request, *args, **kwargs):
        err = self._require_admin(request)
        if err: return err
        resp = super().create(request, *args, **kwargs)
        if resp.status_code == 201:
            obj = TeamAchievement.objects.get(pk=resp.data['id'])
            if obj.team_type == 'sales':
                recalculate_rankings(obj.month, obj.year)
        return resp

    def update(self, request, *args, **kwargs):
        err = self._require_admin(request)
        if err: return err
        resp = super().update(request, *args, **kwargs)
        if resp.status_code in (200, 204):
            obj = self.get_object()
            if obj.team_type == 'sales':
                recalculate_rankings(obj.month, obj.year)
        return resp

    def destroy(self, request, *args, **kwargs):
        err = self._require_admin(request)
        if err: return err
        obj = self.get_object()
        month, year, tt = obj.month, obj.year, obj.team_type
        resp = super().destroy(request, *args, **kwargs)
        if tt == 'sales':
            recalculate_rankings(month, year)
        return resp

    # ── POST /team-achievements/upload/ ──────────────────────────────────────
    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request):
        if getattr(request.user, 'role', None) not in ('admin', 'super_admin'):
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

        file      = request.FILES.get('file')
        month_raw = request.data.get('month')
        year_raw  = request.data.get('year')
        # team_type_override: if set, all rows in the file use this team type
        tt_override = request.data.get('team_type')  # 'sales' | 'pre_sales' | None

        if not file:
            return Response({'error': 'file is required'}, status=400)
        if not month_raw or not year_raw:
            return Response({'error': 'month and year are required'}, status=400)

        try:
            default_month = int(month_raw)
            default_year  = int(year_raw)
        except (TypeError, ValueError):
            return Response({'error': 'month and year must be integers'}, status=400)

        if not (1 <= default_month <= 12):
            return Response({'error': 'month must be 1–12'}, status=400)

        # Normalise the team_type override
        if tt_override:
            if tt_override not in ('sales', 'pre_sales'):
                return Response({'error': 'team_type must be "sales" or "pre_sales"'}, status=400)

        records, errors = parse_achievements_excel(
            file, default_month, default_year, team_type_override=tt_override
        )

        added = updated = 0
        for rec in records:
            emp_name = rec.pop('employee_name')
            desig    = rec.pop('designation')
            dept     = rec.pop('department')
            tt       = rec.pop('team_type')
            tnm      = rec.pop('team_name')
            month    = rec.pop('month')
            year     = rec.pop('year')
            # rec now: site_visits, appointments, meetings, bookings, registrations,
            #          square_feet_sold, units_sold

            # Upsert TeamMember by (employee_name, team_name, team_type)
            member, _ = TeamMember.objects.update_or_create(
                employee_name=emp_name,
                team_name=tnm,
                team_type=tt,
                defaults={
                    'designation': desig,
                    'department':  dept,
                },
            )

            # Full cell-level upsert of TeamAchievement
            _, created = TeamAchievement.objects.update_or_create(
                employee=member,
                month=month,
                year=year,
                defaults={
                    'team_name':        tnm,
                    'team_type':        tt,
                    'site_visits':      rec.get('site_visits',      0),
                    'appointments':     rec.get('appointments',     0),
                    'meetings':         rec.get('meetings',         0),
                    'bookings':         rec.get('bookings',         0),
                    'registrations':    rec.get('registrations',    0),
                    'square_feet_sold': rec.get('square_feet_sold', 0),
                    'units_sold':       rec.get('units_sold',       0),
                },
            )
            if created: added   += 1
            else:       updated += 1

        # Recalculate SALES rankings for every (month, year) touched
        touched_periods = set((r['month'], r['year']) for r in []) # empty; iterate records
        # re-derive: group by month/year in original records list (before pop)
        # since we already popped, we'll just recalculate for all periods in this upload
        for ta in TeamAchievement.objects.filter(team_type='sales').values('month', 'year').distinct():
            recalculate_rankings(ta['month'], ta['year'])

        UploadHistory.objects.create(
            uploaded_by       = request.user,
            filename          = file.name,
            month             = default_month,
            year              = default_year,
            records_processed = len(records) + len(errors),
            records_added     = added,
            records_updated   = updated,
            errors_count      = len(errors),
            error_report      = errors,
        )

        return Response({
            'success':           True,
            'records_processed': len(records) + len(errors),
            'records_added':     added,
            'records_updated':   updated,
            'errors_count':      len(errors),
            'errors':            errors,
        })

    # ── GET /team-achievements/template/ ─────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='template')
    def template(self, request):
        """
        ?team_type=sales      → Sales template
        ?team_type=pre_sales  → Pre-Sales template
        """
        tt = request.query_params.get('team_type', 'sales')
        if tt == 'pre_sales':
            buf      = generate_presales_template()
            filename = 'presales_team_template.xlsx'
        else:
            buf      = generate_sales_template()
            filename = 'sales_team_template.xlsx'

        response = HttpResponse(
            buf.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    # ── GET /team-achievements/rankings/ ─────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='rankings')
    def rankings(self, request):
        """Sales team rankings only."""
        month = request.query_params.get('month')
        year  = request.query_params.get('year')
        now   = timezone.localdate()
        if not month: month = now.month
        if not year:  year  = now.year

        qs = TeamRanking.objects.filter(
            team_type='sales', month=month, year=year
        ).exclude(team_name__startswith='*').order_by('rank')
        return Response(TeamRankingSerializer(qs, many=True).data)

    # ── GET /team-achievements/buckets/ ──────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='buckets')
    def buckets(self, request):
        """
        Returns complete bucket data for a period:
        {
          "sales_teams":    [ { team_name, rank, total_sqft, total_units, members: [...] } ],
          "presales_teams": [ { team_name, members: [...] } ]
        }
        """
        month = request.query_params.get('month')
        year  = request.query_params.get('year')
        now   = timezone.localdate()
        if not month: month = now.month
        if not year:  year  = now.year

        month = int(month)
        year  = int(year)

        # ── Sales buckets ────────────────────────────────────────────────────
        sales_achievements = (
            TeamAchievement.objects
            .filter(team_type='sales', month=month, year=year)
            .exclude(team_name__startswith='*')
            .exclude(employee__employee_name__startswith='*')
            .select_related('employee')
            .order_by('team_name', 'employee__employee_name')
        )
        sales_rankings = {
            r.team_name: r
            for r in TeamRanking.objects.filter(team_type='sales', month=month, year=year)
        }

        sales_teams_map = {}
        for ta in sales_achievements:
            tnm = ta.team_name
            if tnm not in sales_teams_map:
                rk = sales_rankings.get(tnm)
                sales_teams_map[tnm] = {
                    'team_name':      tnm,
                    'rank':           rk.rank           if rk else None,
                    'total_sqft':     rk.total_sqft     if rk else 0,
                    'total_units':    rk.total_units    if rk else 0,
                    'total_bookings': rk.total_bookings if rk else 0,
                    'member_count':   rk.member_count   if rk else 0,
                    'members':        [],
                }
            sales_teams_map[tnm]['members'].append({
                'id':               ta.id,
                'employee_name':    ta.employee.employee_name,
                'designation':      ta.employee.designation,
                'site_visits':      ta.site_visits,
                'appointments':     ta.appointments,
                'meetings':         ta.meetings,
                'bookings':         ta.bookings,
                'registrations':    ta.registrations,
                'square_feet_sold': ta.square_feet_sold,
                'units_sold':       ta.units_sold,
            })

        # Sort by rank
        sales_teams = sorted(
            sales_teams_map.values(),
            key=lambda x: (x['rank'] or 999, x['team_name']),
        )

        # ── Pre-Sales buckets ────────────────────────────────────────────────
        presales_achievements = (
            TeamAchievement.objects
            .filter(team_type='pre_sales', month=month, year=year)
            .exclude(team_name__startswith='*')
            .exclude(employee__employee_name__startswith='*')
            .select_related('employee')
            .order_by('team_name', 'employee__employee_name')
        )

        presales_teams_map = {}
        for ta in presales_achievements:
            tnm = ta.team_name
            if tnm not in presales_teams_map:
                presales_teams_map[tnm] = {
                    'team_name': tnm,
                    'total_site_visits':   0,
                    'total_appointments':  0,
                    'total_meetings':      0,
                    'members': [],
                }
            presales_teams_map[tnm]['total_site_visits']  += ta.site_visits
            presales_teams_map[tnm]['total_appointments'] += ta.appointments
            presales_teams_map[tnm]['total_meetings']     += ta.meetings
            presales_teams_map[tnm]['members'].append({
                'id':            ta.id,
                'employee_name': ta.employee.employee_name,
                'designation':   ta.employee.designation,
                'site_visits':   ta.site_visits,
                'appointments':  ta.appointments,
                'meetings':      ta.meetings,
            })

        presales_teams = sorted(presales_teams_map.values(), key=lambda x: x['team_name'])

        return Response({
            'month':          month,
            'year':           year,
            'month_name':     calendar.month_name[month],
            'sales_teams':    sales_teams,
            'presales_teams': presales_teams,
        })

    # ── GET /team-achievements/available_periods/ ─────────────────────────────
    @action(detail=False, methods=['get'], url_path='available_periods')
    def available_periods(self, request):
        periods = (
            TeamAchievement.objects
            .values('month', 'year')
            .distinct()
            .order_by('-year', '-month')
        )
        return Response([{
            'month':  p['month'],
            'year':   p['year'],
            'label':  f"{calendar.month_name[p['month']]} {p['year']}",
        } for p in periods])

    # ── POST /team-achievements/recalculate_all/ — admin: repair stale ranks ──
    @action(detail=False, methods=['post'], url_path='recalculate_all')
    def recalculate_all(self, request):
        """Re-rank every sales period in the database, excluding dirty rows.
        Call this once after deploying the ranking fix to repair existing data."""
        if getattr(request.user, 'role', None) not in ('admin', 'super_admin'):
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

        periods = (
            TeamAchievement.objects
            .filter(team_type='sales')
            .exclude(team_name__startswith='*')
            .exclude(employee__employee_name__startswith='*')
            .values('month', 'year')
            .distinct()
        )
        count = 0
        for p in periods:
            recalculate_rankings(p['month'], p['year'])
            count += 1

        return Response({'status': 'ok', 'periods_recalculated': count})

    # ── GET /team-achievements/members/ ──────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='members')
    def members(self, request):
        team_type = self.request.query_params.get('team_type')
        team_name = self.request.query_params.get('team_name')
        qs = TeamMember.objects.all().order_by('team_type', 'team_name', 'employee_name')
        if team_type: qs = qs.filter(team_type=team_type)
        if team_name: qs = qs.filter(team_name=team_name)
        return Response(TeamMemberSerializer(qs, many=True).data)


# ── Upload History ViewSet ────────────────────────────────────────────────────

class UploadHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = UploadHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self.request.user, 'role', None) not in ('admin', 'super_admin'):
            return UploadHistory.objects.none()
        qs = UploadHistory.objects.select_related('uploaded_by').all()
        month = self.request.query_params.get('month')
        year  = self.request.query_params.get('year')
        if month: qs = qs.filter(month=month)
        if year:  qs = qs.filter(year=year)
        return qs

    @action(detail=True, methods=['get'], url_path='errors')
    def errors(self, request, pk=None):
        hist = self.get_object()
        return Response(hist.error_report)

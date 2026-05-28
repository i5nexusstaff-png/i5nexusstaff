import io
import math
import openpyxl
import pandas as pd
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from datetime import date, timedelta
import calendar

from rest_framework import viewsets, status as http_status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.http import HttpResponse

from .models import DailyReport, REPORT_SCHEMA
from .serializers import DailyReportSerializer


def _notify_report_submitted(staff_user, report_date):
    """Notify all admins when a staff member submits a daily report."""
    try:
        from accounts.models import User
        from notifications.push_utils import create_and_push
        name  = staff_user.get_full_name() or staff_user.username
        title = f'📄 Report Submitted'
        msg   = f'{name} submitted their daily report for {report_date}.'
        for admin in User.objects.filter(role__in=['admin', 'super_admin'], is_active=True):
            url = '/superadmin/reports' if admin.role == 'super_admin' else '/admin/reports'
            create_and_push(admin, title, msg, 'report', url=url)
    except Exception:
        pass


class DailyReportViewSet(viewsets.ModelViewSet):
    serializer_class   = DailyReportSerializer
    permission_classes = [IsAuthenticated]

    # ── Queryset + filters ────────────────────────────────────────────────────
    def get_queryset(self):
        user   = self.request.user
        qs     = DailyReport.objects.select_related('user').all()

        if user.role == 'staff':
            qs = qs.filter(user=user)
        elif user.role == 'admin':
            qs = qs.filter(user__role__in=['staff', 'admin'])
        # super_admin: unrestricted

        p = self.request.query_params
        if p.get('date'):
            qs = qs.filter(report_date=p['date'])
        if p.get('month'):
            try:
                y, m = p['month'].split('-')
                qs   = qs.filter(report_date__year=y, report_date__month=m)
            except ValueError:
                pass
        if p.get('user_id') and user.role in ('admin', 'super_admin'):
            qs = qs.filter(user_id=p['user_id'])
        if p.get('report_type'):
            qs = qs.filter(report_type=p['report_type'])
        if p.get('status'):
            qs = qs.filter(status=p['status'])

        return qs

    # ── Upsert create (by user + report_date + report_type) ───────────────────
    def perform_create(self, serializer):
        extra = {}
        if serializer.validated_data.get('status') == 'submitted':
            extra['submitted_at'] = timezone.now()
        serializer.save(user=self.request.user, **extra)

    def create(self, request, *args, **kwargs):
        user        = request.user
        report_date = request.data.get('report_date', timezone.localdate().isoformat())
        report_type = request.data.get('report_type', '')
        new_status  = request.data.get('status', 'draft')
        try:
            existing = DailyReport.objects.get(user=user, report_date=report_date, report_type=report_type)
            ser = self.get_serializer(existing, data=request.data, partial=True)
            ser.is_valid(raise_exception=True)
            extra = {}
            first_submit = new_status == 'submitted' and not existing.submitted_at
            if first_submit:
                extra['submitted_at'] = timezone.now()
            ser.save(**extra)
            if first_submit:
                _notify_report_submitted(user, report_date)
            return Response(ser.data)
        except DailyReport.DoesNotExist:
            response = super().create(request, *args, **kwargs)
            if new_status == 'submitted':
                _notify_report_submitted(user, report_date)
            return response

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        instance   = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        extra = {}
        if request.data.get('status') == 'submitted' and not instance.submitted_at:
            extra['submitted_at'] = timezone.now()
        serializer.save(**extra)
        return Response(serializer.data)

    # ── GET /reports/schema/ ─────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='schema')
    def schema(self, request):
        return Response(REPORT_SCHEMA)

    # ── PATCH /reports/{id}/review/ ──────────────────────────────────────────
    @action(detail=True, methods=['patch'], url_path='review')
    def review(self, request, pk=None):
        if request.user.role not in ('admin', 'super_admin'):
            return Response({'detail': 'Forbidden'}, status=403)
        report = self.get_object()
        if 'admin_notes' in request.data:
            report.admin_notes = request.data['admin_notes']
        if 'status' in request.data:
            report.status = request.data['status']
        report.save()
        return Response(DailyReportSerializer(report, context={'request': request}).data)

    # ── GET /reports/team/ ───────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='team')
    def team(self, request):
        user = request.user
        if user.role == 'staff':
            return Response({'detail': 'Forbidden'}, status=403)

        qs = DailyReport.objects.select_related('user').all()
        if user.role == 'admin':
            qs = qs.filter(user__role='staff')

        p = request.query_params
        if p.get('month'):
            try:
                y, m = p['month'].split('-')
                qs   = qs.filter(report_date__year=y, report_date__month=m)
            except ValueError:
                pass
        if p.get('date'):
            qs = qs.filter(report_date=p['date'])
        if p.get('user_id'):
            qs = qs.filter(user_id=p['user_id'])
        if p.get('report_type'):
            qs = qs.filter(report_type=p['report_type'])

        return Response(DailyReportSerializer(qs[:500], many=True, context={'request': request}).data)

    # ── GET /reports/template/?report_type=xxx — download xlsx template ───────
    @action(detail=False, methods=['get'], url_path='template')
    def template(self, request):
        rt = request.query_params.get('report_type', '')
        if not rt or rt not in REPORT_SCHEMA:
            return Response({'detail': 'Invalid or missing report_type.'}, status=400)

        schema = REPORT_SCHEMA[rt]
        fields = schema['fields']

        wb  = openpyxl.Workbook()
        ws  = wb.active
        ws.title = schema['label'][:31]

        # ── Styles ──
        hdr_fill = PatternFill(start_color='1E3A5F', end_color='1E3A5F', fill_type='solid')
        hdr_font = Font(name='Arial', bold=True, color='FFFFFF', size=11)
        date_fill= PatternFill(start_color='2D4A6F', end_color='2D4A6F', fill_type='solid')
        data_font= Font(name='Arial', size=10)
        alt_fill = PatternFill(start_color='F0F4F8', end_color='F0F4F8', fill_type='solid')
        thin     = Side(style='thin', color='D1D5DB')
        border   = Border(left=thin, right=thin, top=thin, bottom=thin)
        center_al= Alignment(horizontal='center', vertical='center')

        # ── Headers: Date + each field ──
        headers = ['Date'] + [f['label'] for f in fields]
        for col, hdr in enumerate(headers, 1):
            c = ws.cell(row=1, column=col, value=hdr)
            c.font   = hdr_font
            c.fill   = date_fill if col == 1 else hdr_fill
            c.border = border
            c.alignment = center_al
        ws.row_dimensions[1].height = 22

        # ── Pre-populate last 3 months of dates ──
        today = date.today()
        dates = []
        for m_offset in range(2, -1, -1):
            y = today.year if today.month > m_offset else today.year - 1
            m = (today.month - m_offset - 1) % 12 + 1
            days_in_month = calendar.monthrange(y, m)[1]
            for d in range(1, days_in_month + 1):
                dates.append(date(y, m, d))

        for row_idx, d in enumerate(dates, 2):
            alt = alt_fill if row_idx % 2 == 0 else None
            # Date cell
            dc = ws.cell(row=row_idx, column=1, value=d.strftime('%d-%m-%Y'))
            dc.font = Font(name='Arial', bold=True, size=10)
            dc.border = border; dc.alignment = center_al
            if alt: dc.fill = alt
            # Data cells
            for col_idx in range(2, len(headers) + 1):
                cell = ws.cell(row=row_idx, column=col_idx, value='')
                cell.font = data_font; cell.border = border; cell.alignment = center_al
                if alt: cell.fill = alt

        # ── Column widths ──
        ws.column_dimensions['A'].width = 14
        for i in range(2, len(headers) + 1):
            ws.column_dimensions[get_column_letter(i)].width = 18

        # ── Footer ──
        note_row = len(dates) + 3
        note = ws.cell(row=note_row, column=1,
                       value=f'Template: {schema["label"]} — Date format: DD-MM-YYYY')
        note.font = Font(name='Arial', italic=True, color='6B7280', size=9)

        ws.freeze_panes = 'B2'

        buf = io.BytesIO()
        wb.save(buf); buf.seek(0)

        resp = HttpResponse(
            buf.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        safe_name = schema['label'].replace(' ', '_').lower()
        resp['Content-Disposition'] = f'attachment; filename="{safe_name}_template.xlsx"'
        return resp

    # ── POST /reports/import/ — upload historical data from xlsx ─────────────
    @action(detail=False, methods=['post'], url_path='import')
    def import_data(self, request):
        rt   = request.data.get('report_type', '')
        file = request.FILES.get('file')

        if not rt or rt not in REPORT_SCHEMA:
            return Response({'detail': 'Invalid or missing report_type.'}, status=400)
        if not file:
            return Response({'detail': 'No file provided.'}, status=400)

        schema = REPORT_SCHEMA[rt]
        fields = schema['fields']

        # ── Parse file ──
        try:
            df = pd.read_excel(file) if not file.name.lower().endswith('.csv') else pd.read_csv(file)
        except Exception as e:
            return Response({'detail': f'Cannot read file: {e}'}, status=400)

        # Normalise column names to lowercase
        df.columns = [str(c).strip().lower() for c in df.columns]

        # Find the date column
        date_col = next((c for c in df.columns if 'date' in c), None)
        if not date_col:
            return Response({'detail': 'No "Date" column found in the file.'}, status=400)

        # Build field label → key map (lowercase)
        label_to_key = {f['label'].lower(): f['key'] for f in fields}
        # Also accept field keys directly
        key_set = {f['key'] for f in fields}

        created_count = 0
        updated_count = 0
        skipped_count = 0
        errors = []

        for idx, row in df.iterrows():
            # Parse date
            raw_date = row[date_col]
            if isinstance(raw_date, str):
                raw_date = raw_date.strip()
            try:
                parsed_date = pd.to_datetime(str(raw_date), dayfirst=True).date()
            except Exception:
                skipped_count += 1
                continue

            # Build data dict
            data = {}
            for col in df.columns:
                if col == date_col:
                    continue
                key = label_to_key.get(col) or (col if col in key_set else None)
                if key:
                    val = row[col]
                    if isinstance(val, float) and math.isnan(val):
                        val = None
                    data[key] = str(val).strip() if val is not None else ''

            if not data:
                skipped_count += 1
                continue

            try:
                obj, created = DailyReport.objects.get_or_create(
                    user=request.user,
                    report_date=parsed_date,
                    report_type=rt,
                    defaults={'data': data, 'status': 'submitted', 'submitted_at': timezone.now()},
                )
                if created:
                    created_count += 1
                else:
                    obj.data.update(data)
                    obj.save()
                    updated_count += 1
            except Exception as e:
                errors.append(f'Row {idx + 2}: {e}')

        return Response({
            'message': (f'Import complete — {created_count} created, {updated_count} updated'
                        + (f', {skipped_count} skipped' if skipped_count else '')),
            'created': created_count,
            'updated': updated_count,
            'skipped': skipped_count,
            'errors':  errors[:10],
        })

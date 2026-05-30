from django.db import models
from django.conf import settings

# ── Report schema — 4 sheets matching "Final Cumulative report.xlsx" ──────────
REPORT_SCHEMA = {
    'sm_bdm': {
        'label': 'SM & BDM Report',
        'sheet': 'SM and BDM Report',
        'fields': [
            {'key': 'total_calls',  'label': 'Total Calls',  'type': 'number'},
            {'key': 'prospects',    'label': 'Prospects',    'type': 'number'},
            {'key': 'appointments', 'label': 'Appointments', 'type': 'number'},
            {'key': 'meetings',     'label': 'Meetings',     'type': 'number'},
            {'key': 'site_visits',  'label': 'Site Visits',  'type': 'number'},
            {'key': 'bookings',     'label': 'Bookings',     'type': 'number'},
            {'key': 'feedback',     'label': 'Feedback',     'type': 'textarea'},
            {'key': 'signature',    'label': 'Signature',    'type': 'text'},
        ],
    },
    'vp_sales_head': {
        'label': 'VP & Sales Head Report',
        'sheet': 'VP & Sales Head Report',
        'fields': [
            {'key': 'team_size',              'label': 'Team Size',              'type': 'number'},
            {'key': 'prospects_follow_ups',   'label': 'Prospects & Follow-ups', 'type': 'number'},
            {'key': 'meetings_appointments',  'label': 'Meetings/Appointments',  'type': 'number'},
            {'key': 'site_visits',            'label': 'Site Visits',            'type': 'number'},
            {'key': 'total_company_leads',    'label': 'Total Company Leads',    'type': 'number'},
            {'key': 'activity_lead',          'label': 'Activity Lead',          'type': 'number'},
            {'key': 'bookings',               'label': 'Bookings',               'type': 'number'},
            {'key': 'remarks',                'label': 'Remarks',                'type': 'textarea'},
        ],
    },
    'telecallers': {
        'label': 'Telecallers Report',
        'sheet': 'Telecallers Report',
        'fields': [
            {'key': 'calls_made',  'label': 'Calls Made',  'type': 'number'},
            {'key': 'prospects',   'label': 'Prospects',   'type': 'number'},
            {'key': 'meetings',    'label': 'Meetings',    'type': 'number'},
            {'key': 'site_visits', 'label': 'Site Visits', 'type': 'number'},
            {'key': 'feedback',    'label': 'Feedback',    'type': 'textarea'},
            {'key': 'signature',   'label': 'Signature',   'type': 'text'},
        ],
    },
    'marketing': {
        'label': 'Marketing Report',
        'sheet': 'Marketing Report',
        'fields': [
            {'key': 'total_leads',          'label': 'Total Leads',              'type': 'number'},
            {'key': 'tlt_leads',            'label': 'TLT Leads',                'type': 'number'},
            {'key': 'designs_creatives',    'label': 'Designs & Creatives made', 'type': 'number'},
            {'key': 'videos_made',          'label': 'Videos made',              'type': 'number'},
            {'key': 'influencer_marketing', 'label': 'Influencer Marketing',     'type': 'textarea'},
            {'key': 'outdoor_marketing',    'label': 'Outdoor Marketing',        'type': 'textarea'},
            {'key': 'tomorrow_to_do_list',  'label': "Tomorrow's To Do List",    'type': 'textarea'},
            {'key': 'todays_meetings',      'label': "Today's Meetings",         'type': 'textarea'},
            {'key': 'signature',            'label': 'Signature',                'type': 'text'},
        ],
    },
}

REPORT_TYPE_CHOICES = [(k, v['label']) for k, v in REPORT_SCHEMA.items()]

# Map old report_type values → new schema keys (for migration & backward compat)
LEGACY_TYPE_MAP = {
    'sales_manager':    'sm_bdm',
    'bdm':              'sm_bdm',
    'sales_head':       'vp_sales_head',
    'vp':               'vp_sales_head',
    'telecallers_head': 'telecallers',
    'telecallers':      'telecallers',
    'marketing':        'marketing',
}


class DailyReport(models.Model):
    STATUS_CHOICES = [
        ('draft',     'Draft'),
        ('submitted', 'Submitted'),
        ('reviewed',  'Reviewed'),
    ]

    user        = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='daily_reports')
    report_type = models.CharField(max_length=30)
    report_date = models.DateField()
    data        = models.JSONField(default=dict)
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    admin_notes = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    updated_at  = models.DateTimeField(auto_now=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'report_date', 'report_type']
        ordering = ['-report_date', '-updated_at']

    def __str__(self):
        label = REPORT_SCHEMA.get(self.report_type, {}).get('label', self.report_type)
        return f"{self.user} — {label} — {self.report_date}"

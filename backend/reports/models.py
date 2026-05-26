from django.db import models
from django.conf import settings

# ── Report type schema — mirrors the 7 sheets in Cumulative report.xlsx ───────
REPORT_SCHEMA = {
    'sales_head': {
        'label': 'Sales Head Report',
        'fields': [
            {'key': 'team_size',           'label': 'Team Size',           'type': 'number'},
            {'key': 'total_call_backs',    'label': 'Total Call Backs',    'type': 'number'},
            {'key': 'prospects',           'label': 'Prospects',           'type': 'number'},
            {'key': 'meetings',            'label': 'Meetings',            'type': 'number'},
            {'key': 'appointments',        'label': 'Appointments',        'type': 'number'},
            {'key': 'sitevisit',           'label': 'Site Visit',          'type': 'number'},
            {'key': 'lead_source',         'label': 'Lead Source',         'type': 'text'},
            {'key': 'bookings_and_remarks','label': 'Bookings & Remarks',  'type': 'textarea'},
        ],
    },
    'sales_manager': {
        'label': 'Sales Manager Report',
        'fields': [
            {'key': 'total_team_members',  'label': 'Total Team Members',  'type': 'number'},
            {'key': 'prospects_and_calls', 'label': 'Prospects & Calls',   'type': 'number'},
            {'key': 'appointment',         'label': 'Appointment',         'type': 'number'},
            {'key': 'sitevisit',           'label': 'Site Visit',          'type': 'number'},
            {'key': 'lead_type',           'label': 'Lead Type',           'type': 'text'},
            {'key': 'bookings',            'label': 'Bookings',            'type': 'number'},
            {'key': 'feedback',            'label': 'Feedback',            'type': 'textarea'},
            {'key': 'signature',           'label': 'Signature',           'type': 'text'},
        ],
    },
    'vp': {
        'label': 'VP Report',
        'fields': [
            {'key': 'total_team_meeting',           'label': 'Total Team Meeting',             'type': 'number'},
            {'key': 'total_appointment',            'label': 'Total Appointment',              'type': 'number'},
            {'key': 'total_sitevisits',             'label': 'Total Site Visits',              'type': 'number'},
            {'key': 'total_leads_received',         'label': 'Total Leads Received',           'type': 'number'},
            {'key': 'total_activity_lead_own_lead', 'label': 'Total Activity Lead & Own Lead', 'type': 'number'},
            {'key': 'company_lead_portals_lead',    'label': 'Company Lead & Portals Lead',    'type': 'number'},
            {'key': 'presales_team_lead',           'label': 'Presales Team Lead',             'type': 'number'},
            {'key': 'bookings',                     'label': 'Bookings',                       'type': 'number'},
        ],
    },
    'telecallers_head': {
        'label': 'Telecallers Head Report',
        'fields': [
            {'key': 'total_connected_calls', 'label': 'Total Connected Calls', 'type': 'number'},
            {'key': 'total_dialed_calls',    'label': 'Total Dialed Calls',    'type': 'number'},
            {'key': 'total_call_back',       'label': 'Total Call Back',       'type': 'number'},
            {'key': 'total_prospect',        'label': 'Total Prospect',        'type': 'number'},
            {'key': 'total_appointment',     'label': 'Total Appointment',     'type': 'number'},
            {'key': 'total_meeting',         'label': 'Total Meeting',         'type': 'number'},
            {'key': 'total_site_visit',      'label': 'Total Site Visit',      'type': 'number'},
            {'key': 'total_booking',         'label': 'Total Booking',         'type': 'number'},
        ],
    },
    'marketing': {
        'label': 'Marketing Report',
        'fields': [
            {'key': 'total_no_of_leads',               'label': 'Total No. of Leads',              'type': 'number'},
            {'key': 'total_tlt_leads',                 'label': 'Total TLT Leads',                 'type': 'number'},
            {'key': 'no_of_designs_creatives',         'label': 'No. of Designs & Creatives',      'type': 'number'},
            {'key': 'no_of_videos',                    'label': 'No. of Videos',                   'type': 'number'},
            {'key': 'outdoor_marketing_activities',    'label': 'Outdoor Marketing Activities',    'type': 'textarea'},
            {'key': 'influencer_marketing_activities', 'label': 'Influencer Marketing Activities', 'type': 'textarea'},
            {'key': 'remarks',                         'label': 'Remarks',                         'type': 'textarea'},
            {'key': 'tomorrow_to_do_list',             'label': "Tomorrow's To-Do List",           'type': 'textarea'},
        ],
    },
    'bdm': {
        'label': 'BDM Report',
        'fields': [
            {'key': 'customer_details',              'label': 'Customer Details',               'type': 'textarea'},
            {'key': 'source',                        'label': 'Source',                         'type': 'text'},
            {'key': 'project',                       'label': 'Project',                        'type': 'text'},
            {'key': 'budget',                        'label': 'Budget',                         'type': 'text'},
            {'key': 'last_contact_date_next_action', 'label': 'Last Contact Date & Next Action', 'type': 'textarea'},
            {'key': 'site_visit',                    'label': 'Site Visit',                     'type': 'number'},
            {'key': 'booking',                       'label': 'Booking',                        'type': 'number'},
            {'key': 'remarks',                       'label': 'Remarks',                        'type': 'textarea'},
        ],
    },
    'telecallers': {
        'label': 'Telecallers Report',
        'fields': [
            {'key': 'connected_calls', 'label': 'Connected Calls', 'type': 'number'},
            {'key': 'dialed_calls',    'label': 'Dialed Calls',    'type': 'number'},
            {'key': 'call_back',       'label': 'Call Back',       'type': 'number'},
            {'key': 'prospect',        'label': 'Prospect',        'type': 'number'},
            {'key': 'appointment',     'label': 'Appointment',     'type': 'number'},
            {'key': 'meeting',         'label': 'Meeting',         'type': 'number'},
            {'key': 'site_visit',      'label': 'Site Visit',      'type': 'number'},
            {'key': 'signature',       'label': 'Signature',       'type': 'text'},
        ],
    },
}

REPORT_TYPE_CHOICES = [(k, v['label']) for k, v in REPORT_SCHEMA.items()]


class DailyReport(models.Model):
    STATUS_CHOICES = [
        ('draft',     'Draft'),
        ('submitted', 'Submitted'),
        ('reviewed',  'Reviewed'),
    ]

    user        = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='daily_reports')
    report_type = models.CharField(max_length=30, choices=REPORT_TYPE_CHOICES)
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
        return f"{self.user} — {self.get_report_type_display()} — {self.report_date}"

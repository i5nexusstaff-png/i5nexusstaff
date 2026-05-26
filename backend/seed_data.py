import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from projects.models import Project
from plots.models import Plot
from achievements.models import Achievement
from todos.models import TodoItem
from reports.models import ReportTemplate
import datetime

User = get_user_model()

print("Deleting existing users...")
User.objects.all().delete()
print("  All existing users deleted.")

# ── Admin ──────────────────────────────────────────────
print("\nCreating admin user...")
admin = User.objects.create_superuser(
    username='i5admin', password='prasad@2026',
    email='admin@i5nexus.com', first_name='i5 Nexus', last_name='Admin',
    role='admin', position='Admin', department='Management',
    employee_id='EMP000', site_location='Head Office', is_staff=True
)
print(f"  Created admin: i5admin / prasad@2026")

# ── Staff from real spreadsheet data ──────────────────
print("\nCreating staff users...")

STAFF = [
    # (username, first_name, last_name, phone, position, department, location, emp_id, doj)
    ('sudalaimani',     'Sudalai',      'Mani',          '9361026898', 'Digital Marketing Executive', 'Digital Marketing', 'Head Office', 'EMP001', '2025-08-14'),
    ('thangaraj',       'Thangaraj',    '',               '9841476698', 'Graphic Designer',            'Digital Marketing', 'Head Office', 'EMP002', '2025-12-22'),
    ('victor',          'Victor',       '',               '8637661496', 'Graphic Designer',            'Digital Marketing', 'Head Office', 'EMP003', '2026-02-02'),
    ('wilson',          'Wilson',       '',               '9176077610', 'Legal Executive',             'Legal',             'Head Office', 'EMP004', '2023-09-16'),
    ('sridevi',         'Sridevi',      '',               '9940250770', 'Accounts Executive',          'Accounts',          'Head Office', 'EMP005', '2025-01-02'),
    ('pramodhpillai',   'Pramodh',      'Pillai',         '9819696698', 'Accounts Executive',          'Accounts',          'Head Office', 'EMP006', '2023-06-02'),
    ('kalai',           'Kalai',        '',               '6369060729', 'Driver',                      'Administration',    'Head Office', 'EMP007', '2025-07-16'),
    ('wincent',         'Wincent',      '',               '9566815492', 'Driver',                      'Administration',    'Head Office', 'EMP008', '2024-04-24'),
    ('prakash',         'Prakash',      '',               '',            'Watchman',                    'Administration',    'Head Office', 'EMP009', None),
    ('ponammal',        'Ponammal',     '',               '',            'Housekeeping',                'Administration',    'Head Office', 'EMP010', None),
    ('jeevapriya',      'Jeeva',        'Priya',          '9952980219', 'Admin Executive',             'Administration',    'Head Office', 'EMP011', '2026-05-12'),
    ('neshik',          'Neshik',       '',               '',            'Manager',                     'Human Resources',   'Head Office', 'EMP012', None),
    ('veenus',          'Veenus',       '',               '8220063042', 'Recruiter',                   'Human Resources',   'Head Office', 'EMP013', '2026-02-16'),
    ('riya',            'Riya',         '',               '9962588316', 'Presales Head',               'Presales',          'Head Office', 'EMP014', '2026-03-18'),
    ('sudharshini',     'Sudharshini',  '',               '9962143819', 'Tele Caller',                 'Presales',          'Head Office', 'EMP015', '2025-11-06'),
    ('jayaseeli',       'Jayaseeli',    '',               '8925460589', 'Tele Caller',                 'Presales',          'Head Office', 'EMP016', '2026-03-18'),
    ('suguna',          'Suguna',       '',               '6369538665', 'Tele Caller',                 'Presales',          'Head Office', 'EMP017', '2026-03-19'),
    ('pooja',           'Pooja',        '',               '7904752235', 'Tele Caller',                 'Presales',          'Head Office', 'EMP018', '2026-03-23'),
    ('easterrani',      'Easter',       'Rani',           '9080642931', 'Tele Caller',                 'Presales',          'Head Office', 'EMP019', '2026-03-30'),
    ('yamuna',          'Yamuna',       '',               '7010155992', 'Tele Caller',                 'Presales',          'Head Office', 'EMP020', '2026-05-06'),
    ('haritha',         'Haritha',      '',               '8870352453', 'Tele Caller',                 'Presales',          'Head Office', 'EMP021', '2026-05-06'),
    ('supriya',         'Supriya',      '',               '8870896601', 'Tele Caller',                 'Presales',          'Tambaram',    'EMP022', '2026-05-06'),
    ('priyadharshini',  'Priyadharshini','',              '8148773023', 'Tele Caller',                 'Presales',          'Tambaram',    'EMP023', '2026-05-07'),
    ('yogeshwari',      'Yogeshwari',   '',               '',            'Tele Caller',                 'Presales',          'Tambaram',    'EMP024', None),
    ('domnicxavier',    'Domnic',       'Xavier',         '9003130603', 'VP',                          'Sales',             'Head Office', 'EMP025', '2026-02-16'),
    ('jupela',          'Jupela',       'Mathesh',        '9087902119', 'Sales Head',                  'Sales',             'Head Office', 'EMP026', '2025-10-06'),
    ('subash',          'Subash',       '',               '9789493956', 'Sales Head',                  'Sales',             'Head Office', 'EMP027', '2023-12-15'),
    ('ramsaravanan',    'Ram',          'Saravanan',      '9884562813', 'Sales Head',                  'Sales',             'Head Office', 'EMP028', '2025-05-12'),
    ('samrajwilson',    'Samraj',       'Wilson',         '8015621347', 'BDM',                         'Sales',             'Head Office', 'EMP029', '2025-09-22'),
    ('vignesh',         'Vignesh',      '',               '8870319044', 'BDM',                         'Sales',             'Head Office', 'EMP030', '2025-12-12'),
    ('srinivasan',      'Srinivasan',   '',               '7904658819', 'BDM',                         'Sales',             'Head Office', 'EMP031', None),
    ('jaikumar',        'Jai',          'Kumar',          '8550000140', 'BDM',                         'Sales',             'Head Office', 'EMP032', '2026-03-04'),
    ('yuvaraj',         'Yuvaraj',      '',               '9940757845', 'BDM',                         'Sales',             'Tambaram',    'EMP033', '2025-03-06'),
    ('yaswanth',        'Yaswanth',     '',               '9940629753', 'BDM',                         'Sales',             'Head Office', 'EMP034', '2026-04-29'),
    ('rajkumar',        'Raj',          'Kumar',          '9360115990', 'Manager',                     'Sales',             'Head Office', 'EMP035', None),
    ('jaganmohan',      'Jagan',        'Mohan Reddy',    '',            'Manager',                     'Sales',             'Head Office', 'EMP036', None),
    ('prabhakara',      'Prabhakara',   '',               '9384665637', 'Senior Manager',              'Sales',             'Head Office', 'EMP037', '2026-04-01'),
    ('deliphin',        'Deliphin',     '',               '',            'Manager',                     'Sales',             'Head Office', 'EMP038', None),
    ('godwin',          'Godwin',       '',               '',            'Manager',                     'Sales',             'Head Office', 'EMP039', None),
    ('vigneshs',        'Vignesh',      'S',              '9962044507', 'Manager',                     'Sales',             'Head Office', 'EMP040', '2026-04-06'),
    ('shivu',           'Shivu',        '',               '',            'Manager',                     'Sales',             'Head Office', 'EMP041', None),
    ('sweth',           'Sweth',        '',               '',            'Manager',                     'Sales',             'Head Office', 'EMP042', None),
    ('sathish',         'Sathish',      '',               '',            'Manager',                     'Sales',             'Head Office', 'EMP043', None),
    ('sivaram',         'Sivaram',      '',               '',            'Manager',                     'Sales',             'Head Office', 'EMP044', None),
    ('prabhudurai',     'Prabhu',       'Durai',          '7418652290', 'Branch Head',                 'Sales',             'Tambaram',    'EMP045', '2021-10-08'),
    ('devaraj',         'Devaraj',      '',               '8754548118', 'Manager',                     'Sales',             'Tambaram',    'EMP046', '2025-06-02'),
    ('vikram',          'Vikram',       '',               '8072904003', 'Manager',                     'Sales',             'Tambaram',    'EMP047', '2025-03-26'),
    ('mohammedhasim',   'Mohammed',     'Hasim',          '9384272184', 'Manager',                     'Sales',             'Tambaram',    'EMP048', '2026-02-02'),
    ('manikandam',      'Manikandam',   'M',              '9789937546', 'Manager',                     'Sales',             'Tambaram',    'EMP049', '2025-09-01'),
    ('manikandan',      'Manikandan',   'R',              '6383639866', 'Manager',                     'Sales',             'Tambaram',    'EMP050', '2026-02-18'),
    ('arun',            'Arun',         '',               '8925441716', 'Manager',                     'Sales',             'Tambaram',    'EMP051', '2025-10-15'),
    ('hariprakash',     'Hari',         'Prakash',        '6385600294', 'Manager',                     'Sales',             'Tambaram',    'EMP052', '2026-02-02'),
    ('gomathi',         'Gomathi',      'Nayakam',        '6381686455', 'Manager',                     'Sales',             'Tambaram',    'EMP053', '2025-09-17'),
    ('ranjith',         'Ranjith',      '',               '9655933299', 'Manager',                     'Sales',             'Auroville',   'EMP054', '2026-04-06'),
    ('kaviarasan',      'Kaviarasan',   '',               '8056745470', 'Manager',                     'Sales',             'Auroville',   'EMP055', '2026-04-13'),
]

# Site GPS coords
SITE_COORDS = {
    'Head Office': (13.0827, 80.2707),
    'Tambaram':    (12.9249, 80.1000),
    'Auroville':   (11.9336, 79.8136),
}

staff_users = []
for (uname, fname, lname, phone, position, dept, location, emp_id, doj) in STAFF:
    lat, lng = SITE_COORDS.get(location, (13.0827, 80.2707))
    doj_date = datetime.date.fromisoformat(doj) if doj else None
    u = User(
        username=uname,
        first_name=fname,
        last_name=lname,
        email=f"{uname}@i5nexus.com",
        role='staff',
        position=position,
        department=dept,
        phone=phone,
        employee_id=emp_id,
        site_location=location,
        site_lat=lat,
        site_lng=lng,
        date_joined_company=doj_date,
        is_active=True,
    )
    # victor gets a specific password per requirements
    u.set_password('victor@2026' if uname == 'victor' else 'staff@2026')
    u.save()
    staff_users.append(u)
    print(f"  {emp_id}  {fname} {lname} ({uname}) — {dept} / {position}")

print(f"\n  Total staff created: {len(staff_users)}")

# ── Report Templates ───────────────────────────────────
print("\nCreating report templates...")
ReportTemplate.objects.all().delete()
templates = [
    {
        'name': 'Daily Sales Report',
        'position': 'BDM',
        'fields': [
            {'name': 'date',         'label': 'Date',                  'type': 'date',     'required': True},
            {'name': 'site_visited', 'label': 'Site Visited',          'type': 'text',     'required': True},
            {'name': 'leads_met',    'label': 'No. of Leads Met',      'type': 'number',   'required': True},
            {'name': 'plots_booked', 'label': 'Plots Booked',          'type': 'number',   'required': True},
            {'name': 'follow_ups',   'label': 'Follow-ups Scheduled',  'type': 'number',   'required': False},
            {'name': 'remarks',      'label': 'Remarks / Notes',       'type': 'textarea', 'required': False},
        ]
    },
    {
        'name': 'Sales Manager Weekly Report',
        'position': 'Manager',
        'fields': [
            {'name': 'week',          'label': 'Week',                      'type': 'text',     'required': True},
            {'name': 'team_size',     'label': 'Team Size',                 'type': 'number',   'required': True},
            {'name': 'total_leads',   'label': 'Total Leads This Week',     'type': 'number',   'required': True},
            {'name': 'total_bookings','label': 'Total Bookings',            'type': 'number',   'required': True},
            {'name': 'top_performer', 'label': 'Top Performer Name',        'type': 'text',     'required': False},
            {'name': 'challenges',    'label': 'Challenges Faced',          'type': 'textarea', 'required': False},
            {'name': 'next_week_plan','label': 'Plan for Next Week',        'type': 'textarea', 'required': False},
        ]
    },
    {
        'name': 'Presales Call Report',
        'position': 'Tele Caller',
        'fields': [
            {'name': 'date',          'label': 'Date',                      'type': 'date',     'required': True},
            {'name': 'calls_made',    'label': 'Total Calls Made',          'type': 'number',   'required': True},
            {'name': 'connected',     'label': 'Calls Connected',           'type': 'number',   'required': True},
            {'name': 'appointments',  'label': 'Appointments Fixed',        'type': 'number',   'required': True},
            {'name': 'remarks',       'label': 'Remarks',                   'type': 'textarea', 'required': False},
        ]
    },
    {
        'name': 'Monthly Summary Report',
        'position': 'Sales Head',
        'fields': [
            {'name': 'month',             'label': 'Month & Year',          'type': 'text',     'required': True},
            {'name': 'total_plots_sold',  'label': 'Total Plots Sold',      'type': 'number',   'required': True},
            {'name': 'total_revenue',     'label': 'Total Revenue (₹)',     'type': 'number',   'required': True},
            {'name': 'new_leads',         'label': 'New Leads Generated',   'type': 'number',   'required': True},
            {'name': 'conversion_rate',   'label': 'Conversion Rate (%)',   'type': 'number',   'required': False},
            {'name': 'highlight',         'label': 'Key Highlight',         'type': 'textarea', 'required': False},
        ]
    },
]
for t in templates:
    ReportTemplate.objects.create(created_by=admin, **t)
    print(f"  Created template: {t['name']}")

# ── Weekly Todos ───────────────────────────────────────
print("\nCreating weekly todos...")
TodoItem.objects.all().delete()
today = datetime.date.today()
week_start = today - datetime.timedelta(days=today.weekday())
todos = [
    ('Follow up with 5 leads',      'Call all pending leads from last week',            'high'),
    ('Update CRM data',             'Enter all client visits into the system',          'medium'),
    ('Site visit report',           'Submit report for site visit conducted this week', 'high'),
    ('Team meeting attendance',     'Attend Monday morning briefing at 9 AM',          'medium'),
    ('Plot availability check',     'Verify current available plots for all projects',  'low'),
]
for title, desc, priority in todos:
    TodoItem.objects.create(
        title=title, description=desc, priority=priority,
        week_start=week_start, created_by=admin, assigned_to_all=True
    )
print(f"  Created {len(todos)} todos for week of {week_start}")

# ── Achievements ───────────────────────────────────────
print("\nCreating achievement data...")
Achievement.objects.all().delete()
sales_staff = [u for u in staff_users if u.department == 'Sales'][:10]
import random
random.seed(42)
for ptype, plabel in [('monthly', 'May 2026'), ('monthly', 'April 2026'), ('weekly', 'Week 20 2026'), ('yearly', '2026')]:
    shuffled = sorted(sales_staff, key=lambda _: random.random())
    for rank, user in enumerate(shuffled, 1):
        plots_sold = max(1, 15 - rank + random.randint(0, 3))
        Achievement.objects.get_or_create(
            user=user, period_type=ptype, period_label=plabel,
            defaults={'plots_sold': plots_sold, 'revenue': plots_sold * 3300 * 1200, 'rank': rank}
        )
print(f"  Created achievements for {len(sales_staff)} sales staff")

# ── Re-import Excel plots ──────────────────────────────
print("\nRe-importing Excel plot data...")
import subprocess
result = subprocess.run(
    ['C:\\Users\\georg\\AppData\\Local\\Programs\\Python\\Python39\\python.exe', 'manage.py', 'import_excel'],
    capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__))
)
print(result.stdout)
if result.returncode != 0:
    print("Excel import error:", result.stderr[:400])

print("\n" + "="*50)
print("SEED COMPLETE!")
print("="*50)
print("\nLogin credentials:")
print("  ADMIN : i5admin / prasad@2026")
print("  STAFF : victor  / staff@2026   (and all other staff use staff@2026)")
print(f"\n  Total staff: {len(staff_users)}")

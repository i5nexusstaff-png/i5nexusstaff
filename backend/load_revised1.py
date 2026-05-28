"""
Loads updated data from revised1 Excel file.
- Deletes projects NOT in this file (Cynosure, JMR, ARM, Spyka, Sunrise, Somas, Happy)
- Replaces plots for the 6 projects in this file:
    THE PALACE      -> i5 Palace City
    aurowin         -> Aurowin Enclave
    MADHAVARAM      -> CK Madhavan Nagar
    Wonder city     -> i5 WonderCity
    TAMARA FARM     -> Tamara Farm
    OMR i5 City     -> OMR i5 City
Run: python load_revised1.py
"""
import os, sys, math
os.chdir(r'D:\i5nexus\backend')
sys.path.insert(0, r'D:\i5nexus\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

import pandas as pd
from projects.models import Project
from plots.models import Plot

XL = r'E:\i5 layouts\Copy of i5 AVAILABLE PLOTS DETAILS (revised1).xlsx'

# ── helpers ───────────────────────────────────────────────────────────────────
def sf(v):
    try:
        if v is None or (isinstance(v, float) and math.isnan(v)): return None
        return float(v)
    except: return None

def ss(v):
    try:
        if v is None or (isinstance(v, float) and math.isnan(v)): return ''
        s = str(v).strip()
        return '' if s.lower() == 'nan' else s
    except: return ''

def map_status(raw):
    r = ss(raw).lower()
    if not r: return 'available'
    if 'sold' in r: return 'sold'
    if 'book' in r: return 'booked'
    if 'block' in r: return 'blocked'
    if 'process' in r or 'progress' in r: return 'in_process'
    return 'available'

def get_or_create_project(name, location='', description=''):
    p, created = Project.objects.get_or_create(
        name=name,
        defaults={'location': location, 'description': description},
    )
    tag = 'CREATED' if created else 'UPDATED'
    print(f'  [{tag}] {name}')
    return p

def reload_plots(project, rows):
    """Delete all existing plots for project and bulk-insert new ones."""
    project.plots.all().delete()
    objs = []
    for r in rows:
        pno = ss(r.get('plot_no', ''))
        if not pno: continue
        area = sf(r.get('area_sqft'))
        rate = sf(r.get('rate_per_sqft'))
        cost = sf(r.get('total_cost'))
        if cost is None and area is not None and rate is not None:
            cost = area * rate
        objs.append(Plot(
            project=project,
            plot_no=pno,
            facing=ss(r.get('facing', '')),
            area_sqft=area,
            rate_per_sqft=rate,
            total_cost=cost,
            status=r.get('status', 'available'),
        ))
    Plot.objects.bulk_create(objs, ignore_conflicts=True)
    project.total_plots = project.plots.count()
    project.save(update_fields=['total_plots'])
    print(f'    -> {project.total_plots} plots loaded')

# ── Remove projects not in this file ─────────────────────────────────────────
KEEP = {
    'i5 Palace City', 'Aurowin Enclave', 'CK Madhavan Nagar',
    'i5 WonderCity', 'Tamara Farm', 'OMR i5 City',
}
print('Removing projects not in this file...')
removed = Project.objects.exclude(name__in=KEEP).delete()
print(f'  Deleted: {removed}')

# =============================================================================
# THE PALACE -> i5 Palace City
# Row 0 = header. Survey section headers in col0 → prefix plot_no to keep unique.
# =============================================================================
print('\n[Sheet] THE PALACE -> i5 Palace City')
raw = pd.read_excel(XL, sheet_name='THE PALACE', header=None)

palace_rows = []
current_survey = ''
for i in range(1, len(raw)):
    row = raw.iloc[i]
    col0 = ss(row.iloc[0])
    if col0.upper().startswith('SURVEY'):
        short = col0.upper().replace('SURVEY NO-', '').replace('SURVEY NO ', '').replace('/', '-').strip()
        current_survey = short
        continue
    pno = ss(row.iloc[1])
    if not pno or any(kw in pno.lower() for kw in ('plot', 'survey', 's.no', 'facing', 'area', 'rate', 'total', 'status')):
        continue
    full_pno = f'{current_survey}-{pno}' if current_survey else pno
    st_raw = ss(row.iloc[6]) if len(row) > 6 else ''
    palace_rows.append({
        'plot_no': full_pno,
        'facing': ss(row.iloc[2]),
        'area_sqft': sf(row.iloc[3]),
        'rate_per_sqft': sf(row.iloc[4]),
        'total_cost': sf(row.iloc[5]),
        'status': map_status(st_raw) if st_raw else 'available',
    })

p = get_or_create_project('i5 Palace City', location='Chennai')
reload_plots(p, palace_rows)

# =============================================================================
# aurowin  -> Aurowin Enclave
# Row 0 = header: S.No | Plot No | Facing | Area (sq.ft) | Rate/sqft | Total Cost | Status
# =============================================================================
print('\n[Sheet] aurowin -> Aurowin Enclave')
raw = pd.read_excel(XL, sheet_name='aurowin ', header=None)

auro_rows = []
for i in range(1, len(raw)):
    row = raw.iloc[i]
    pno = ss(row.iloc[1])
    if not pno or any(kw in pno.lower() for kw in ('plot', 'survey', 's.no', 'facing', 'area', 'rate', 'total', 'status')):
        continue
    if len(pno) > 30: continue
    st_raw = ss(row.iloc[6]) if len(row) > 6 else ''
    auro_rows.append({
        'plot_no': pno,
        'facing': ss(row.iloc[2]),
        'area_sqft': sf(row.iloc[3]),
        'rate_per_sqft': sf(row.iloc[4]),
        'total_cost': sf(row.iloc[5]),
        'status': map_status(st_raw) if st_raw else 'available',
    })

p = get_or_create_project('Aurowin Enclave', location='Chennai')
reload_plots(p, auro_rows)

# =============================================================================
# MADHAVARAM -> CK Madhavan Nagar
# Row 0 = header: S.No | Plot No | Facing | Area (sq.ft) | Rate/sqft | Total Cost | Status
# =============================================================================
print('\n[Sheet] MADHAVARAM -> CK Madhavan Nagar')
raw = pd.read_excel(XL, sheet_name='MADHAVARAM', header=None)

madh_rows = []
for i in range(1, len(raw)):
    row = raw.iloc[i]
    pno = ss(row.iloc[1])
    if not pno or any(kw in pno.lower() for kw in ('plot', 'survey', 's.no', 'facing', 'area', 'rate', 'total', 'status')):
        continue
    if len(pno) > 30: continue
    st_raw = ss(row.iloc[6]) if len(row) > 6 else ''
    madh_rows.append({
        'plot_no': pno,
        'facing': ss(row.iloc[2]),
        'area_sqft': sf(row.iloc[3]),
        'rate_per_sqft': sf(row.iloc[4]),
        'total_cost': sf(row.iloc[5]),
        'status': map_status(st_raw) if st_raw else 'available',
    })

p = get_or_create_project('CK Madhavan Nagar', location='Madhavaram, Chennai')
reload_plots(p, madh_rows)

# =============================================================================
# Wonder city  -> i5 WonderCity
# Row 0 = header: S.No | Plot No | Facing | Area (sq.ft) | Rate/sqft | Total Cost | Status
# =============================================================================
print('\n[Sheet] Wonder city -> i5 WonderCity')
raw = pd.read_excel(XL, sheet_name='Wonder city ', header=None)

wc_rows = []
for i in range(1, len(raw)):
    row = raw.iloc[i]
    pno = ss(row.iloc[1])
    if not pno or any(kw in pno.lower() for kw in ('plot', 'survey', 's.no', 'facing', 'area', 'rate', 'total', 'status')):
        continue
    if len(pno) > 30: continue
    st_raw = ss(row.iloc[6]) if len(row) > 6 else ''
    wc_rows.append({
        'plot_no': pno,
        'facing': ss(row.iloc[2]),
        'area_sqft': sf(row.iloc[3]),
        'rate_per_sqft': sf(row.iloc[4]),
        'total_cost': sf(row.iloc[5]),
        'status': map_status(st_raw) if st_raw else 'available',
    })

p = get_or_create_project('i5 WonderCity', location='Chennai')
reload_plots(p, wc_rows)

# =============================================================================
# TAMARA FARM -> Tamara Farm
# Row 0 blank, Row 1 = header: S.No | Plot No | Facing | Area (sq.ft) | Rate/sqft | Total Cost | Status
# =============================================================================
print('\n[Sheet] TAMARA FARM -> Tamara Farm')
raw = pd.read_excel(XL, sheet_name='TAMARA FARM', header=None)

tam_rows = []
for i in range(2, len(raw)):
    row = raw.iloc[i]
    pno = ss(row.iloc[1])
    if not pno or any(kw in pno.lower() for kw in ('plot', 'survey', 's.no', 'facing', 'area', 'rate', 'total', 'status')):
        continue
    if len(pno) > 30: continue
    st_raw = ss(row.iloc[6]) if len(row) > 6 else ''
    tam_rows.append({
        'plot_no': pno,
        'facing': ss(row.iloc[2]),
        'area_sqft': sf(row.iloc[3]),
        'rate_per_sqft': sf(row.iloc[4]),
        'total_cost': sf(row.iloc[5]),
        'status': map_status(st_raw) if st_raw else 'available',
    })

p = get_or_create_project('Tamara Farm', location='Chennai')
reload_plots(p, tam_rows)

# =============================================================================
# OMR i5 City -> OMR i5 City
# Row 0 blank, Row 1 = header: S.No | Plot No | Facing | Area (sq.ft) | Rate/sqft | Total Cost | Status
# =============================================================================
print('\n[Sheet] OMR i5 City')
raw = pd.read_excel(XL, sheet_name='OMR i5 City', header=None)

omr_rows = []
for i in range(2, len(raw)):
    row = raw.iloc[i]
    pno = ss(row.iloc[1])
    if not pno or any(kw in pno.lower() for kw in ('plot', 'survey', 's.no', 'facing', 'area', 'rate', 'total', 'status')):
        continue
    if len(pno) > 30: continue
    st_raw = ss(row.iloc[6]) if len(row) > 6 else ''
    omr_rows.append({
        'plot_no': pno,
        'facing': ss(row.iloc[2]),
        'area_sqft': sf(row.iloc[3]),
        'rate_per_sqft': sf(row.iloc[4]),
        'total_cost': sf(row.iloc[5]),
        'status': map_status(st_raw) if st_raw else 'available',
    })

p = get_or_create_project('OMR i5 City', location='OMR, Chennai')
reload_plots(p, omr_rows)

# =============================================================================
# Summary
# =============================================================================
print('\n=== DONE ===')
for proj in Project.objects.all():
    print(f'  {proj.id:3d}. {proj.name:<35s} {proj.total_plots} plots')
print(f'\nTotal projects: {Project.objects.count()}')
print(f'Total plots:    {Plot.objects.count()}')

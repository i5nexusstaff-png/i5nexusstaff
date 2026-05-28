"""
Loads all plot data from the revised Excel file into the Django database
in exact sheet order. Clears any existing projects/plots first.
Run: python load_plots_revised.py
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

XL = r'E:\i5 layouts\i5 AVAILABLE PLOTS DETAILS (revised).xlsx'

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
    if 'sold' in r or 'sold out' in r: return 'sold'
    if 'book' in r: return 'booked'
    if 'block' in r: return 'blocked'
    if 'process' in r or 'progress' in r: return 'in_process'
    return 'available'

def create_project(name, location='', description=''):
    p = Project.objects.create(name=name, location=location, description=description)
    print(f'  [CREATED] {name}')
    return p

def load_plots(project, rows):
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
    print(f'    -> {len(objs)} plots loaded')

# ── Wipe slate ────────────────────────────────────────────────────────────────
print('Clearing existing data...')
Plot.objects.all().delete()
Project.objects.all().delete()
print('Done.\n')

print('Reading Excel...')
xl = pd.ExcelFile(XL)
print(f'Sheets: {xl.sheet_names}\n')

# =============================================================================
# Sheet 1: "cynosure & jmr nagar"
# i5 Cynosure (left):  3 groups row-by-row in cols [1,2], [3,4]  (plot_no, area)
#   header row 2, data rows 3-23 (row 24 = "Total sq.ft", row 25 = NOTE)
# JMR Nagar (right):   3 groups in cols [6,7],[8,9],[10,11]  (plot_no, area)
#   header row 3, data rows 4-30 (row 31 = totals, row 32 = note)
# No rate/status in either — all available.
# =============================================================================
print('[Sheet] cynosure & jmr nagar')
raw = pd.read_excel(XL, sheet_name='cynosure & jmr nagar', header=None)

cyn_rows = []
# Data rows 3-23 for Cynosure (two groups side by side: cols 1-2 and cols 3-4)
for i in range(3, 24):
    row = raw.iloc[i]
    for gc in [1, 3]:   # group start columns
        pno = ss(row.iloc[gc])
        if not pno or pno.lower() in ('total sq.ft',):
            continue
        # Skip obvious non-plot values
        if any(kw in pno.lower() for kw in ('total', 'note', 'sq.ft', 'plot', 'shop', 'emi')):
            continue
        # Shop entries are valid plots
        area = sf(row.iloc[gc + 1]) if gc + 1 < len(row) else None
        cyn_rows.append({'plot_no': pno, 'area_sqft': area, 'status': 'available'})

p_cyn = create_project('i5 Cynosure', location='Chennai')
load_plots(p_cyn, cyn_rows)

jmr_rows = []
# Data rows 4-30 for JMR (three groups: cols 6-7, 8-9, 10-11)
for i in range(4, 31):
    row = raw.iloc[i]
    for gc in [6, 8, 10]:
        pno = ss(row.iloc[gc]) if gc < len(row) else ''
        if not pno:
            continue
        if any(kw in pno.lower() for kw in ('plot', 'sq.ft', 'total', 'note', 'booked')):
            continue
        area = sf(row.iloc[gc + 1]) if gc + 1 < len(row) else None
        jmr_rows.append({'plot_no': pno, 'area_sqft': area, 'status': 'available'})

p_jmr = create_project('JMR Nagar', location='Chennai')
load_plots(p_jmr, jmr_rows)

# =============================================================================
# Sheet 2: "Sheet16" — SKIP (empty)
# =============================================================================
print('[Sheet] Sheet16 -> SKIP')

# =============================================================================
# Sheet 3: "THE PALACE" — i5 Palace City
# Row 0 = header. Survey section headers in col0 (prefix plot_no to avoid duplicates).
# =============================================================================
print('[Sheet] THE PALACE -> i5 Palace City')
raw = pd.read_excel(XL, sheet_name='THE PALACE', header=None)

palace_rows = []
current_survey = ''
for i in range(1, len(raw)):
    row = raw.iloc[i]
    col0 = ss(row.iloc[0])
    if col0.upper().startswith('SURVEY'):
        # "SURVEY NO-267/1B" -> "267-1B"
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
        'facing': ss(row.iloc[2]) if len(row) > 2 else '',
        'area_sqft': sf(row.iloc[3]) if len(row) > 3 else None,
        'rate_per_sqft': sf(row.iloc[4]) if len(row) > 4 else None,
        'total_cost': sf(row.iloc[5]) if len(row) > 5 else None,
        'status': map_status(st_raw) if st_raw else 'available',
    })

p_palace = create_project('i5 Palace City', location='Chennai')
load_plots(p_palace, palace_rows)

# =============================================================================
# Sheet 4: "aurowin " — Aurowin Enclave
# Header row 0: S.No | Plot No | Facing | Area (sq.ft) | Rate/sqft | Total Cost | Status
# =============================================================================
print('[Sheet] aurowin -> Aurowin Enclave')
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

p_auro = create_project('Aurowin Enclave', location='Chennai')
load_plots(p_auro, auro_rows)

# =============================================================================
# Sheet 5: "MADHAVARAM" — CK Madhavan Nagar
# Header row 0: S.No | Plot No | Facing | Area (sq.ft) | Rate/sqft | Total Cost | Status
# Two sections separated by empty rows; roman numeral plot_no rows are valid data.
# =============================================================================
print('[Sheet] MADHAVARAM -> CK Madhavan Nagar')
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

p_madh = create_project('CK Madhavan Nagar', location='Madhavaram, Chennai')
load_plots(p_madh, madh_rows)

# =============================================================================
# Sheet 6: "Wonder city " — i5 WonderCity
# Header row 0: S.No | Plot No | Facing | Area (sq.ft) | Rate/sqft | Total Cost | Status
# =============================================================================
print('[Sheet] Wonder city -> i5 WonderCity')
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

p_wc = create_project('i5 WonderCity', location='Chennai')
load_plots(p_wc, wc_rows)

# =============================================================================
# Sheet 7: "ARM" — i5 ARM Villas
# 3 villa types: Villa-A (rows 6), Villa-B (row 7), Villa-C (row 11)
# Cols: ITEM | LAND AREA SQ.FT | CONSTRUCTION AREA SQ.FT | PRICE PER SQ.FT |
#       EB CHARGES | LEGAL & ADMIN | BALCONY | FINALISED VILLA COST
# Store land area as area_sqft, price/sqft as rate, final cost as total_cost.
# =============================================================================
print('[Sheet] ARM -> i5 ARM Villas')
raw = pd.read_excel(XL, sheet_name='ARM', header=None)

arm_rows = []
villa_data_rows = [6, 7, 11]  # exact row indices for villa data
for i in villa_data_rows:
    row = raw.iloc[i]
    pno = ss(row.iloc[1])
    if not pno: continue
    # Normalise name: "VILLA -A" -> "Villa-A"
    pno = pno.replace(' -', '-').replace('- ', '-').title()
    arm_rows.append({
        'plot_no': pno,
        'area_sqft': sf(row.iloc[2]),       # LAND AREA SQ.FT
        'rate_per_sqft': sf(row.iloc[4]),   # PRICE PER SQ.FT
        'total_cost': sf(row.iloc[8]),      # FINALISED VILLA COST
        'status': 'available',
    })

p_arm = create_project('i5 ARM Villas', location='Manimangalam, Tambaram, Chennai')
load_plots(p_arm, arm_rows)

# =============================================================================
# Sheet 8: "TAMARA FARM" — Tamara Farm
# Header row 1 (row 0 blank): S.No | Plot No | Facing | Area (sq.ft) | Rate/sqft | Total Cost | Status
# =============================================================================
print('[Sheet] TAMARA FARM -> Tamara Farm')
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

p_tam = create_project('Tamara Farm', location='Chennai')
load_plots(p_tam, tam_rows)

# =============================================================================
# Sheet 9: "OMR i5 City" — OMR i5 City
# Header row 1 (row 0 blank): S.No | Plot No | Facing | Area (sq.ft) | Rate/sqft | Total Cost | Status
# =============================================================================
print('[Sheet] OMR i5 City')
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

p_omr = create_project('OMR i5 City', location='OMR, Chennai')
load_plots(p_omr, omr_rows)

# =============================================================================
# Sheet 10: "spyka bliss booked" — i5 Spyka Bliss (all sold)
# Header at row 4: S.NO | studio/flat/shop | FLAT NOS
# col1=S.No, col2=type, col3=flat number (plot_no)
# =============================================================================
print('[Sheet] spyka bliss booked -> i5 Spyka Bliss')
raw = pd.read_excel(XL, sheet_name='spyka bliss booked', header=None)

spyka_rows = []
for i in range(5, len(raw)):
    row = raw.iloc[i]
    flat_no = ss(row.iloc[3])   # FLAT NOS column
    flat_type = ss(row.iloc[2]) # studio/flat/shop type
    if not flat_no or flat_no.lower() in ('nan', 'flat nos', ''):
        continue
    spyka_rows.append({
        'plot_no': flat_no,
        'facing': flat_type,    # store type info in facing field
        'status': 'sold',
    })

p_spyka = create_project('i5 Spyka Bliss', location='Chennai')
load_plots(p_spyka, spyka_rows)

# =============================================================================
# Sheet 11: "sunrise city" — i5 Sunrise City
# Header at row 4: PLOT NO | SQ.FT | FACING | rate per sq.ft (repeated 5 times)
# 5 groups starting at cols 1, 5, 9, 13, 17 — each with 4 cols
# No status → all available
# =============================================================================
print('[Sheet] sunrise city -> i5 Sunrise City')
raw = pd.read_excel(XL, sheet_name='sunrise city', header=None)

GROUP_COLS = [1, 5, 9, 13, 17]  # plot_no start col for each group
sun_rows = []
for i in range(5, len(raw)):
    row = raw.iloc[i]
    for gc in GROUP_COLS:
        pno = ss(row.iloc[gc]) if gc < len(row) else ''
        if not pno or any(kw in pno.lower() for kw in ('plot', 'sq.ft', 'total', 'note', 'grand')):
            continue
        try:
            float(pno)  # plot numbers are numeric
        except ValueError:
            continue
        area = sf(row.iloc[gc + 1]) if gc + 1 < len(row) else None
        facing = ss(row.iloc[gc + 2]) if gc + 2 < len(row) else ''
        rate = sf(row.iloc[gc + 3]) if gc + 3 < len(row) else None
        cost = (area * rate) if (area and rate) else None
        sun_rows.append({
            'plot_no': pno,
            'area_sqft': area,
            'facing': facing,
            'rate_per_sqft': rate,
            'total_cost': cost,
            'status': 'available',
        })

p_sun = create_project('i5 Sunrise City', location='Chennai')
load_plots(p_sun, sun_rows)

# =============================================================================
# Sheet 12: "Copy of global & somas garden &"
# Global City section (rows 1-5): SKIP — no Global City project in revised file
# Somas Garden (rows 13-22):
#   Header row 16: PLOT no | Facing | PLOT SFT | rate per sq.ft | VACANT
#   Data rows 17-22 (col1=plot_no, col2=facing, col3=area, col4=rate)
# Happy i5 Town (rows 26-39):
#   Header row 28: PLOT NO | PLOT SFT | Vacant
#   Data rows 29-39 (col1=plot_no, col2=area), rate=3600 from title
# =============================================================================
print('[Sheet] Copy of global & somas garden & -> Somas Garden + Happy i5 Town')
raw = pd.read_excel(XL, sheet_name='Copy of global & somas garden &', header=None)

# Somas Garden: rows 17-22
somas_rows = []
for i in range(17, 23):
    row = raw.iloc[i]
    pno = ss(row.iloc[1])
    if not pno or any(kw in pno.lower() for kw in ('plot', 'total', 'somas', 'phase', 'vacant', 'no')):
        continue
    somas_rows.append({
        'plot_no': pno,
        'facing': ss(row.iloc[2]),
        'area_sqft': sf(row.iloc[3]),
        'rate_per_sqft': sf(row.iloc[4]),
        'status': 'available',
    })

p_somas = create_project('Somas Garden', location='Chennai')
load_plots(p_somas, somas_rows)

# Happy i5 Town: rows 29-39 (row 40 is total)
HAPPY_RATE = 3600.0
happy_rows = []
for i in range(29, 40):
    row = raw.iloc[i]
    pno = ss(row.iloc[1])
    if not pno or any(kw in pno.lower() for kw in ('plot', 'total', 'happy', 'vacant', 'no', 'sq.ft')):
        continue
    area = sf(row.iloc[2])
    happy_rows.append({
        'plot_no': pno,
        'area_sqft': area,
        'rate_per_sqft': HAPPY_RATE,
        'status': 'available',
    })

p_happy = create_project('Happy i5 Town', location='Chennai')
load_plots(p_happy, happy_rows)

# =============================================================================
# Summary
# =============================================================================
print('\n=== DONE ===')
from projects.models import Project
from plots.models import Plot
for p in Project.objects.all():
    print(f'  {p.id:3d}. {p.name:<35s} {p.total_plots} plots')
print(f'\nTotal projects: {Project.objects.count()}')
print(f'Total plots:    {Plot.objects.count()}')

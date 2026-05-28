"""
Loads all plot data from the Excel file into the Django database.
Run: python load_plots.py
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

XL = r'C:\Users\georg\Downloads\i5 AVAILABLE PLOTS DETAILS (1).xlsx'

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
    return 'available'

def upsert_project(name, location='', description=''):
    p, created = Project.objects.get_or_create(name=name,
        defaults={'location': location, 'description': description})
    tag = 'CREATED' if created else 'EXISTS'
    print(f'  [{tag}] {name}')
    return p

def load_plots(project, rows):
    project.plots.all().delete()
    objs = []
    for r in rows:
        pno = ss(r.get('plot_no', ''))
        if not pno: continue
        objs.append(Plot(
            project=project, plot_no=pno,
            area_sqft=r.get('area'), facing=ss(r.get('facing', '')),
            rate_per_sqft=r.get('rate'), total_cost=r.get('total'),
            survey_no=ss(r.get('survey_no', '')),
            status=r.get('status', 'available'),
            notes=ss(r.get('notes', '')),
        ))
    Plot.objects.bulk_create(objs, ignore_conflicts=True)
    project.total_plots = project.plots.count()
    project.save(update_fields=['total_plots'])
    print(f'    -> {len(objs)} plots loaded')

# ─────────────────────────────────────────────────────────────────────────────
# Read all sheets
# ─────────────────────────────────────────────────────────────────────────────
sheets = pd.read_excel(XL, sheet_name=None, header=None)

# ══════════════════════════════════════════════════════════════════════════════
# 1. AUROWIN  →  Aurowin Enclave
# ══════════════════════════════════════════════════════════════════════════════
print('\n=== Aurowin Enclave ===')
df = sheets['aurowin ']
# row 0 is header: S.No, Plot No, Facing, Area (sq.ft), Rate per sq.ft, Total Cost, Status
rows = []
for _, r in df.iloc[1:].iterrows():
    pno = ss(r.iloc[1])
    if not pno or pno.lower() in ('plot no', 'nan'): continue
    rows.append({'plot_no': pno, 'facing': ss(r.iloc[2]),
                 'area': sf(r.iloc[3]), 'rate': sf(r.iloc[4]),
                 'total': sf(r.iloc[5]), 'status': map_status(r.iloc[6])})
load_plots(upsert_project('Aurowin Enclave'), rows)

# ══════════════════════════════════════════════════════════════════════════════
# 2. THE PALACE  →  i5 Palace City  (multiple survey sections)
# ══════════════════════════════════════════════════════════════════════════════
print('\n=== i5 Palace City ===')
df = sheets['THE PALACE']
rows = []
current_survey = ''
survey_short = ''
for _, r in df.iloc[1:].iterrows():
    col0 = ss(r.iloc[0])
    # Detect survey section header rows (S.No is a string like "SURVEY NO-...")
    if col0.upper().startswith('SURVEY'):
        current_survey = col0
        # Short tag for prefixing: "SURVEY NO-267/1B" -> "267/1B"
        survey_short = col0.replace('SURVEY NO-', '').replace('SURVEY NO ', '').strip()
        continue
    pno = ss(r.iloc[1])
    if not pno or pno.lower() in ('plot no', 'nan'): continue
    # Skip rows where area is missing (total/note rows)
    area = sf(r.iloc[3])
    if area is None: continue
    # Prefix survey section to avoid plot_no collisions across surveys
    prefixed_pno = f'{survey_short}-{pno}' if survey_short else pno
    rows.append({'plot_no': prefixed_pno, 'facing': ss(r.iloc[2]),
                 'area': area, 'rate': sf(r.iloc[4]),
                 'total': sf(r.iloc[5]), 'status': map_status(r.iloc[6]),
                 'survey_no': current_survey})
load_plots(upsert_project('i5 Palace City'), rows)

# ══════════════════════════════════════════════════════════════════════════════
# 3. THE ENCLAVE & THE WOUNDER  →  i5 WonderCity
# ══════════════════════════════════════════════════════════════════════════════
print('\n=== i5 WonderCity ===')
df = sheets['THE ENCLAVE & THE WOUNDER']
rows = []
for _, r in df.iloc[1:].iterrows():
    pno = ss(r.iloc[1])
    if not pno or pno.lower() in ('plot no', 'nan'): continue
    area = sf(r.iloc[3])
    if area is None: continue
    rows.append({'plot_no': pno, 'facing': ss(r.iloc[2]),
                 'area': area, 'rate': sf(r.iloc[4]),
                 'total': sf(r.iloc[5]), 'status': map_status(r.iloc[6])})
load_plots(upsert_project('i5 WonderCity'), rows)

# ══════════════════════════════════════════════════════════════════════════════
# 4. OMR i5 City  →  OMR i5 City
# ══════════════════════════════════════════════════════════════════════════════
print('\n=== OMR i5 City ===')
df = sheets['OMR i5 City']
rows = []
for _, r in df.iloc[2:].iterrows():   # row 0=blank, row 1=header
    pno = ss(r.iloc[1])
    if not pno or pno.lower() in ('plot no', 'nan'): continue
    area = sf(r.iloc[3])
    if area is None: continue
    rows.append({'plot_no': pno, 'facing': ss(r.iloc[2]),
                 'area': area, 'rate': sf(r.iloc[4]),
                 'total': sf(r.iloc[5]), 'status': map_status(r.iloc[6])})
load_plots(upsert_project('OMR i5 City'), rows)

# ══════════════════════════════════════════════════════════════════════════════
# 5. MADHAVARAM  →  CK Madhavan Nagar  (two sections in one sheet)
# ══════════════════════════════════════════════════════════════════════════════
print('\n=== CK Madhavan Nagar ===')
df = sheets['MADHAVARAM']
rows = []
for _, r in df.iloc[1:].iterrows():
    col0 = ss(r.iloc[0])
    # section-break row at ~row 260: "NaN" in col0, "PLOT" in col1
    pno = ss(r.iloc[1])
    if not pno or pno.lower() in ('nan', 'plot no', 'plot'): continue
    # skip rows that are section headers (area value is non-numeric like "AREA")
    area = sf(r.iloc[3])
    if area is None: continue
    rows.append({'plot_no': pno, 'facing': ss(r.iloc[2]),
                 'area': area, 'rate': sf(r.iloc[4]),
                 'total': sf(r.iloc[5]), 'status': map_status(r.iloc[6])})
load_plots(upsert_project('CK Madhavan Nagar'), rows)

# ══════════════════════════════════════════════════════════════════════════════
# 6. i5 Global City  →  i5 Global City
#    Layout: col0=S.No, col1=PlotNo, col2=Area(mislabeled Facing), col4=Rate, col5=Total
# ══════════════════════════════════════════════════════════════════════════════
print('\n=== i5 Global City ===')
df = sheets['i5 Global City']
rows = []
for _, r in df.iloc[1:].iterrows():
    pno = ss(r.iloc[1])
    if not pno or pno.lower() in ('nan', 'plot no'): continue
    area = sf(r.iloc[2])
    rate = sf(r.iloc[4])
    total = sf(r.iloc[5])
    if area is None: continue
    rows.append({'plot_no': pno, 'area': area, 'rate': rate,
                 'total': total, 'status': 'available'})
load_plots(upsert_project('i5 Global City'), rows)

# ══════════════════════════════════════════════════════════════════════════════
# 7. TAMARA FARM  →  NEW project: Tamara Farm
# ══════════════════════════════════════════════════════════════════════════════
print('\n=== Tamara Farm ===')
df = sheets['TAMARA FARM']
rows = []
for _, r in df.iloc[2:].iterrows():   # row 0=blank, row 1=header
    pno = ss(r.iloc[1])
    if not pno or pno.lower() in ('nan', 'plot no'): continue
    area = sf(r.iloc[3])
    if area is None: continue
    rows.append({'plot_no': pno, 'facing': ss(r.iloc[2]),
                 'area': area, 'rate': sf(r.iloc[4]),
                 'total': sf(r.iloc[5]), 'status': 'available'})
load_plots(upsert_project('Tamara Farm', location='Tambaram'), rows)

# ══════════════════════════════════════════════════════════════════════════════
# 8. cynosure & jmr nagar  →  TWO new projects
#    Left  (cols 1,2 and 3,4): i5 Cynosure
#    Right (cols 6,7 / 8,9 / 10,11): JMR Nagar
# ══════════════════════════════════════════════════════════════════════════════
print('\n=== i5 Cynosure ===')
df = sheets['cynosure & jmr nagar']
cyn_rows = []
jmr_rows = []

for _, r in df.iloc[3:].iterrows():   # rows 0-2 = blanks/headers
    # Left block: two sub-columns (cols 1,2) and (cols 3,4)
    for pc, ac in [(1,2), (3,4)]:
        pno = ss(r.iloc[pc])
        area = sf(r.iloc[ac])
        if pno and pno.lower() not in ('nan','plot no','total sq.ft') and area:
            cyn_rows.append({'plot_no': pno, 'area': area, 'status': 'available'})
    # Right block: three sub-columns (cols 6,7), (8,9), (10,11)
    for pc, ac in [(6,7), (8,9), (10,11)]:
        pno = ss(r.iloc[pc])
        area = sf(r.iloc[ac])
        if pno and pno.lower() not in ('nan','plot no','total sq.ft','avaliable plots') and area:
            jmr_rows.append({'plot_no': pno, 'area': area, 'status': 'available'})

load_plots(upsert_project('i5 Cynosure'), cyn_rows)

print('\n=== JMR Nagar ===')
load_plots(upsert_project('JMR Nagar'), jmr_rows)

# ══════════════════════════════════════════════════════════════════════════════
# 9. sunrise city  →  NEW project: i5 Sunrise City
#    Multi-column layout: 5 groups of (PLOT NO, SQ.FT, FACING, rate per sq.ft)
#    Row 4 = header, rows 5-54 = data
# ══════════════════════════════════════════════════════════════════════════════
print('\n=== i5 Sunrise City ===')
df = sheets['sunrise city']
rows = []
# 5 groups starting at columns: 1,5,9,13,17  (0-based index into row)
group_starts = [1, 5, 9, 13, 17]
for _, r in df.iloc[5:].iterrows():   # rows 0-4 = blank/title/header
    for g in group_starts:
        pno = ss(r.iloc[g])
        area = sf(r.iloc[g+1])
        facing = ss(r.iloc[g+2])
        rate = sf(r.iloc[g+3])
        if not pno or pno.lower() == 'nan': continue
        if area is None: continue
        total = (area * rate) if (area and rate) else None
        rows.append({'plot_no': str(pno), 'area': area, 'facing': facing,
                     'rate': rate, 'total': total, 'status': 'available'})
load_plots(upsert_project('i5 Sunrise City'), rows)

# ══════════════════════════════════════════════════════════════════════════════
# 10. ARM  →  NEW project: i5 ARM Villas  (3 villa types as "plots")
# ══════════════════════════════════════════════════════════════════════════════
print('\n=== i5 ARM Villas ===')
arm_rows = [
    {'plot_no': 'VILLA-A', 'area': 1056, 'rate': 5299, 'total': 9335609,
     'notes': 'Phase I | Construction: 1691 sqft | Balcony: 160 sqft | EB: 75000 | Legal: 50000'},
    {'plot_no': 'VILLA-B', 'area': 1464, 'rate': 5299, 'total': 9622436,
     'notes': 'Phase I | Construction: 1764 sqft | Balcony: 110 sqft | EB: 75000 | Legal: 50000'},
    {'plot_no': 'VILLA-C', 'area': 840,  'rate': 5299, 'total': 7405826,
     'notes': 'Phase II | Construction: 1374 sqft | EB: 75000 | Legal: 50000'},
]
for r in arm_rows:
    r['status'] = 'available'
load_plots(upsert_project('i5 ARM Villas', location='Manimangalam, Tambaram'), arm_rows)

# ══════════════════════════════════════════════════════════════════════════════
# 11. spyka bliss booked  →  NEW project: i5 Spyka Bliss  (sold units)
# ══════════════════════════════════════════════════════════════════════════════
print('\n=== i5 Spyka Bliss ===')
df = sheets['spyka bliss booked']
rows = []
for _, r in df.iloc[5:].iterrows():   # rows 0-4 = blanks/header
    flat_type = ss(r.iloc[2])
    flat_no   = ss(r.iloc[3])
    if not flat_no or flat_no.lower() == 'nan': continue
    rows.append({'plot_no': flat_no, 'notes': flat_type, 'status': 'sold'})
load_plots(upsert_project('i5 Spyka Bliss'), rows)

# ══════════════════════════════════════════════════════════════════════════════
# 12. Copy of global & somas garden &  →  Somas Garden + Happy i5 Town
# ══════════════════════════════════════════════════════════════════════════════
print('\n=== Somas Garden ===')
df = sheets['Copy of global & somas garden &']
# Somas Garden rows 17-22 (0-indexed), cols 1=plot, 2=facing, 3=sqft, 4=rate
somas_rows = []
for _, r in df.iloc[17:23].iterrows():
    pno = ss(r.iloc[1])
    if not pno or pno.lower() in ('nan', 'total no of plots'): continue
    area = sf(r.iloc[3])
    if area is None: continue
    rate = sf(r.iloc[4])
    somas_rows.append({'plot_no': pno, 'facing': ss(r.iloc[2]),
                       'area': area, 'rate': rate,
                       'total': (area*rate if area and rate else None),
                       'status': 'available'})
load_plots(upsert_project('Somas Garden'), somas_rows)

print('\n=== Happy i5 Town ===')
# Happy i5 Town rows 29-39 (0-indexed), cols 1=plot, 2=sqft
happy_rows = []
rate_happy = 3600.0
for _, r in df.iloc[29:39].iterrows():
    pno = ss(r.iloc[1])
    if not pno or pno.lower() in ('nan', 'total sq.ft'): continue
    area = sf(r.iloc[2])
    if area is None: continue
    happy_rows.append({'plot_no': pno, 'area': area, 'rate': rate_happy,
                       'total': area * rate_happy, 'status': 'available'})
load_plots(upsert_project('Happy i5 Town'), happy_rows)

print('\n✓ All done!')

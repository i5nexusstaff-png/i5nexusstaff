import pandas as pd
from django.core.management.base import BaseCommand
from projects.models import Project
from plots.models import Plot


EXCEL_FILE = r'C:\Users\georg\Downloads\Plots sold and unsold.xlsx'

PROJECT_META = {
    'i5 Global City': 'JMR Nagar, Mangalam Village, Nelvai, Chengalpattu',
    'i5 Palace City': 'Palace City, Chengalpattu',
    'Aurowin Enclave': 'Aurowin Enclave',
    'i5 WonderCity': 'i5 WonderCity',
    'i5 KG Garden': 'i5 KG Garden',
}


def parse_val(v):
    try:
        if pd.isna(v):
            return None
        return float(v)
    except Exception:
        return None


def str_val(v):
    try:
        if pd.isna(v):
            return ''
        return str(v).strip()
    except Exception:
        return ''


class Command(BaseCommand):
    help = 'Import plot data from Excel file into PostgreSQL'

    def handle(self, *args, **options):
        xl = pd.ExcelFile(EXCEL_FILE)
        self.stdout.write(f'Found sheets: {xl.sheet_names}')

        for sheet_name in xl.sheet_names:
            self.stdout.write(f'\nProcessing: {sheet_name}')
            project, created = Project.objects.get_or_create(
                name=sheet_name,
                defaults={'location': PROJECT_META.get(sheet_name, '')}
            )
            if not created:
                self.stdout.write(f'  Project already exists, updating plots...')
                project.plots.all().delete()

            df = pd.read_excel(EXCEL_FILE, sheet_name=sheet_name, header=None)

            if sheet_name == 'i5 Global City':
                self._import_global_city(project, df)
            elif sheet_name == 'i5 Palace City':
                self._import_palace_city(project, df)
            elif sheet_name == 'Aurowin Enclave':
                self._import_aurowin(project, df)
            elif sheet_name == 'i5 WonderCity':
                self._import_wonder_city(project, df)
            elif sheet_name == 'i5 KG Garden':
                self._import_kg_garden(project, df)

            count = project.plots.count()
            project.total_plots = count
            project.save()
            self.stdout.write(self.style.SUCCESS(f'  Imported {count} plots for {sheet_name}'))

        self.stdout.write(self.style.SUCCESS('\nImport complete!'))

    def _import_global_city(self, project, df):
        plots = []
        # Sold: cols 0,1 and 2,3 (from row 3 onward)
        for _, row in df.iloc[3:].iterrows():
            for col_pair in [(0, 1), (2, 3)]:
                pno = str_val(row.iloc[col_pair[0]])
                sqft = parse_val(row.iloc[col_pair[1]])
                if pno and pno not in ('nan', 'NaN', ''):
                    plots.append(Plot(project=project, plot_no=pno, area_sqft=sqft, status='sold'))

        # Available: cols 5,6 and 7,8 and 9,10
        for _, row in df.iloc[3:].iterrows():
            for col_pair in [(5, 6), (7, 8), (9, 10)]:
                if col_pair[0] < len(row):
                    pno = str_val(row.iloc[col_pair[0]])
                    sqft = parse_val(row.iloc[col_pair[1]]) if col_pair[1] < len(row) else None
                    if pno and pno not in ('nan', 'NaN', ''):
                        plots.append(Plot(project=project, plot_no=pno, area_sqft=sqft, status='available'))

        Plot.objects.bulk_create(plots, ignore_conflicts=True)

    def _import_palace_city(self, project, df):
        plots = []
        current_survey = ''
        # Parse sold section (cols 0-4)
        for _, row in df.iterrows():
            v0 = str_val(row.iloc[0])
            if 'SURVEY' in v0.upper():
                current_survey = v0
                continue
            if v0 in ('S.NO', 'Nil', '') or v0 == 'nan':
                continue
            pno = str_val(row.iloc[1])
            sqft = parse_val(row.iloc[2])
            rate = parse_val(row.iloc[3])
            facing = str_val(row.iloc[4])
            if pno and pno not in ('nan', 'NaN', '', 'Nil', 'PLOT NO'):
                plots.append(Plot(
                    project=project, plot_no=pno, area_sqft=sqft,
                    rate_per_sqft=rate, facing=facing,
                    survey_no=current_survey, status='sold'
                ))

        # Parse available section (cols 6-10 and 11-15)
        current_survey = ''
        for _, row in df.iterrows():
            for offset in [6, 11]:
                if offset >= len(row):
                    continue
                v = str_val(row.iloc[offset])
                if 'SURVEY' in v.upper():
                    current_survey = v
                    continue
                if v in ('S.NO', 'Nil', '') or v == 'nan':
                    continue
                try:
                    int(v)
                    pno = str_val(row.iloc[offset + 1]) if offset + 1 < len(row) else ''
                    sqft = parse_val(row.iloc[offset + 2]) if offset + 2 < len(row) else None
                    rate = parse_val(row.iloc[offset + 3]) if offset + 3 < len(row) else None
                    facing = str_val(row.iloc[offset + 4]) if offset + 4 < len(row) else ''
                    if pno and pno not in ('nan', 'NaN', '', 'Nil', 'PLOT NO'):
                        plots.append(Plot(
                            project=project, plot_no=pno, area_sqft=sqft,
                            rate_per_sqft=rate, facing=facing,
                            survey_no=current_survey, status='available'
                        ))
                except (ValueError, TypeError):
                    pass

        Plot.objects.bulk_create(plots, ignore_conflicts=True)

    def _import_aurowin(self, project, df):
        plots = []
        # Data starts at row 2, columns in groups of 6 (with separator at col 6)
        col_groups_sold = [(0, 1, 2, 3, 4, 5)]
        col_groups_avail = [(7, 8, 9, 10, 11, 12), (13, 14, 15, 16, 17, 18), (19, 20, 21, 22, 23, 24)]

        for _, row in df.iloc[2:].iterrows():
            for cols in col_groups_sold:
                pno = str_val(row.iloc[cols[0]])
                sqft = parse_val(row.iloc[cols[1]])
                facing = str_val(row.iloc[cols[2]])
                road = str_val(row.iloc[cols[3]])
                rate = parse_val(row.iloc[cols[4]])
                cost = parse_val(row.iloc[cols[5]])
                if pno and pno not in ('nan', 'NaN', '', 'PLOT NO'):
                    try:
                        int(pno)
                        plots.append(Plot(
                            project=project, plot_no=pno, area_sqft=sqft,
                            facing=facing, road_width=road, rate_per_sqft=rate,
                            total_cost=cost, status='sold'
                        ))
                    except ValueError:
                        pass

            for cols in col_groups_avail:
                if cols[0] >= len(row):
                    continue
                pno = str_val(row.iloc[cols[0]])
                sqft = parse_val(row.iloc[cols[1]]) if cols[1] < len(row) else None
                facing = str_val(row.iloc[cols[2]]) if cols[2] < len(row) else ''
                road = str_val(row.iloc[cols[3]]) if cols[3] < len(row) else ''
                rate = parse_val(row.iloc[cols[4]]) if cols[4] < len(row) else None
                cost = parse_val(row.iloc[cols[5]]) if cols[5] < len(row) else None
                if pno and pno not in ('nan', 'NaN', '', 'PLOT NO'):
                    try:
                        int(pno)
                        plots.append(Plot(
                            project=project, plot_no=pno, area_sqft=sqft,
                            facing=facing, road_width=road, rate_per_sqft=rate,
                            total_cost=cost, status='available'
                        ))
                    except ValueError:
                        pass

        Plot.objects.bulk_create(plots, ignore_conflicts=True)

    def _import_wonder_city(self, project, df):
        plots = []
        for _, row in df.iloc[2:].iterrows():
            for col_pair in [(0, 1), (2, 3)]:
                pno = str_val(row.iloc[col_pair[0]])
                sqft = parse_val(row.iloc[col_pair[1]])
                if pno and pno not in ('nan', 'NaN', '', 'PLOT NO'):
                    plots.append(Plot(project=project, plot_no=pno, area_sqft=sqft, status='sold'))

            for col_pair in [(5, 6), (7, 8)]:
                if col_pair[0] < len(row):
                    pno = str_val(row.iloc[col_pair[0]])
                    sqft = parse_val(row.iloc[col_pair[1]]) if col_pair[1] < len(row) else None
                    if pno and pno not in ('nan', 'NaN', '', 'PLOT NO'):
                        plots.append(Plot(project=project, plot_no=pno, area_sqft=sqft, status='available'))

        Plot.objects.bulk_create(plots, ignore_conflicts=True)

    def _import_kg_garden(self, project, df):
        plots = []
        for _, row in df.iloc[2:].iterrows():
            pno = str_val(row.iloc[0])
            sqft = parse_val(row.iloc[1])
            facing = str_val(row.iloc[2])
            rate = parse_val(row.iloc[3])
            if pno and pno not in ('nan', 'NaN', '', 'PLOT NO'):
                plots.append(Plot(
                    project=project, plot_no=pno, area_sqft=sqft,
                    facing=facing, rate_per_sqft=rate, status='sold'
                ))

            if 7 < len(row):
                pno2 = str_val(row.iloc[7])
                sqft2 = parse_val(row.iloc[8]) if 8 < len(row) else None
                facing2 = str_val(row.iloc[9]) if 9 < len(row) else ''
                rate2 = parse_val(row.iloc[10]) if 10 < len(row) else None
                if pno2 and pno2 not in ('nan', 'NaN', '', 'PLOT NO'):
                    plots.append(Plot(
                        project=project, plot_no=pno2, area_sqft=sqft2,
                        facing=facing2, rate_per_sqft=rate2, status='available'
                    ))

        Plot.objects.bulk_create(plots, ignore_conflicts=True)

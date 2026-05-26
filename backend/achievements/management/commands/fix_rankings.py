"""
Management command: fix_rankings
Re-calculates all sales team rankings for every period in the database,
excluding dirty '*'-prefixed template rows that may have been accidentally
ingested and caused rank gaps (e.g. rank 1 → 3 with no rank 2 visible).

Usage:
    python manage.py fix_rankings

Run this once after deploying the ranking-fix patch.  It is safe to run
multiple times — the operation is idempotent.
"""
from django.core.management.base import BaseCommand
from achievements.models import TeamAchievement
from achievements.ranking import recalculate_rankings


class Command(BaseCommand):
    help = 'Re-rank all sales periods, excluding dirty template rows'

    def handle(self, *args, **options):
        periods = (
            TeamAchievement.objects
            .filter(team_type='sales')
            .exclude(team_name__startswith='*')
            .exclude(employee__employee_name__startswith='*')
            .values('month', 'year')
            .distinct()
            .order_by('year', 'month')
        )
        count = 0
        for p in periods:
            recalculate_rankings(p['month'], p['year'])
            self.stdout.write(f"  OK {p['month']:02d}/{p['year']}")
            count += 1

        if count == 0:
            self.stdout.write('No sales periods found — nothing to recalculate.')
        else:
            self.stdout.write(
                self.style.SUCCESS(f'\nDone — recalculated {count} period(s).')
            )

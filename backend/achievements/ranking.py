"""
Recalculate SALES team rankings for a given month/year.
Pre-Sales teams are NOT ranked — they only show data.
"""
from django.db.models import Sum, Count
from .models import TeamAchievement, TeamRanking


def recalculate_rankings(month, year):
    """
    Aggregate TeamAchievement rows for SALES teams only, rank by total sq.ft sold,
    and upsert into TeamRanking.  Pre-Sales data is stored but never ranked.
    """
    agg = (
        TeamAchievement.objects
        .filter(month=month, year=year, team_type='sales')
        # Exclude dirty template-note rows that were accidentally uploaded.
        # Without these excludes, a "*Fixed" team consumes rank 2 and makes
        # the real 3rd team appear as rank 4 with no medal.
        .exclude(team_name__startswith='*')
        .exclude(employee__employee_name__startswith='*')
        .values('team_name', 'team_type')
        .annotate(
            total_sqft=Sum('square_feet_sold'),
            total_units=Sum('units_sold'),
            total_bookings=Sum('bookings'),
            member_count=Count('id'),
        )
    )

    # Also delete any stale TeamRanking rows for dirty teams so they can't
    # surface in the rankings API even if somehow the data was re-ingested.
    TeamRanking.objects.filter(
        team_type='sales', month=month, year=year,
        team_name__startswith='*',
    ).delete()

    teams = list(agg)
    # Primary: sq.ft desc; secondary: units desc
    teams.sort(key=lambda x: (-(x['total_sqft'] or 0), -(x['total_units'] or 0)))

    for rank_pos, t in enumerate(teams, start=1):
        TeamRanking.objects.update_or_create(
            team_name=t['team_name'],
            team_type='sales',
            month=month,
            year=year,
            defaults={
                'total_sqft':     t['total_sqft']     or 0,
                'total_units':    t['total_units']    or 0,
                'total_bookings': t['total_bookings'] or 0,
                'member_count':   t['member_count']   or 0,
                'rank':           rank_pos,
            },
        )

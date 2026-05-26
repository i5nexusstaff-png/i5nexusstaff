from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from feedback.models import Feedback


class Command(BaseCommand):
    help = 'Delete feedback records older than 14 days (2 weeks)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days', type=int, default=14,
            help='Number of days to keep (default: 14)'
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Preview what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        cutoff = timezone.now() - timedelta(days=days)

        qs = Feedback.objects.filter(created_at__lt=cutoff)
        count = qs.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS(
                f'No feedback records older than {days} days found.'
            ))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'[DRY RUN] Would delete {count} feedback record(s) older than {days} days (before {cutoff.strftime("%Y-%m-%d %H:%M")}).'
            ))
        else:
            deleted, _ = qs.delete()
            self.stdout.write(self.style.SUCCESS(
                f'Deleted {deleted} feedback record(s) older than {days} days (before {cutoff.strftime("%Y-%m-%d %H:%M")}).'
            ))

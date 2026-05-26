"""
Django management command: cleanup_attendance
Deletes attendance records (and their selfie photos) older than 45 days.

Usage:
    python manage.py cleanup_attendance
    python manage.py cleanup_attendance --days 60   # keep last 60 days
    python manage.py cleanup_attendance --dry-run   # preview only
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from attendance.models import Attendance


class Command(BaseCommand):
    help = 'Delete attendance records + selfie photos older than N days (default: 45)'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=45,
                            help='Days of records to keep (default: 45)')
        parser.add_argument('--dry-run', action='store_true',
                            help='Preview without deleting')

    def handle(self, *args, **options):
        days    = options['days']
        dry_run = options['dry_run']
        cutoff  = timezone.now().date() - timedelta(days=days)
        qs      = Attendance.objects.filter(date__lt=cutoff)
        count   = qs.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS(
                f'No records older than {days} days. Nothing to delete.'))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'DRY RUN: {count} record(s) before {cutoff} would be deleted.'))
            return

        # Delete media files
        media_deleted = 0
        for att in qs.iterator():
            for field in (att.punch_in_selfie, att.punch_out_selfie):
                if field:
                    try:
                        field.delete(save=False)
                        media_deleted += 1
                    except Exception:
                        pass

        deleted, _ = qs.delete()
        self.stdout.write(self.style.SUCCESS(
            f'Deleted {deleted} attendance record(s) and {media_deleted} selfie photo(s) '
            f'older than {cutoff} ({days} days).'))

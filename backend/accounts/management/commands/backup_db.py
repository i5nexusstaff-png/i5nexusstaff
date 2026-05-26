"""
Django management command: backup_db
Creates a JSON dump of all app data into a timestamped backup file.

Usage:
    python manage.py backup_db
    python manage.py backup_db --output C:\\backups
"""
import os
import subprocess
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Backup all database data to a JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default=str(settings.BASE_DIR / 'backups'),
            help='Directory to save backup file (default: backend/backups/)',
        )

    def handle(self, *args, **options):
        output_dir = options['output']
        os.makedirs(output_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'backup_{timestamp}.json'
        filepath = os.path.join(output_dir, filename)

        apps = [
            'accounts', 'projects', 'plots', 'attendance',
            'reports', 'feedback', 'todos', 'tutorials',
            'achievements', 'leaves', 'notifications', 'offers', 'banners',
        ]

        self.stdout.write(f'Creating backup: {filepath}')
        try:
            result = subprocess.run(
                ['python', 'manage.py', 'dumpdata', '--indent', '2'] + apps + ['--output', filepath],
                cwd=str(settings.BASE_DIR),
                capture_output=True, text=True
            )
            if result.returncode == 0:
                size_kb = os.path.getsize(filepath) // 1024
                self.stdout.write(self.style.SUCCESS(
                    f'Backup saved: {filepath} ({size_kb} KB)'
                ))
            else:
                self.stdout.write(self.style.ERROR(f'Backup failed: {result.stderr}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error: {e}'))

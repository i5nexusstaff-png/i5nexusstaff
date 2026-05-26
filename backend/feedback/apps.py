import os
import threading
from django.apps import AppConfig


def _feedback_cleanup_worker():
    """
    Daemon thread: runs every 24 hours and deletes Feedback records
    that are older than 14 days (2 weeks).
    """
    import time
    while True:
        # Sleep 24 h between each check
        time.sleep(24 * 3600)
        try:
            from django.utils import timezone
            from datetime import timedelta
            from feedback.models import Feedback

            cutoff = timezone.now() - timedelta(days=14)
            deleted, _ = Feedback.objects.filter(created_at__lt=cutoff).delete()
            if deleted:
                print(
                    f'[Feedback cleanup] Auto-deleted {deleted} record(s) '
                    f'older than 14 days.',
                    flush=True,
                )
        except Exception as exc:  # pragma: no cover
            print(f'[Feedback cleanup] Error: {exc}', flush=True)


class FeedbackConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'feedback'

    def ready(self):
        # RUN_MAIN is set by Django's auto-reloader in the child (worker) process.
        # We start the thread only there to avoid launching two threads when
        # DEBUG=True / runserver is used (reloader forks twice).
        if os.environ.get('RUN_MAIN') == 'true':
            t = threading.Thread(
                target=_feedback_cleanup_worker,
                daemon=True,
                name='feedback-cleanup',
            )
            t.start()
            print('[Feedback cleanup] Auto-deletion scheduler started (runs every 24 h, removes records > 14 days old).', flush=True)

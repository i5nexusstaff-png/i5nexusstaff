import os
import threading
import time
from django.apps import AppConfig

# Flag file to prevent running more than once per day
_LOCK = os.path.join(os.path.dirname(__file__), '.cleanup_last_run')
_DAYS = 45


class AttendanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'attendance'
    verbose_name = 'Attendance'

    def ready(self):
        # Runs in background so it doesn't slow down Django startup
        t = threading.Thread(target=_auto_cleanup, daemon=True)
        t.start()


def _auto_cleanup():
    """Delete attendance records (+ their selfie files) older than 45 days.
    Runs at most once per 24 hours using a lock file."""
    try:
        now = time.time()
        if os.path.exists(_LOCK):
            last = float(open(_LOCK).read().strip() or '0')
            if now - last < 86400:  # 24 h
                return
    except Exception:
        pass

    try:
        from django.utils import timezone
        from datetime import timedelta
        from .models import Attendance

        cutoff = timezone.now().date() - timedelta(days=_DAYS)
        old    = Attendance.objects.filter(date__lt=cutoff)
        count  = old.count()

        if count == 0:
            _write_lock()
            return

        # Delete associated media files first
        for att in old.iterator():
            try:
                if att.punch_in_selfie:
                    att.punch_in_selfie.delete(save=False)
                if att.punch_out_selfie:
                    att.punch_out_selfie.delete(save=False)
            except Exception:
                pass

        deleted, _ = old.delete()
        print(f'[Attendance] Auto-cleanup: removed {deleted} record(s) older than {_DAYS} days.')
        _write_lock()

    except Exception as exc:
        print(f'[Attendance] Auto-cleanup error: {exc}')


def _write_lock():
    try:
        with open(_LOCK, 'w') as f:
            f.write(str(time.time()))
    except Exception:
        pass

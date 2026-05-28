import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def send_push_to_user(user, title, message, url='/', notif_type='general'):
    """Send a web push notification to all subscriptions of a user."""
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.warning('pywebpush not installed. Run: pip install pywebpush')
        return

    vapid_private_key = getattr(settings, 'VAPID_PRIVATE_KEY', '')
    vapid_email       = getattr(settings, 'VAPID_EMAIL', 'admin@i5nexus.com')

    if not vapid_private_key:
        logger.warning('VAPID_PRIVATE_KEY not set in settings. Push notifications disabled.')
        return

    from .models import PushSubscription
    subs = PushSubscription.objects.filter(user=user)

    payload = json.dumps({
        'title':   title,
        'message': message,
        'url':     url,
        'type':    notif_type,
    })

    dead = []
    for sub in subs:
        try:
            webpush(
                subscription_info={
                    'endpoint': sub.endpoint,
                    'keys': {'p256dh': sub.p256dh, 'auth': sub.auth},
                },
                data=payload,
                vapid_private_key=vapid_private_key,
                vapid_claims={'sub': f'mailto:{vapid_email}'},
            )
        except Exception as e:
            logger.warning(f'Push failed for sub {sub.id}: {e}')
            dead.append(sub.id)

    if dead:
        PushSubscription.objects.filter(id__in=dead).delete()


def create_and_push(recipient, title, message, notif_type='general', url=None):
    """Create a Notification record and send push notification."""
    from .models import Notification
    notif = Notification.objects.create(
        recipient=recipient,
        title=title,
        message=message,
        notif_type=notif_type,
    )
    if url is None:
        role = getattr(recipient, 'role', 'staff')
        route_map = {
            'super_admin': {
                'leave':    '/superadmin/leaves',
                'feedback': '/superadmin',
                'todo':     '/superadmin',
                'report':   '/superadmin/reports',
                'offer':    '/superadmin',
                'booking':  '/superadmin/projects',
                'tutorial': '/superadmin/tutorials',
                'general':  '/superadmin',
            },
            'admin': {
                'leave':    '/admin/leaves',
                'feedback': '/admin/feedback',
                'todo':     '/admin/todos',
                'report':   '/admin/reports',
                'offer':    '/admin/offers',
                'booking':  '/admin/projects',
                'tutorial': '/admin/tutorials',
                'general':  '/admin',
            },
            'staff': {
                'leave':    '/staff/leaves',
                'feedback': '/staff/feedback',
                'todo':     '/staff/todos',
                'report':   '/staff/reports',
                'offer':    '/staff',
                'booking':  '/staff/projects',
                'tutorial': '/staff/tutorials',
                'general':  '/staff',
            },
        }
        url = route_map.get(role, {}).get(notif_type, '/')

    send_push_to_user(recipient, title, message, url=url, notif_type=notif_type)
    return notif

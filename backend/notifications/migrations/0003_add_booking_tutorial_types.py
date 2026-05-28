from django.db import migrations, models


class Migration(migrations.Migration):
    """Add 'booking' and 'tutorial' to Notification.TYPE_CHOICES.
    This is a choices-only change — no DDL is emitted."""

    dependencies = [
        ('notifications', '0002_pushsubscription'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='notif_type',
            field=models.CharField(
                choices=[
                    ('leave',    'Leave'),
                    ('feedback', 'Feedback'),
                    ('todo',     'Todo'),
                    ('offer',    'Offer'),
                    ('report',   'Report'),
                    ('general',  'General'),
                    ('booking',  'Booking Request'),
                    ('tutorial', 'Tutorial'),
                ],
                default='general',
                max_length=20,
            ),
        ),
    ]

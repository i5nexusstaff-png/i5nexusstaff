from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0005_attendance_punch_mode_within_geofence'),
    ]

    operations = [
        migrations.AlterField(
            model_name='attendance',
            name='punch_mode',
            field=models.CharField(
                blank=True,
                choices=[('geofence', 'Geofence'), ('gps_tagged', 'GPS Tagged')],
                max_length=20,
            ),
        ),
    ]

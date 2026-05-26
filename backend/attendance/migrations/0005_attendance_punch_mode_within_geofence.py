from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0004_attendancesettings_officelocation'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendance',
            name='punch_mode',
            field=models.CharField(
                blank=True,
                choices=[('geofence', 'Geofence'), ('free_location', 'Free Location')],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='attendance',
            name='within_geofence',
            field=models.BooleanField(blank=True, null=True),
        ),
    ]

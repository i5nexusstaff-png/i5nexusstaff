from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0003_punch_out_selfie'),
    ]

    operations = [
        migrations.CreateModel(
            name='AttendanceSettings',
            fields=[
                ('id',               models.AutoField(primary_key=True, serialize=False)),
                ('shift_start',      models.TimeField(default='09:00')),
                ('shift_end',        models.TimeField(default='18:00')),
                ('grace_minutes',    models.IntegerField(default=15)),
                ('geofence_enabled', models.BooleanField(default=True)),
            ],
            options={'verbose_name': 'Attendance Settings',
                     'verbose_name_plural': 'Attendance Settings'},
        ),
        migrations.CreateModel(
            name='OfficeLocation',
            fields=[
                ('id',            models.AutoField(primary_key=True, serialize=False)),
                ('name',          models.CharField(max_length=200)),
                ('lat',           models.FloatField()),
                ('lng',           models.FloatField()),
                ('radius_meters', models.IntegerField(default=50)),
                ('address',       models.CharField(blank=True, max_length=500)),
                ('is_active',     models.BooleanField(default=True)),
                ('created_at',    models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['name']},
        ),
    ]

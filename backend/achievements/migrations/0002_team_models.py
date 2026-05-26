from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('achievements', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='TeamMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('employee_id',   models.CharField(max_length=50, unique=True)),
                ('employee_name', models.CharField(max_length=200)),
                ('department',    models.CharField(blank=True, max_length=100)),
                ('team_type',     models.CharField(choices=[('sales', 'Sales'), ('pre_sales', 'Pre-Sales')], max_length=20)),
                ('team_name',     models.CharField(max_length=200)),
                ('designation',   models.CharField(blank=True, max_length=200)),
                ('created_at',    models.DateTimeField(auto_now_add=True)),
                ('updated_at',    models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name='TeamAchievement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('team_name',        models.CharField(max_length=200)),
                ('team_type',        models.CharField(choices=[('sales', 'Sales'), ('pre_sales', 'Pre-Sales')], max_length=20)),
                ('site_visits',      models.IntegerField(default=0)),
                ('appointments',     models.IntegerField(default=0)),
                ('meetings',         models.IntegerField(default=0)),
                ('bookings',         models.IntegerField(default=0)),
                ('registrations',    models.IntegerField(default=0)),
                ('square_feet_sold', models.FloatField(default=0)),
                ('units_sold',       models.IntegerField(default=0)),
                ('month',            models.IntegerField()),
                ('year',             models.IntegerField()),
                ('created_at',       models.DateTimeField(auto_now_add=True)),
                ('updated_at',       models.DateTimeField(auto_now=True)),
                ('employee', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='team_achievements',
                    to='achievements.teammember',
                )),
            ],
            options={
                'ordering': ['-year', '-month'],
                'unique_together': {('employee', 'month', 'year')},
            },
        ),
        migrations.CreateModel(
            name='TeamRanking',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('team_name',      models.CharField(max_length=200)),
                ('team_type',      models.CharField(choices=[('sales', 'Sales'), ('pre_sales', 'Pre-Sales')], max_length=20)),
                ('total_sqft',     models.FloatField(default=0)),
                ('total_units',    models.IntegerField(default=0)),
                ('total_bookings', models.IntegerField(default=0)),
                ('member_count',   models.IntegerField(default=0)),
                ('rank',           models.IntegerField(default=0)),
                ('month',          models.IntegerField()),
                ('year',           models.IntegerField()),
            ],
            options={
                'ordering': ['team_type', 'rank'],
                'unique_together': {('team_name', 'team_type', 'month', 'year')},
            },
        ),
        migrations.CreateModel(
            name='UploadHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('uploaded_at',        models.DateTimeField(auto_now_add=True)),
                ('filename',           models.CharField(max_length=500)),
                ('month',              models.IntegerField()),
                ('year',               models.IntegerField()),
                ('records_processed',  models.IntegerField(default=0)),
                ('records_added',      models.IntegerField(default=0)),
                ('records_updated',    models.IntegerField(default=0)),
                ('errors_count',       models.IntegerField(default=0)),
                ('error_report',       models.JSONField(default=list)),
                ('uploaded_by', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-uploaded_at'],
            },
        ),
    ]

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Drop old models
        migrations.DeleteModel(name='Report'),
        migrations.DeleteModel(name='ReportTemplate'),

        # Create new DailyReport
        migrations.CreateModel(
            name='DailyReport',
            fields=[
                ('id',          models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('report_type', models.CharField(max_length=30, choices=[
                    ('sales_head',       'Sales Head Report'),
                    ('sales_manager',    'Sales Manager Report'),
                    ('vp',               'VP Report'),
                    ('telecallers_head', 'Telecallers Head Report'),
                    ('marketing',        'Marketing Report'),
                    ('bdm',              'BDM Report'),
                    ('telecallers',      'Telecallers Report'),
                ])),
                ('report_date', models.DateField()),
                ('data',        models.JSONField(default=dict)),
                ('status',      models.CharField(max_length=20, default='draft', choices=[
                    ('draft',     'Draft'),
                    ('submitted', 'Submitted'),
                    ('reviewed',  'Reviewed'),
                ])),
                ('admin_notes', models.TextField(blank=True)),
                ('submitted_at', models.DateTimeField(null=True, blank=True)),
                ('updated_at',  models.DateTimeField(auto_now=True)),
                ('created_at',  models.DateTimeField(auto_now_add=True)),
                ('user',        models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                                  related_name='daily_reports',
                                                  to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-report_date', '-updated_at'],
                'unique_together': {('user', 'report_date')},
            },
        ),
    ]

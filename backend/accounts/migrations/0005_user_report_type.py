from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_add_super_admin_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='report_type',
            field=models.CharField(
                blank=True, default='', max_length=30,
                choices=[
                    ('',                 'Not Assigned'),
                    ('sales_head',       'Sales Head Report'),
                    ('sales_manager',    'Sales Manager Report'),
                    ('vp',               'VP Report'),
                    ('telecallers_head', 'Telecallers Head Report'),
                    ('marketing',        'Marketing Report'),
                    ('bdm',              'BDM Report'),
                    ('telecallers',      'Telecallers Report'),
                ],
            ),
        ),
    ]

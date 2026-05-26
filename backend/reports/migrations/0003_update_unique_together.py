from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0002_replace_with_dailyreport'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='dailyreport',
            unique_together={('user', 'report_date', 'report_type')},
        ),
    ]

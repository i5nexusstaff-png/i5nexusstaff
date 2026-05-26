from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('achievements', '0002_team_models'),
    ]

    operations = [
        # Remove the old unique employee_id field
        migrations.RemoveField(
            model_name='teammember',
            name='employee_id',
        ),
        # Add composite unique constraint (employee_name, team_name, team_type)
        migrations.AlterUniqueTogether(
            name='teammember',
            unique_together={('employee_name', 'team_name', 'team_type')},
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('offers', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='offer',
            name='color_theme',
            field=models.CharField(
                choices=[('orange','Orange'),('purple','Purple'),('blue','Blue'),('green','Green'),('red','Red'),('gold','Gold')],
                default='orange',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='offer',
            name='priority',
            field=models.PositiveSmallIntegerField(default=5),
        ),
        migrations.AlterModelOptions(
            name='offer',
            options={'ordering': ['priority', '-created_at']},
        ),
    ]

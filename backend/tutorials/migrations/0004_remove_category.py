from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tutorials', '0003_youtube_model'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='tutorial',
            name='category',
        ),
    ]

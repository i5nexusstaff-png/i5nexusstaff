from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tutorials', '0002_tutorial_filesize'),
    ]

    operations = [
        # Clear all existing file-based records before dropping columns
        migrations.RunSQL(
            'DELETE FROM tutorials_tutorial;',
            migrations.RunSQL.noop,
        ),

        # Drop old file-storage fields
        migrations.RemoveField(model_name='tutorial', name='file'),
        migrations.RemoveField(model_name='tutorial', name='thumbnail'),
        migrations.RemoveField(model_name='tutorial', name='file_type'),
        migrations.RemoveField(model_name='tutorial', name='file_size'),

        # Add YouTube URL
        migrations.AddField(
            model_name='tutorial',
            name='youtube_url',
            field=models.URLField(max_length=500, default=''),
            preserve_default=False,
        ),

        # Add category
        migrations.AddField(
            model_name='tutorial',
            name='category',
            field=models.CharField(
                choices=[
                    ('training',    'Training'),
                    ('walkthrough', 'Walkthrough'),
                    ('testimonial', 'Testimonial'),
                    ('product',     'Product'),
                    ('general',     'General'),
                ],
                default='general',
                max_length=50,
            ),
        ),
    ]

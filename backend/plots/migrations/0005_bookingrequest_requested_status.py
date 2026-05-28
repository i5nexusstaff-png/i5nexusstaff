from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('plots', '0004_add_booking_request'),
    ]

    operations = [
        migrations.AddField(
            model_name='bookingrequest',
            name='requested_status',
            field=models.CharField(
                choices=[('blocked', 'Blocked'), ('booked', 'Booked'), ('sold', 'Sold')],
                default='blocked',
                max_length=20,
            ),
        ),
    ]

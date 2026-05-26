from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_user_department_alter_user_position_passwordresetotp'),
    ]

    operations = [
        migrations.CreateModel(
            name='CompanyProfile',
            fields=[
                ('id',               models.AutoField(primary_key=True, serialize=False)),
                ('company_name',     models.CharField(blank=True, default='', max_length=200)),
                ('logo',             models.ImageField(blank=True, null=True, upload_to='company/logos/')),
                ('address',          models.TextField(blank=True)),
                ('phone',            models.CharField(blank=True, max_length=30)),
                ('email',            models.EmailField(blank=True)),
                ('website',          models.URLField(blank=True)),
                ('about',            models.TextField(blank=True)),
                ('faq',              models.TextField(blank=True)),
                ('privacy_policy',   models.TextField(blank=True)),
                ('terms_conditions', models.TextField(blank=True)),
                ('disclaimer',       models.TextField(blank=True)),
                ('updated_at',       models.DateTimeField(auto_now=True)),
            ],
            options={'verbose_name': 'Company Profile',
                     'verbose_name_plural': 'Company Profile'},
        ),
    ]

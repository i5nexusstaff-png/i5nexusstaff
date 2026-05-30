from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import datetime
import secrets
import uuid


REPORT_TYPE_CHOICES = [
    ('',             'Not Assigned'),
    ('sm_bdm',       'SM & BDM Report'),
    ('vp_sales_head','VP & Sales Head Report'),
    ('telecallers',  'Telecallers Report'),
    ('marketing',    'Marketing Report'),
]


class User(AbstractUser):
    ROLE_CHOICES = [('admin', 'Admin'), ('staff', 'Staff'), ('super_admin', 'Super Admin')]

    role        = models.CharField(max_length=20, choices=ROLE_CHOICES, default='staff')
    report_type = models.CharField(max_length=30, blank=True, default='', choices=REPORT_TYPE_CHOICES)
    position = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    employee_id = models.CharField(max_length=30, unique=True, blank=True, null=True)
    site_location = models.CharField(max_length=255, blank=True)
    site_lat = models.FloatField(null=True, blank=True)
    site_lng = models.FloatField(null=True, blank=True)
    profile_photo = models.ImageField(upload_to='profiles/', null=True, blank=True)
    date_joined_company = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    @property
    def is_admin_role(self):
        return self.role in ('admin', 'super_admin')


class PasswordResetOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.pk:
            self.expires_at = timezone.now() + datetime.timedelta(minutes=10)
        super().save(*args, **kwargs)

    @classmethod
    def generate_for(cls, user):
        cls.objects.filter(user=user, is_used=False).update(is_used=True)
        otp = f"{secrets.randbelow(900000) + 100000}"
        return cls.objects.create(user=user, otp_code=otp,
                                  expires_at=timezone.now() + datetime.timedelta(minutes=10))

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f"OTP for {self.user.username}"


class CompanyProfile(models.Model):
    """Singleton (pk=1) — company branding + legal / support documents."""
    company_name      = models.CharField(max_length=200, blank=True, default='')
    logo              = models.ImageField(upload_to='company/logos/', null=True, blank=True)
    address           = models.TextField(blank=True)
    phone             = models.CharField(max_length=30, blank=True)
    email             = models.EmailField(blank=True)
    website           = models.URLField(blank=True)
    # Legal / support documents
    about             = models.TextField(blank=True)
    faq               = models.TextField(blank=True)
    privacy_policy    = models.TextField(blank=True)
    terms_conditions  = models.TextField(blank=True)
    disclaimer        = models.TextField(blank=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = verbose_name_plural = 'Company Profile'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return self.company_name or 'Company Profile'


def _parse_device(ua: str) -> str:
    """Return a human-readable device description from a User-Agent string."""
    ua_lower = ua.lower()
    # Browser detection (order matters)
    if 'edg/' in ua_lower or 'edga/' in ua_lower:
        browser = 'Edge'
    elif 'opr/' in ua_lower or 'opera' in ua_lower:
        browser = 'Opera'
    elif 'chrome/' in ua_lower and 'chromium' not in ua_lower:
        browser = 'Chrome'
    elif 'firefox/' in ua_lower:
        browser = 'Firefox'
    elif 'safari/' in ua_lower:
        browser = 'Safari'
    else:
        browser = 'Browser'

    # OS detection
    if 'android' in ua_lower:
        os_name = 'Android'
    elif 'iphone' in ua_lower:
        os_name = 'iPhone'
    elif 'ipad' in ua_lower:
        os_name = 'iPad'
    elif 'windows' in ua_lower:
        os_name = 'Windows'
    elif 'macintosh' in ua_lower or 'mac os' in ua_lower:
        os_name = 'macOS'
    elif 'linux' in ua_lower:
        os_name = 'Linux'
    else:
        os_name = 'Unknown'

    return f'{browser} on {os_name}'


class UserSession(models.Model):
    """Tracks active login sessions for each user (one per device/browser login)."""
    user         = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='login_sessions')
    session_key  = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    device_name  = models.CharField(max_length=300, blank=True)
    ip_address   = models.GenericIPAddressField(null=True, blank=True)
    user_agent   = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    last_active  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_active']

    def __str__(self):
        return f'{self.user.username} — {self.device_name}'

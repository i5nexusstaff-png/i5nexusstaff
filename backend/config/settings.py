from pathlib import Path
from decouple import config
from datetime import timedelta
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

_SECRET_KEY = config('SECRET_KEY', default='')
if not _SECRET_KEY or _SECRET_KEY == 'django-insecure-i5nexus-key':
    import warnings
    warnings.warn(
        "SECRET_KEY is not set or uses the insecure default. "
        "Set SECRET_KEY in your .env file before deploying to production.",
        stacklevel=2,
    )
    _SECRET_KEY = 'django-insecure-i5nexus-dev-only-do-not-use-in-production'
SECRET_KEY = _SECRET_KEY

DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'daphne',                              # must be before django.contrib.staticfiles
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'channels',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'accounts',
    'projects',
    'plots',
    'attendance',
    'reports',
    'feedback',
    'todos',
    'tutorials',
    'achievements',
    'leaves',
    'notifications',
    'offers',
    'banners',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    # XFrameOptionsMiddleware removed — internal app, files must be embeddable in our own viewer
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION  = 'config.asgi.application'

# ── Django Channels – in-memory layer (swap to Redis in production) ───────────
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    }
}

AUTH_USER_MODEL = 'accounts.User'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='i5nexus'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='postgres'),
        'HOST': config('DB_HOST', default='127.0.0.1'),
        'PORT': config('DB_PORT', default='5433'),
        # Reuse DB connections across requests — eliminates per-request connect overhead.
        # 60 s is safe for most setups; raise to 300 if using pgBouncer.
        'CONN_MAX_AGE': config('CONN_MAX_AGE', default=60, cast=int),
    }
}

# ── Caching ───────────────────────────────────────────────────────────────────
# Uses local in-process memory for development. Swap 'django.core.cache.backends.redis.RedisCache'
# and set CACHE_URL in .env for production.
_CACHE_URL = config('CACHE_URL', default='')
if _CACHE_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': _CACHE_URL,
            'TIMEOUT': 300,
            'OPTIONS': {'MAX_ENTRIES': 5000},
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'TIMEOUT': 300,
            'OPTIONS': {'MAX_ENTRIES': 1000},
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000',
).split(',')
CORS_ALLOW_CREDENTIALS = True
# Allow CORS on API + media paths only; not the entire domain.
CORS_URLS_REGEX = r'^/(api|media)/.*$'

# ── Tutorial file size limits (bytes) ────────────────────────────────────────
TUTORIAL_MAX_SIZE = {
    'image':    10  * 1024 * 1024,   # 10 MB
    'document': 50  * 1024 * 1024,   # 50 MB
    'video':    500 * 1024 * 1024,   # 500 MB
    'other':    50  * 1024 * 1024,   # 50 MB
}
TUTORIAL_MAX_SIZE_LABEL = {
    'image':    '10 MB',
    'document': '50 MB',
    'video':    '500 MB',
    'other':    '50 MB',
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
    # Rate-limit auth endpoints: 5 attempts/min per IP for anon, 1000/day for authenticated.
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': config('THROTTLE_ANON', default='20/min'),
        'user': config('THROTTLE_USER', default='1000/day'),
        'auth': config('THROTTLE_AUTH', default='5/min'),
    },
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
}

# GPS attendance range in meters
ATTENDANCE_ALLOWED_RADIUS_METERS = 300

# Web Push (VAPID) — run: python manage.py generate_vapid_keys
VAPID_PUBLIC_KEY  = config('VAPID_PUBLIC_KEY',  default='')
VAPID_PRIVATE_KEY = config('VAPID_PRIVATE_KEY', default='')
VAPID_EMAIL       = config('VAPID_EMAIL',        default='admin@i5nexus.com')

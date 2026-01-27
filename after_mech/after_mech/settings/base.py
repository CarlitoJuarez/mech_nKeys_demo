from pathlib import Path
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parent.parent.parent

load_dotenv(BASE_DIR / ".env")



MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'myapp/static',  # local dev static folder
]


SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
DEBUG = False
ALLOWED_HOSTS = []

INSTALLED_APPS = [
    'channels',
    'axes',


    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # for anti CORS [ CROSS ORIGIN RESOURCE SHARING ] blocking image inside the app
    'corsheaders',
    'rest_framework',

    'myapp',
]

MIDDLEWARE = [
        'corsheaders.middleware.CorsMiddleware',
        'django.middleware.security.SecurityMiddleware',
        'django.contrib.sessions.middleware.SessionMiddleware',

        "axes.middleware.AxesMiddleware",

        'django.middleware.common.CommonMiddleware',
        'django.middleware.csrf.CsrfViewMiddleware',
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'django.contrib.messages.middleware.MessageMiddleware',
        'django.middleware.clickjacking.XFrameOptionsMiddleware',

        'whitenoise.middleware.WhiteNoiseMiddleware',
]

ROOT_URLCONF = "after_mech.urls"

TEMPLATES = [
        {
                "BACKEND": "django.template.backends.django.DjangoTemplates",
                "DIRS": [],
                "APP_DIRS": True,
                "OPTIONS": {
                        "context_processors": [
                                "django.template.context_processors.debug",
                                "django.template.context_processors.request",
                                "django.contrib.auth.context_processors.auth",
                                "django.contrib.messages.context_processors.messages",
                            ],
                    },
            },
]

WSGI_APPLICATION = "after_mech.wsgi.application"
ASGI_APPLICATION = "after_mech.asgi.application"

DATABASES = {}


REDIS_URL = os.getenv("REDIS_URL", "").strip()

if REDIS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [REDIS_URL]},
        }
    }
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": os.getenv("REDIS_URL", "redis://127.0.0.1:6379/1"),
            "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        }
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': "channels_redis.core.RedisChannelLayer",
            'CONFIG': {"hosts": [("127.0.0.1", 6379)]},
            }
        }
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache"
        }
    }


CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "contact@example.com")

MAX_REQUEST_BODY_BYTES = 100 * 1024 * 1024  # 100 MB

SAFESEARCH_BLOCK = {"adult_min": 4, "racy_min": 4, "violence_min": 5}

VISION_MODERATION_ENABLED = os.getenv("VISION_MODERATION_ENABLED", False)
VISION_MODERATION_STRICT = True
VISION_CREDENTIALS_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")


OPENAI_MODERATION_ENABLED = os.getenv("OPENAI_MODERATION_ENABLED", False)
OPENAI_MODERATION_STRICT = True
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")



# -------------------------------------------------------------------
# Auth / i18n
# -------------------------------------------------------------------

from datetime import timedelta

# LOGIN RATELIMITING & BRUTE FORCE PROTECTION
AXES_FAILURE_LIMIT = 10
AXES_COOLOFF_TIME = timedelta(minutes=10)
AXES_LOCKOUT_PARAMETERS = [["username", "ip_address"]]

AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "django.contrib.auth.backends.ModelBackend",
    "myapp.auth_backends.EmailBackend",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True



# FOR ALLOWING module requests ONLY DEV !!!
CORS_ALLOW_ALL_ORIGINS = False

# Default primary key field type
# https://docs.djangoproject.com/en/4.2/ref/settings/#default-auto-field
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "ERROR",
    },
}



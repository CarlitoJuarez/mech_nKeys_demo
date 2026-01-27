from .base import *

DEBUG = False

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "").split(",")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}

CORS_ALLOW_ALL_ORIGINS = False

# MODERATION CONFIG
VISION_MODERATION_ENABLED = False
OPENAI_MODERATION_ENABLED = True

# EMAIL BACKEND:
EMAIL_BACKEND = "anymail.backends.postmark.EmailBackend"
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "")
SERVER_EMAIL = DEFAULT_FROM_EMAIL
ANYMAIL = {
    "POSTMARK_SERVER_TOKEN": os.environ["POSTMARK_SERVER_TOKEN"],
}


INSTALLED_APPS += ["anymail"]


CSRF_TRUSTED_ORIGINS = [
        "https://mechnkeys.com",
        "https://www.mechnkeys.com",
]

CSRF_FAILURE_VIEW = 'myapp.views.csrf_failure'


SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

RATELIMIT_IP_META_KEY = "HTTP_X_FORWARDED_FOR"

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_REFERRER_POLICY = 'same-origin'
USE_X_FORWARDED_HOST = False

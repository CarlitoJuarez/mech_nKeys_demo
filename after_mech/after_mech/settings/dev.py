from .base import *

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}


# MODERATION CONFIG
VISION_MODERATION_ENABLED = False
OPENAI_MODERATION_ENABLED = False


# EMAIL BACKEND:
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = "no-reply@example.com"
EMAIL_TIMEOUT = 10

SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False

RATELIMIT_IP_META_KEY = "REMOTE_ADDR"


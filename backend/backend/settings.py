"""
Django settings for the Sewing Shop Management System.

The relational database is Supabase Postgres - all credentials are loaded
from environment variables (see backend/.env.example).
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env(key: str, default: str | None = None) -> str:
    value = os.getenv(key, default)
    if value is None:
        raise RuntimeError(f"Missing environment variable: {key}")
    return value


def env_bool(key: str, default: bool = False) -> bool:
    raw = os.getenv(key)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_list(key: str, default: str = "") -> list[str]:
    raw = os.getenv(key, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-insecure-secret-change-me")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "*")


# ---------------------------------------------------------------------------
# Applications
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    # Django Unfold MUST come before django.contrib.admin
    "unfold",
    "unfold.contrib.filters",
    "unfold.contrib.forms",

    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "django_filters",
    "corsheaders",

    "api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"

# ---------------------------------------------------------------------------
# Database - Supabase Postgres
#
# You can configure the connection in two ways - whichever you prefer:
#
#   (1) Paste the full URI from Supabase ->
#       Project Settings -> Database -> Connection string -> URI
#       into a single DATABASE_URL env var, e.g.
#       postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
#
#   (2) Or set the individual SUPABASE_DB_* variables.
#
# IMPORTANT: the Supabase *API keys* (anon / service_role) are NOT database
# credentials - they authenticate against Supabase's HTTP layer (PostgREST,
# Auth, Storage, Realtime). Django connects with the native Postgres protocol
# via psycopg, so it needs the database password shown in "Connection info".
# ---------------------------------------------------------------------------
def _database_from_url(url: str) -> dict:
    from urllib.parse import unquote, urlparse

    parsed = urlparse(url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise RuntimeError(
            "DATABASE_URL must start with postgres:// or postgresql://"
        )
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": (parsed.path or "/postgres").lstrip("/") or "postgres",
        "USER": unquote(parsed.username or "postgres"),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname or "localhost",
        "PORT": str(parsed.port or 5432),
        "OPTIONS": {"sslmode": "require"},
        "CONN_MAX_AGE": 60,
    }


_database_url = os.getenv("DATABASE_URL", "").strip()
if _database_url:
    DATABASES = {"default": _database_from_url(_database_url)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("SUPABASE_DB_NAME", "postgres"),
            "USER": os.getenv("SUPABASE_DB_USER", "postgres"),
            "PASSWORD": os.getenv("SUPABASE_DB_PASSWORD", ""),
            "HOST": os.getenv("SUPABASE_DB_HOST", "localhost"),
            "PORT": os.getenv("SUPABASE_DB_PORT", "5432"),
            "OPTIONS": {"sslmode": "require"},
            "CONN_MAX_AGE": 60,
        }
    }

# Supabase Supavisor pooler (and most external Postgres poolers) does not
# support server-side cursors. Disable them so Django doesn't fail when the
# DATABASE_URL points at a pooled connection (5432 session pooler or 6543
# transaction pooler).
if "pooler.supabase.com" in DATABASES["default"]["HOST"]:
    DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True

# Tables for Django's built-in apps (auth, sessions, admin) are still managed
# by Django migrations. The sewing-shop tables are managed by the SQL files
# in /supabase (managed=False on the api models).
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Auth, i18n, static
# ---------------------------------------------------------------------------
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

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# ---------------------------------------------------------------------------
# REST framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.BasicAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
}

# ---------------------------------------------------------------------------
# CORS - so the Expo app can call the API
# ---------------------------------------------------------------------------
CORS_ALLOW_ALL_ORIGINS = DEBUG  # dev only
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:19006,http://localhost:8081",
)

# ---------------------------------------------------------------------------
# Django Unfold
# ---------------------------------------------------------------------------
UNFOLD = {
    "SITE_TITLE": "Sewing Shop",
    "SITE_HEADER": "Sewing Shop Management",
    "SITE_SUBHEADER": "Production & order tracking",
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": False,
    "COLORS": {
        "primary": {
            "50":  "253 244 255",
            "100": "250 232 255",
            "200": "245 208 254",
            "300": "240 171 252",
            "400": "232 121 249",
            "500": "217 70 239",
            "600": "192 38 211",
            "700": "162 28 175",
            "800": "134 25 143",
            "900": "112 26 117",
        },
    },
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": False,
        "navigation": [
            {
                "title": "Sewing shop",
                "items": [
                    {"title": "Dashboard",  "icon": "dashboard",          "link": "/admin/"},
                    {"title": "Customers",  "icon": "person",             "link": "/admin/api/customer/"},
                    {"title": "Orders",     "icon": "shopping_bag",       "link": "/admin/api/order/"},
                    {"title": "Tickets",    "icon": "receipt_long",       "link": "/admin/api/ticket/"},
                    {"title": "Employees",  "icon": "engineering",        "link": "/admin/api/employee/"},
                    {"title": "Materials",  "icon": "inventory_2",        "link": "/admin/api/material/"},
                    {"title": "Deliveries", "icon": "local_shipping",     "link": "/admin/api/delivery/"},
                ],
            },
        ],
    },
}

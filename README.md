# Sewing Shop Management System

Demo full-stack app for managing a sewing shop — customers, orders, production tickets, and deliveries. Built with **Django (REST API + admin)**, **Supabase (Postgres)**, and a **React Native (Expo) mobile app**.

---

## What's inside

```
sewing_project/
├── supabase/   # Schema and seed SQL
├── backend/    # Django REST API + admin panel
└── mobile/     # React Native app (Expo Go)
```

---

## Project quick overview (how it works)

- **Database**: Supabase hosts the Postgres database. This repo includes SQL files to create the schema and optional demo data.
- **Backend**: Django exposes REST endpoints used by the mobile app and also provides an admin panel for managing data.
- **Mobile**: Expo app that talks to the Django API over your local network (during development).

Core workflow:
- **Customer & order**: Create a customer, then create an order (garments, measurements, due date).
- **Production tickets**: Each garment becomes a ticket that moves through stages (e.g. cutting → sewing → finishing → delivered). Stage changes are logged.
- **Delivery**: Mark the order as completed/delivered to close it out.

---

## Important note (demo limitations)

This project is intended as a **demo / prototype**. If you want to use it “always-on” in a real environment, you’ll need additional work for:
- **Authentication & authorization** (roles, permissions, secure admin access)
- **Production hosting** (backend deployment, domain, HTTPS, secrets management)
- **Mobile distribution** (proper builds via EAS/App Store/Play Store, not just Expo Go)
- **Operational hardening** (logging/monitoring, backups, migrations strategy, RLS policies as needed)

---

## Prerequisites

- **Supabase account** (free tier is fine to start)
- **Python** (for Django) and **Node.js** (for Expo)
- **Expo Go** app installed on your phone (iOS App Store / Google Play)

---

## 1. Database (Supabase setup)

### Create a Supabase project

1. Create an account at [Supabase](https://supabase.com/).
2. Create a **new project**.
3. Once created, open:
   - **Project Settings → Database** (you’ll use the connection details here)
   - **SQL Editor** (you’ll run the schema/seed scripts here)

### Initialize the schema

Run these files in the **SQL Editor**, in order:

1. `supabase/01_schema.sql` — tables, enums, indexes, triggers
2. `supabase/02_seed.sql` — optional demo data

This backend connects directly to the Supabase Postgres database. Django models for these tables are configured with `managed = False`.

---

## 2. Backend (Django API + admin)

### Set up Python environment

From the repo root:

```bash
cd backend
python -m venv .venv
```

Activate the venv:

**Windows (PowerShell):**

```powershell
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks script execution, run this once (then try again):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

**macOS/Linux (bash/zsh):**

```bash
source .venv/bin/activate
```

Then install dependencies and create your env file:

```bash
pip install -r requirements.txt
cp .env.example .env
```

On Windows, if `cp` isn’t available in your shell, use:

```powershell
Copy-Item .env.example .env
```

### Configure environment variables

Open `backend/.env` and fill in your values.

Minimum recommended setup:

```
DJANGO_SECRET_KEY=some-long-random-string
DATABASE_URL=postgresql://postgres:<your-db-password>@db.<your-project-ref>.supabase.co:5432/postgres?sslmode=require
```

Where to find the Supabase values:
- **Project ref / host**: Supabase project settings (Database connection info)
- **Database password**: the password you set when creating the Supabase project (or reset in settings)

If you prefer individual fields instead of `DATABASE_URL`, see `.env.example`.

### Run the backend

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

- Admin panel: `http://localhost:8000/admin/`
- API root: `http://localhost:8000/api/`
- Dashboard JSON: `http://localhost:8000/api/dashboard/`

---

## 3. Mobile app (Expo + Expo Go)

### Install Expo Go (on your phone)

- **iOS**: install “Expo Go” from the App Store
- **Android**: install “Expo Go” from Google Play

### Install mobile dependencies

```bash
cd mobile
npm install
```

### Point the app at your backend

Edit `mobile/app.json` and set `expo.extra.apiUrl` to your Django server address.

Important:
- If you’re using **a real phone**, you must use your computer’s **LAN IP** (your phone can’t reach `localhost`).
- Ensure your phone and computer are on the **same Wi‑Fi/network**.

```json
"extra": {
  "apiUrl": "http://192.168.1.10:8000/api"
}
```

### Start the app

```bash
npx expo start
```

Then:
- **iOS**: scan the QR code with the Camera app
- **Android**: scan the QR code from inside Expo Go

---

## Running everything (end-to-end)

1. **Supabase**: create project → run `supabase/01_schema.sql` (and optionally `02_seed.sql`)
2. **Backend**: start Django at `http://<your-computer-ip>:8000/`
3. **Mobile**: set `expo.extra.apiUrl` to `http://<your-computer-ip>:8000/api` → `npx expo start` → open in Expo Go

---

## Supabase access tips

- **SQL Editor**: where you run the schema + seed SQL
- **Table editor**: quick way to inspect data while testing
- **Database settings**: where you find host/project ref and reset your database password

This repo does not require you to set up Supabase Auth to run the demo.

---

## 4. API endpoints (high level)

| Method | URL | What it does |
|--------|-----|--------------|
| GET | `/api/dashboard/` | KPIs for the mobile home screen |
| CRUD | `/api/customers/` | Manage customers |
| GET | `/api/customers/<id>/orders/` | Order history for a customer |
| CRUD | `/api/orders/` | Manage orders |
| POST | `/api/orders/<id>/mark_in_production/` | Start production |
| POST | `/api/orders/<id>/mark_completed/` | Complete an order |
| POST | `/api/orders/<id>/deliver/` | Mark as delivered |
| CRUD | `/api/tickets/` | Work tickets |
| POST | `/api/tickets/<id>/advance_stage/` | Move to next stage |
| POST | `/api/tickets/<id>/set_stage/` | Jump to a specific stage |
| CRUD | `/api/employees/`, `/api/materials/` | Staff and materials catalog |
| GET | `/api/status-history/` | Audit log per ticket |

---

## 5. Common bugs & how to fix them

- **`SSL required` error**: Ensure your DB connection enforces SSL (for example `?sslmode=require` in `DATABASE_URL`, or `OPTIONS["sslmode"] = "require"` in Django settings) and re-check your Supabase DB password.

- **`relation "order" does not exist`**: Run `supabase/01_schema.sql` in the Supabase SQL Editor (schema wasn’t created yet).

- **`Network request failed` in Expo Go**: Don’t use `localhost` in `apiUrl` when testing on a phone. Use your computer’s LAN IP and make sure phone + computer are on the same network.

- **Admin panel looks unstyled**: Ensure `unfold` is listed **before** `django.contrib.admin` in `INSTALLED_APPS`.

- **`type "order_status" does not exist`**: The schema script didn’t finish cleanly. Re-run `supabase/01_schema.sql` (and verify it completes without errors).

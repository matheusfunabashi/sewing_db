# Sewing Shop Management System

A full-stack app for managing a sewing shop — customers, orders, production tickets, and deliveries. Built with Django, Supabase (Postgres), and React Native (Expo Go).

---

## What's inside

```
sewing_project/
├── supabase/   # Schema and seed SQL
├── backend/    # Django REST API + admin panel
└── mobile/     # React Native app (Expo Go)
```

---

## 1. Database (Supabase)

You'll need your Supabase project's database credentials from:
**Project Settings → Database → Connection string**

Then run these two files in the **SQL Editor**, in order:

1. `supabase/01_schema.sql` — tables, enums, indexes, triggers
2. `supabase/02_seed.sql` — optional demo data

Django won't touch these tables — they're all set to `managed = False`.

---

## 2. Backend (Django)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Open `.env` and fill in your database connection. The easiest way is a single URI:

```
DJANGO_SECRET_KEY=some-long-random-string
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```

Or use individual fields if you prefer — see `.env.example` for the full list.

Then:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

- Admin panel: `http://localhost:8000/admin/`
- API root: `http://localhost:8000/api/`
- Dashboard JSON: `http://localhost:8000/api/dashboard/`

---

## 3. Mobile app (Expo Go)

```bash
cd mobile
npm install
```

Edit `mobile/app.json` and set `expo.extra.apiUrl` to your Django server's address. If you're on a real device, use your computer's LAN IP — your phone can't reach `localhost`.

```json
"extra": {
  "apiUrl": "http://192.168.1.10:8000/api"
}
```

Then start Expo:

```bash
npx expo start
```

Scan the QR code with your phone — Camera app on iOS, Expo Go app on Android.

---

## 4. How the workflows work

**Customer & order** — Add a customer, then create an order with garments, measurements, and a due date.

**Production tickets** — Open an order and generate tickets (one per garment). From there you can advance each ticket through the production stages: `order_received → design_confirmed → cutting → sewing → finishing → quality_check → ready_for_delivery → delivered`. Every stage change is logged automatically via a Postgres trigger.

**Delivery** — Once production is done, mark the order completed and then delivered. This records the delivery date and closes the order.

Everything above can also be done from the Django admin at `/admin/`.

---

## 5. API endpoints

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

## 6. Common issues

**`SSL required` error** — Check that `OPTIONS["sslmode"] = "require"` is in `settings.py` and that your password is correct.

**`relation "order" does not exist`** — You haven't run `01_schema.sql` yet.

**`Network request failed` in Expo Go** — Your phone can't reach your computer via `localhost`. Use the LAN IP shown when you run `npx expo start`.

**Admin panel looks unstyled** — Make sure `unfold` appears before `django.contrib.admin` in `INSTALLED_APPS`.

**`type "order_status" does not exist`** — The schema SQL didn't finish. Re-run `01_schema.sql` from scratch.

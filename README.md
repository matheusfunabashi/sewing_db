# Sewing Shop Management System

End-to-end management system for a sewing shop, satisfying every requirement of the
*Database Project Instructions - Sewing* assignment:

- **Relational database**: Supabase Postgres (a managed PostgreSQL).
- **Backend**: Django + Django REST Framework + **Django Unfold** admin.
- **Mobile app**: React Native (Expo) - runs in **Expo Go**.
- Workflows for customer registration, order creation, ticket production tracking,
  and delivery / completion.

```
sewing_project/
├── supabase/        # SQL to create the schema and demo data
├── backend/         # Django REST API + Django Unfold admin (connects to Supabase)
└── mobile/          # React Native (Expo Go) mobile app
```

---

## 1. Set up Supabase (database)

You said the Supabase project is already created. We only need to (a) get the
credentials and (b) run two SQL files.

### 1.1 Get your credentials

In the Supabase dashboard, open your project and go to:

```
Project Settings -> Database -> Connection info / Connection string
```

You will need:

| Field      | Where to find it (Supabase)                                           |
|------------|-----------------------------------------------------------------------|
| Host       | `db.<project-ref>.supabase.co`                                        |
| Port       | `5432` (direct) or `6543` (transaction pooler)                        |
| Database   | `postgres`                                                            |
| User       | `postgres`                                                            |
| Password   | the database password you set when creating the project               |

### 1.2 Run the SQL files

Open **SQL Editor -> New query** in the Supabase dashboard and run, in order:

1. [`supabase/01_schema.sql`](supabase/01_schema.sql) - creates all tables,
   enums, indexes, triggers and a reporting view.
2. [`supabase/02_seed.sql`](supabase/02_seed.sql) - *optional* demo data
   (4 customers, 3 employees, 3 orders, tickets, etc.).

That's it. Django will **not** try to recreate these tables - all sewing-shop
models use `managed = False`.

---

## 2. Run the Django backend

### 2.1 Install dependencies

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2.2 Configure credentials

Copy the example env file:

```bash
cp .env.example .env
```

> **Don't use the Supabase API keys** (`anon` / `service_role`) here — those
> are JWTs for Supabase's HTTP layer (PostgREST / Auth / Storage). Django
> connects to Postgres directly with `psycopg`, so it needs the database
> password from **Project Settings → Database → Connection string**.

You have two options:

**Option A — paste the connection URI (easiest)**

From Supabase: **Project Settings → Database → Connection string → "URI"** tab.
Copy that line into `DATABASE_URL`:

```env
DJANGO_SECRET_KEY=any-long-random-string
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```

**Option B — individual fields**

```env
DJANGO_SECRET_KEY=any-long-random-string
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=<your-supabase-password>
SUPABASE_DB_HOST=db.<your-project-ref>.supabase.co
SUPABASE_DB_PORT=5432
```

If both are set, `DATABASE_URL` wins.

### 2.3 Run Django migrations (only for built-in apps)

The sewing tables are managed by the SQL in `/supabase`. Django still needs to
create its own internal tables (`auth_user`, `django_session`, `django_admin_log`,
etc.) inside the same Supabase database:

```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

You should now have:

- `http://localhost:8000/admin/`  -> Django Unfold admin (sewing shop management).
- `http://localhost:8000/api/`    -> REST API browsable root.
- `http://localhost:8000/api/dashboard/` -> dashboard JSON used by the mobile app.

---

## 3. Run the mobile app (Expo Go)

### 3.1 Install dependencies

```bash
cd mobile
npm install
```

### 3.2 Configure the API URL

Edit `mobile/app.json` and set `expo.extra.apiUrl` to the URL of your **running
Django server, reachable from your phone**.

When using Expo Go on a real device, your phone cannot reach your computer's
`localhost`. Use your computer's LAN address. After you start `expo start` it
prints something like `Metro waiting on exp://192.168.1.10:8081` - that IP is
the one to use:

```json
"extra": {
  "apiUrl": "http://192.168.1.10:8000/api"
}
```

(For Android emulator only, you can use `http://10.0.2.2:8000/api`. For the iOS
simulator, `http://localhost:8000/api` works.)

### 3.3 Start Expo

```bash
npx expo start
```

A QR code will appear in the terminal:

- **iOS**: open the **Camera** app, point it at the QR, tap "Open in Expo Go".
- **Android**: open the **Expo Go** app and scan the QR.

The app supports the three required workflows out of the box.

---

## 4. Workflows (mapped to the assignment)

### Workflow 1 - Customer registration & order creation
1. Customers tab -> **+ New** -> save customer.
2. Orders tab -> **+ New order** -> pick customer, add garments, measurements,
   priority and due date -> **Create order**.

### Workflow 2 - Ticket creation & production follow-up
1. Open the order from Orders.
2. Tap **Workflow 2 - Generate tickets & start production**. The mobile app
   creates a ticket per garment via `POST /api/tickets/` and calls the order
   action `mark_in_production`.
3. Open a ticket. You can:
   - tap any production stage to set it directly (`set_stage` action),
   - tap **Advance to next stage** to walk it through `order_received → design_confirmed → cutting → sewing → finishing → quality_check → ready_for_delivery → delivered`,
   - assign or reassign a worker.
4. Every stage change is automatically appended to `status_history` by a
   Postgres trigger and is shown on the **History** card of the ticket.

### Workflow 3 - Order completion & delivery
1. From the order detail, tap **Mark order completed** once production is done.
2. Tap **Workflow 3 - Mark delivered**. The app calls `POST /api/orders/<id>/deliver/`,
   which (a) updates `order.status = delivered` and (b) creates/updates the
   `delivery` row with the delivery date.

You can also drive every workflow from the Django Unfold admin at
`/admin/`.

---

## 5. Database design

### Entities

| Table             | Purpose                                                            |
|-------------------|--------------------------------------------------------------------|
| `customer`        | People who place orders                                            |
| `employee`        | Tailors / workers that can be assigned to tickets                  |
| `order`           | Order header, linked to one customer                               |
| `order_item`      | A garment within an order (with quantity & unit price)             |
| `measurement`     | Measurements per `order_item` (chest, waist, ...)                  |
| `ticket`          | Work order for an `order_item`, with current production stage      |
| `material`        | Catalog of fabrics / threads / buttons                             |
| `ticket_material` | Materials consumed by a ticket (n-to-n join)                       |
| `status_history`  | Immutable audit log of stage changes per ticket (filled by trigger)|
| `delivery`        | One row per order, records delivery date and observations          |

### ERD (text form)

```
customer (1) ───< (n) order (1) ───< (n) order_item (1) ───< (n) measurement
                                              │
                                              └──< (n) ticket (n) >── ticket_material >── (n) material
                                                            │
                                                            └──< (n) status_history
employee (1) ───< (n) ticket
order   (1) ───── (1) delivery
```

All keys, foreign keys, indexes and ENUM types are visible in
[`supabase/01_schema.sql`](supabase/01_schema.sql).

### Normalisation notes

- Customer-to-order is 1-N; the order does not duplicate the customer fields,
  it only stores `customer_id`.
- Items inside an order are split into their own table (`order_item`) so an
  order can contain multiple garments without repeating columns.
- Measurements depend on the garment, not the order, so they hang off
  `order_item`.
- `material` is a reusable catalog and `ticket_material` is the n-to-n join with
  its own quantity column - this avoids repeating material info per ticket.
- `status_history` keeps an audit trail without polluting `ticket`. It is
  written automatically by the `trg_ticket_stage_history` Postgres trigger.

---

## 6. Architecture

```
       Mobile (React Native / Expo Go)
                     │
            HTTP (REST + JSON)
                     ▼
   Django REST Framework  ← Django Unfold admin
                     │
              psycopg / TLS
                     ▼
            Supabase Postgres
```

- The mobile app **never talks to Supabase directly** - it calls the Django API
  exclusively, so the Django ORM remains the single point of truth and
  centralises the business rules (workflow actions, validations, etc.), as
  required by the assignment.
- Django connects to Supabase Postgres via the standard `psycopg` driver with
  `sslmode=require`. There is no Supabase-specific SDK on the backend - this
  keeps the project portable to any other PostgreSQL instance.

---

## 7. Troubleshooting

| Problem | Fix |
|--|--|
| `connection to server at "db.xxx.supabase.co" ... SSL required` | Make sure `OPTIONS["sslmode"] = "require"` is in `settings.py` (it already is) and that the password is correct. |
| `relation "order" does not exist` | You forgot to run `supabase/01_schema.sql` in the Supabase SQL editor. |
| Expo Go shows "Network request failed" | Your phone cannot reach `localhost`. Set `expo.extra.apiUrl` in `mobile/app.json` to your computer's LAN IP, not `localhost`. |
| Django admin styling looks plain | You forgot `unfold` (and the `unfold.contrib.*` apps) before `django.contrib.admin` in `INSTALLED_APPS`. |
| `psycopg.errors.UndefinedObject: type "order_status" does not exist` | The schema script aborted halfway. Re-run `supabase/01_schema.sql` from the top. |

---

## 8. Endpoints quick reference

| Method | URL                                          | Purpose                                |
|--------|----------------------------------------------|----------------------------------------|
| GET    | `/api/dashboard/`                            | KPIs for the mobile dashboard          |
| CRUD   | `/api/customers/`                            | Customers                              |
| GET    | `/api/customers/<id>/orders/`                | Order history per customer             |
| CRUD   | `/api/orders/`                               | Orders                                 |
| POST   | `/api/orders/<id>/mark_in_production/`       | Workflow 2 - start production          |
| POST   | `/api/orders/<id>/mark_completed/`           | Mark order completed                   |
| POST   | `/api/orders/<id>/deliver/`                  | Workflow 3 - deliver order             |
| CRUD   | `/api/order-items/`                          | Garments inside orders                 |
| CRUD   | `/api/measurements/`                         | Measurements per garment               |
| CRUD   | `/api/tickets/`                              | Work tickets                           |
| POST   | `/api/tickets/<id>/advance_stage/`           | Move ticket to next production stage   |
| POST   | `/api/tickets/<id>/set_stage/`               | Set ticket stage explicitly            |
| CRUD   | `/api/employees/`, `/api/materials/`         | Catalog                                |
| GET    | `/api/status-history/`                       | Audit trail per ticket                 |

---

## 9. License / academic use

Internal coursework project - no warranty. Adapt freely for the assignment.

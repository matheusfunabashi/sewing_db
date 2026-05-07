
create type public.order_status as enum (
    'pending',
    'in_production',
    'completed',
    'delivered',
    'cancelled'
);

create type public.ticket_status as enum (
    'open',
    'in_progress',
    'on_hold',
    'completed',
    'cancelled'
);

create type public.priority_level as enum (
    'low',
    'normal',
    'high',
    'urgent'
);

create type public.production_stage as enum (
    'order_received',
    'design_confirmed',
    'cutting',
    'sewing',
    'finishing',
    'quality_check',
    'ready_for_delivery',
    'delivered'
);


create table public.customer (
    id            bigserial primary key,
    full_name     varchar(150) not null,
    phone         varchar(40),
    email         varchar(150),
    address       varchar(255),
    notes         text,
    preferences   text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index idx_customer_full_name on public.customer (full_name);
create index idx_customer_email     on public.customer (email);


create table public.employee (
    id            bigserial primary key,
    full_name     varchar(150) not null,
    role          varchar(80),
    phone         varchar(40),
    email         varchar(150),
    is_active     boolean not null default true,
    created_at    timestamptz not null default now()
);


create table public."order" (
    id            bigserial primary key,
    customer_id   bigint not null references public.customer(id) on delete restrict,
    order_date    date not null default current_date,
    due_date      date,
    status        public.order_status not null default 'pending',
    priority      public.priority_level not null default 'normal',
    total_amount  numeric(12, 2) not null default 0,
    notes         text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index idx_order_customer  on public."order" (customer_id);
create index idx_order_status    on public."order" (status);
create index idx_order_due_date  on public."order" (due_date);

-- ---------------------------------------------------------------------
-- OrderItem / Garment (lines of an order)
-- ---------------------------------------------------------------------
create table public.order_item (
    id            bigserial primary key,
    order_id      bigint not null references public."order"(id) on delete cascade,
    garment_type  varchar(100) not null,
    description   text,
    quantity      integer not null default 1 check (quantity > 0),
    unit_price    numeric(12, 2) not null default 0,
    created_at    timestamptz not null default now()
);

create index idx_order_item_order on public.order_item (order_id);

-- ---------------------------------------------------------------------
-- Measurement (per order item)
-- ---------------------------------------------------------------------
create table public.measurement (
    id              bigserial primary key,
    order_item_id   bigint not null references public.order_item(id) on delete cascade,
    label           varchar(80) not null,           -- e.g. chest, waist, sleeve
    value_cm        numeric(7, 2) not null,
    notes           varchar(255)
);

create index idx_measurement_item on public.measurement (order_item_id);

-- ---------------------------------------------------------------------
-- Ticket / Work Order (one or more per order item)
-- ---------------------------------------------------------------------
create table public.ticket (
    id                 bigserial primary key,
    order_item_id      bigint not null references public.order_item(id) on delete cascade,
    assigned_employee  bigint references public.employee(id) on delete set null,
    code               varchar(40) not null unique,
    fabric             varchar(100),
    color              varchar(60),
    design_notes       text,
    status             public.ticket_status not null default 'open',
    stage              public.production_stage not null default 'order_received',
    priority           public.priority_level not null default 'normal',
    deadline           date,
    started_at         timestamptz,
    completed_at       timestamptz,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

create index idx_ticket_item     on public.ticket (order_item_id);
create index idx_ticket_employee on public.ticket (assigned_employee);
create index idx_ticket_status   on public.ticket (status);
create index idx_ticket_stage    on public.ticket (stage);

-- ---------------------------------------------------------------------
-- Material (catalog of fabrics, threads, buttons, etc.)
-- ---------------------------------------------------------------------
create table public.material (
    id            bigserial primary key,
    name          varchar(120) not null,
    unit          varchar(20) not null default 'unit',
    stock_qty     numeric(12, 2) not null default 0,
    unit_cost     numeric(12, 2) not null default 0
);

-- ---------------------------------------------------------------------
-- Ticket-Material join (materials used by a ticket)
-- ---------------------------------------------------------------------
create table public.ticket_material (
    id            bigserial primary key,
    ticket_id     bigint not null references public.ticket(id) on delete cascade,
    material_id   bigint not null references public.material(id) on delete restrict,
    quantity      numeric(12, 2) not null default 1,
    unique (ticket_id, material_id)
);

-- ---------------------------------------------------------------------
-- Status History (immutable trail of stage changes per ticket)
-- ---------------------------------------------------------------------
create table public.status_history (
    id            bigserial primary key,
    ticket_id     bigint not null references public.ticket(id) on delete cascade,
    from_stage    public.production_stage,
    to_stage      public.production_stage not null,
    changed_at    timestamptz not null default now(),
    changed_by    varchar(150),
    note          text
);

create index idx_history_ticket on public.status_history (ticket_id);

-- ---------------------------------------------------------------------
-- Delivery (one per order)
-- ---------------------------------------------------------------------
create table public.delivery (
    id              bigserial primary key,
    order_id        bigint not null unique references public."order"(id) on delete cascade,
    delivered       boolean not null default false,
    delivery_date   date,
    address         varchar(255),
    observations    text,
    created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_customer_updated on public.customer;
create trigger trg_customer_updated before update on public.customer
    for each row execute function public.set_updated_at();

drop trigger if exists trg_order_updated on public."order";
create trigger trg_order_updated before update on public."order"
    for each row execute function public.set_updated_at();

drop trigger if exists trg_ticket_updated on public.ticket;
create trigger trg_ticket_updated before update on public.ticket
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Trigger: keep status_history when ticket.stage changes
-- ---------------------------------------------------------------------
create or replace function public.log_ticket_stage_change() returns trigger as $$
begin
    if (tg_op = 'INSERT') then
        insert into public.status_history(ticket_id, from_stage, to_stage, note)
        values (new.id, null, new.stage, 'ticket created');
        return new;
    elsif (tg_op = 'UPDATE' and new.stage is distinct from old.stage) then
        insert into public.status_history(ticket_id, from_stage, to_stage, note)
        values (new.id, old.stage, new.stage, 'stage updated');
        return new;
    end if;
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ticket_stage_history on public.ticket;
create trigger trg_ticket_stage_history
    after insert or update of stage on public.ticket
    for each row execute function public.log_ticket_stage_change();

-- ---------------------------------------------------------------------
-- View: order summary (handy for the mobile dashboard / Django reports)
-- ---------------------------------------------------------------------
create or replace view public.v_order_summary as
select
    o.id                                     as order_id,
    o.status,
    o.priority,
    o.order_date,
    o.due_date,
    c.id                                     as customer_id,
    c.full_name                              as customer_name,
    coalesce(sum(oi.quantity * oi.unit_price), 0) as total_amount,
    count(distinct oi.id)                    as item_count,
    count(distinct t.id)                     as ticket_count,
    count(distinct t.id) filter (where t.status = 'completed') as completed_tickets,
    (o.due_date is not null and o.due_date < current_date
        and o.status not in ('completed', 'delivered', 'cancelled')) as is_overdue
from public."order" o
join public.customer c        on c.id = o.customer_id
left join public.order_item oi on oi.order_id = o.id
left join public.ticket t      on t.order_item_id = oi.id
group by o.id, c.id;

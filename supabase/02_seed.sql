-- =====================================================================
-- Optional demo data so the system can be tested immediately.
-- Run AFTER 01_schema.sql in the Supabase SQL Editor.
-- =====================================================================

insert into public.customer (full_name, phone, email, address, notes, preferences) values
    ('Maria Silva',    '+351 912 000 001', 'maria@example.com',  'Rua das Flores 12, Lisboa',   'Returning customer',     'Prefers cotton fabrics'),
    ('John Carter',    '+351 912 000 002', 'john@example.com',   'Av. Liberdade 50, Lisboa',    'Allergic to wool',       'Slim fit, dark colors'),
    ('Ana Pereira',    '+351 912 000 003', 'ana@example.com',    'Rua da Prata 7, Porto',       'VIP - urgent orders',    'Bridal & formal wear'),
    ('Carlos Mendes',  '+351 912 000 004', 'carlos@example.com', 'Rua de Cedofeita 90, Porto',  null,                     null);

insert into public.employee (full_name, role, phone, email) values
    ('Sofia Tailor',   'Senior tailor',  '+351 933 100 100', 'sofia@sewingshop.com'),
    ('Pedro Costa',    'Cutter',         '+351 933 100 101', 'pedro@sewingshop.com'),
    ('Rita Almeida',   'Quality check',  '+351 933 100 102', 'rita@sewingshop.com');

insert into public.material (name, unit, stock_qty, unit_cost) values
    ('Cotton fabric (white)', 'm',    120, 4.50),
    ('Linen fabric (beige)',  'm',     60, 7.20),
    ('Black thread spool',    'unit',  40, 1.10),
    ('Buttons - wood 15mm',   'unit', 500, 0.20);

-- Order 1 - Maria, two garments, in production
with new_order as (
    insert into public."order" (customer_id, due_date, status, priority, notes)
    values ((select id from public.customer where full_name = 'Maria Silva'),
            current_date + 7, 'in_production', 'normal',
            'Wedding outfit for daughter')
    returning id
), item1 as (
    insert into public.order_item (order_id, garment_type, description, quantity, unit_price)
    values ((select id from new_order), 'Dress', 'Long evening dress, ivory', 1, 220.00)
    returning id
), item2 as (
    insert into public.order_item (order_id, garment_type, description, quantity, unit_price)
    values ((select id from new_order), 'Suit',  'Two-piece, navy blue',     1, 350.00)
    returning id
)
insert into public.measurement (order_item_id, label, value_cm) values
    ((select id from item1), 'chest',     92.0),
    ((select id from item1), 'waist',     74.0),
    ((select id from item1), 'hip',       98.0),
    ((select id from item2), 'chest',    102.0),
    ((select id from item2), 'shoulder',  46.0);

insert into public.ticket (order_item_id, assigned_employee, code, fabric, color, design_notes, status, stage, priority, deadline)
select oi.id,
       (select id from public.employee where full_name = 'Sofia Tailor'),
       'TCK-' || to_char(now(), 'YYYYMMDD') || '-' || oi.id,
       case when oi.garment_type = 'Dress' then 'Silk' else 'Wool' end,
       case when oi.garment_type = 'Dress' then 'Ivory' else 'Navy' end,
       'Use measurements stored on the order item',
       'in_progress', 'sewing', 'high',
       (select due_date from public."order" o where o.id = oi.order_id)
  from public.order_item oi
  join public."order" o on o.id = oi.order_id
  join public.customer c on c.id = o.customer_id
 where c.full_name = 'Maria Silva';

-- Order 2 - John, single shirt, pending
with new_order as (
    insert into public."order" (customer_id, due_date, status, priority, notes)
    values ((select id from public.customer where full_name = 'John Carter'),
            current_date + 14, 'pending', 'normal',
            'Tailored shirt')
    returning id
), it as (
    insert into public.order_item (order_id, garment_type, description, quantity, unit_price)
    values ((select id from new_order), 'Shirt', 'Slim fit, light blue', 2, 60.00)
    returning id
)
insert into public.measurement (order_item_id, label, value_cm) values
    ((select id from it), 'collar',    40.0),
    ((select id from it), 'chest',     98.0),
    ((select id from it), 'sleeve',    63.0);

-- Order 3 - Ana, completed and delivered (for reporting examples)
with new_order as (
    insert into public."order" (customer_id, due_date, status, priority, notes)
    values ((select id from public.customer where full_name = 'Ana Pereira'),
            current_date - 3, 'delivered', 'urgent',
            'Bridal alterations')
    returning id
), it as (
    insert into public.order_item (order_id, garment_type, description, quantity, unit_price)
    values ((select id from new_order), 'Bridal dress', 'Alteration only', 1, 180.00)
    returning id
), tk as (
    insert into public.ticket (order_item_id, code, status, stage, priority, deadline, started_at, completed_at)
    values ((select id from it), 'TCK-DEMO-3', 'completed', 'delivered', 'urgent',
            current_date - 3, now() - interval '5 days', now() - interval '2 days')
    returning id
)
insert into public.delivery (order_id, delivered, delivery_date, address, observations)
select id, true, current_date - 2, 'Rua da Prata 7, Porto', 'Picked up at the shop'
  from public."order"
 where customer_id = (select id from public.customer where full_name = 'Ana Pereira');

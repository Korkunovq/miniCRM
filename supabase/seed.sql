-- Demo data for test submission.
-- Run in Supabase SQL Editor AFTER:
-- 1) Applying migrations from supabase/migrations/
-- 2) Creating Auth users (Authentication → Users → Add user)
-- 3) Replacing UUIDs below with real auth.users.id values

-- Example emails (set passwords in Auth dashboard):
-- assigner@test.local  — постановщик
-- executor1@test.local — исполнитель
-- executor2@test.local — исполнитель

-- insert into public.profiles (id, email, full_name, role) values
--   ('00000000-0000-0000-0000-000000000001', 'assigner@test.local', 'Иван Постановщик', 'assigner'),
--   ('00000000-0000-0000-0000-000000000002', 'executor1@test.local', 'Пётр Исполнитель', 'executor'),
--   ('00000000-0000-0000-0000-000000000003', 'executor2@test.local', 'Сергей Исполнитель', 'executor');

-- with objs as (
--   insert into public.construction_objects (name, address) values
--     ('ЖК «Северный»', 'ул. Строителей, 10'),
--     ('Склад №3', 'пр. Промышленный, 5'),
--     ('Школа на 800 мест', 'ул. Ленина, 22')
--   returning id, name
-- )
-- insert into public.tasks (object_id, title, description, assignee_id, author_id, status)
-- select o.id, t.title, t.description, t.assignee, '00000000-0000-0000-0000-000000000001'::uuid, t.status::public.task_status
-- from objs o
-- join (values
--   ('ЖК «Северный»', 'Согласовать смету', 'Проверить смету по фасаду', '00000000-0000-0000-0000-000000000002', 'new'),
--   ('ЖК «Северный»', 'Заказать бетон', 'М300, 20 м³', '00000000-0000-0000-0000-000000000003', 'in_progress'),
--   ('Склад №3', 'Монтаж ворот', 'Установка откатных ворот', '00000000-0000-0000-0000-000000000002', 'on_review'),
--   ('Школа на 800 мест', 'План электрики', 'Разводка 2 этаж', '00000000-0000-0000-0000-000000000003', 'revision')
-- ) as t(obj_name, title, description, assignee, status) on o.name = t.obj_name;

-- Note: tasks inserted with non-new status need matching history rows if you bypass RPC.
-- Prefer creating tasks as "new" in UI, then transition via app; or use transition_task_status() in SQL.

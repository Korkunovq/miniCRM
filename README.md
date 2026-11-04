# Мини-CRM «Объекты и задачи»

Небольшая CRM для строительной компании: объекты (стройки), задачи с циклом статусов и историей изменений. Роли — **постановщик** (полное управление) и **исполнитель** (только свои задачи). Стек: React, TypeScript, Supabase (RLS и смена статусов на стороне БД).

## Запуск

```bash
npm install
cp .env.example .env
npm run dev
```

В `.env` укажите из Supabase (**Project Settings → API**): `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` (только anon, не `service_role`).

## Supabase

1. Создайте проект на [supabase.com](https://supabase.com).
2. В **SQL Editor** выполните файл `supabase/migrations/20251104120000_initial_schema.sql`.
3. **Authentication → Users** — создайте пользователей с паролями.
4. В **SQL Editor** добавьте профили — `id` = **User UID** из Auth:

```sql
insert into public.profiles (id, email, full_name, role) values
  ('UUID_1', 'assigner@test.local', 'Постановщик', 'assigner'),
  ('UUID_2', 'executor1@test.local', 'Исполнитель 1', 'executor'),
  ('UUID_3', 'executor2@test.local', 'Исполнитель 2', 'executor');
```

Объекты и задачи для демо создайте в приложении под постановщиком.

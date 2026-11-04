-- Mini-CRM: objects, tasks, status history, RLS, transition RPC

create extension if not exists "pgcrypto";

create type public.user_role as enum ('assigner', 'executor');
create type public.task_status as enum (
  'new',
  'in_progress',
  'on_review',
  'accepted',
  'revision'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.user_role not null,
  created_at timestamptz not null default now()
);

create table public.construction_objects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.construction_objects (id) on delete cascade,
  title text not null,
  description text not null default '',
  assignee_id uuid not null references public.profiles (id),
  author_id uuid not null references public.profiles (id),
  status public.task_status not null default 'new',
  created_at timestamptz not null default now()
);

create index tasks_object_id_idx on public.tasks (object_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);

create table public.task_status_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  from_status public.task_status,
  to_status public.task_status not null,
  changed_by uuid not null references public.profiles (id),
  comment text,
  created_at timestamptz not null default now()
);

create index task_status_history_task_id_idx on public.task_status_history (task_id);

-- Helpers (security invoker — uses caller uid)
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security invoker
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_assigner()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'assigner'
  );
$$;

create or replace function public.executor_has_task_on_object(p_object_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.tasks t
    where t.object_id = p_object_id and t.assignee_id = auth.uid()
  );
$$;

-- Block direct status changes (only RPC sets app.status_change_allowed)
create or replace function public.prevent_direct_status_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    if current_setting('app.status_change_allowed', true) is distinct from 'on' then
      raise exception 'Status must be changed via transition_task_status()';
    end if;
  end if;
  return new;
end;
$$;

create trigger tasks_prevent_direct_status_change
before update on public.tasks
for each row
execute function public.prevent_direct_status_change();

-- Initial history row on task create
create or replace function public.log_initial_task_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_status_history (task_id, from_status, to_status, changed_by, comment)
  values (new.id, null, 'new', new.author_id, null);
  return new;
end;
$$;

create trigger tasks_log_initial_status
after insert on public.tasks
for each row
execute function public.log_initial_task_status();

-- Immutable history
create or replace function public.prevent_history_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'Task status history is read-only';
end;
$$;

create trigger task_status_history_no_update
before update on public.task_status_history
for each row
execute function public.prevent_history_mutation();

create trigger task_status_history_no_delete
before delete on public.task_status_history
for each row
execute function public.prevent_history_mutation();

-- Status transition RPC (validates role, assignee, allowed edges)
create or replace function public.transition_task_status(
  p_task_id uuid,
  p_new_status public.task_status,
  p_comment text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks;
  v_role public.user_role;
  v_old public.task_status;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_task from public.tasks where id = p_task_id for update;
  if not found then
    raise exception 'Task not found';
  end if;

  select role into v_role from public.profiles where id = auth.uid();
  if v_role is null then
    raise exception 'Profile not found';
  end if;

  v_old := v_task.status;

  if v_old = 'new' and p_new_status = 'in_progress' then
    if v_task.assignee_id is distinct from auth.uid() then
      raise exception 'Only assignee can start work';
    end if;
  elsif v_old = 'in_progress' and p_new_status = 'on_review' then
    if v_task.assignee_id is distinct from auth.uid() then
      raise exception 'Only assignee can send for review';
    end if;
  elsif v_old = 'on_review' and p_new_status = 'accepted' then
    if v_role is distinct from 'assigner' then
      raise exception 'Only assigner can accept';
    end if;
  elsif v_old = 'on_review' and p_new_status = 'revision' then
    if v_role is distinct from 'assigner' then
      raise exception 'Only assigner can send for revision';
    end if;
    if p_comment is null or length(trim(p_comment)) = 0 then
      raise exception 'Comment is required for revision';
    end if;
  elsif v_old = 'revision' and p_new_status = 'in_progress' then
    if v_task.assignee_id is distinct from auth.uid() then
      raise exception 'Only assignee can resume work';
    end if;
  else
    raise exception 'Transition from % to % is not allowed', v_old, p_new_status;
  end if;

  perform set_config('app.status_change_allowed', 'on', true);
  update public.tasks set status = p_new_status where id = p_task_id returning * into v_task;

  insert into public.task_status_history (task_id, from_status, to_status, changed_by, comment)
  values (p_task_id, v_old, p_new_status, auth.uid(), nullif(trim(p_comment), ''));

  return v_task;
end;
$$;

grant execute on function public.transition_task_status(uuid, public.task_status, text) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.construction_objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_status_history enable row level security;

-- Profiles: read all authenticated (names for UI); update own row forbidden except service
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

create policy "profiles_insert_assigner_only"
on public.profiles for insert
to authenticated
with check (public.is_assigner());

-- Objects
create policy "objects_select"
on public.construction_objects for select
to authenticated
using (
  public.is_assigner()
  or public.executor_has_task_on_object(id)
);

create policy "objects_insert_assigner"
on public.construction_objects for insert
to authenticated
with check (public.is_assigner());

create policy "objects_update_assigner"
on public.construction_objects for update
to authenticated
using (public.is_assigner())
with check (public.is_assigner());

create policy "objects_delete_assigner"
on public.construction_objects for delete
to authenticated
using (public.is_assigner());

-- Tasks
create policy "tasks_select"
on public.tasks for select
to authenticated
using (
  public.is_assigner()
  or assignee_id = auth.uid()
);

create policy "tasks_insert_assigner"
on public.tasks for insert
to authenticated
with check (
  public.is_assigner()
  and author_id = auth.uid()
  and status = 'new'
);

create policy "tasks_update_assigner"
on public.tasks for update
to authenticated
using (public.is_assigner())
with check (public.is_assigner());

create policy "tasks_delete_assigner"
on public.tasks for delete
to authenticated
using (public.is_assigner());

-- History: read if user can read task; no direct writes
create policy "history_select"
on public.task_status_history for select
to authenticated
using (
  exists (
    select 1 from public.tasks t
    where t.id = task_id
    and (
      public.is_assigner()
      or t.assignee_id = auth.uid()
    )
  )
);

create policy "history_no_insert"
on public.task_status_history for insert
to authenticated
with check (false);

create policy "history_no_update"
on public.task_status_history for update
to authenticated
using (false);

create policy "history_no_delete"
on public.task_status_history for delete
to authenticated
using (false);

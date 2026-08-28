-- ═══════════════════════════════════════════════════════════════════════════
-- Rotiner — migration 002: rotinas recorrentes
-- Roda no SQL Editor do Supabase. Idempotente (pode re-rodar).
--
-- Mesmo padrão das outras tabelas: id/user_id/created_at/updated_at, RLS com
-- 4 políticas (auth.uid() = user_id), trigger de updated_at, realtime.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  cadence     text not null default 'diaria'
              check (cadence in ('diaria', 'semanal', 'mensal')),
  -- dias da semana (0=Dom … 6=Sáb); usado só quando cadence = 'semanal'
  weekdays    int[] not null default '{}',
  time        text,                                   -- "HH:mm"
  active      boolean not null default true,
  last_done   date,                                   -- último "feito"
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists routines_user_idx on public.routines (user_id);

-- updated_at (reusa a função public.set_updated_at do schema.sql)
drop trigger if exists set_updated_at on public.routines;
create trigger set_updated_at before update on public.routines
  for each row execute function public.set_updated_at();

-- RLS + 4 políticas
alter table public.routines enable row level security;

drop policy if exists routines_select on public.routines;
create policy routines_select on public.routines
  for select using (auth.uid() = user_id);

drop policy if exists routines_insert on public.routines;
create policy routines_insert on public.routines
  for insert with check (auth.uid() = user_id);

drop policy if exists routines_update on public.routines;
create policy routines_update on public.routines
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists routines_delete on public.routines;
create policy routines_delete on public.routines
  for delete using (auth.uid() = user_id);

-- Realtime (sync PC↔celular; ignora se já estiver na publicação)
do $$
begin
  begin
    alter publication supabase_realtime add table public.routines;
  exception when duplicate_object then null;
  end;
end $$;

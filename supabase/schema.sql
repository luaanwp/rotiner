-- ═══════════════════════════════════════════════════════════════════════════
-- Rotiner v2 — schema do banco (§06)
-- Normalizado: cada item é uma linha própria. Elimina o last-write-wins da v1.
-- Rode inteiro no SQL Editor do Supabase. Idempotente (pode re-rodar).
--
-- Padrão de toda tabela:
--   id uuid PK default gen_random_uuid()
--   user_id uuid FK auth.users (on delete cascade)
--   created_at / updated_at timestamptz default now()
--   RLS habilitado + 4 políticas (select/insert/update/delete) com auth.uid() = user_id
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Trigger util: mantém updated_at ─────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ═══ TABELAS ════════════════════════════════════════════════════════════════

-- tasks ──────────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'andamento'
              check (status in ('andamento', 'pausado', 'ideia', 'concluido')),
  progress    int  not null default 0 check (progress between 0 and 100),
  where_stopped text,
  next_step   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  date        date,                                   -- YYYY-MM-DD (local)
  time        text,                                   -- "HH:mm" (text de propósito)
  priority    text not null default 'media'
              check (priority in ('alta', 'media', 'baixa')),
  completed   boolean not null default false,
  project_id  uuid references public.projects (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- notes ──────────────────────────────────────────────────────────────────────
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text,
  content     text,
  pinned      boolean not null default false,
  date        date,                                   -- solta / com data / com data+hora
  time        text,                                   -- "HH:mm"
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- boards ──────────────────────────────────────────────────────────────────────
create table if not exists public.boards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.board_columns (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  board_id    uuid not null references public.boards (id) on delete cascade,
  title       text not null,
  position    int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.cards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- column_id NULL = post-it livre no canvas (Fase 8), posicionado por pos_x/pos_y
  column_id   uuid references public.board_columns (id) on delete cascade,
  title       text not null,
  content     text,
  color       text,
  pos_x       double precision,                       -- posição no canvas livre (Fase 8)
  pos_y       double precision,
  position    int  not null default 0,                -- ordem dentro da coluna
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ═══ ÍNDICES (queries por dono e por relação) ═══════════════════════════════
create index if not exists tasks_user_idx          on public.tasks (user_id);
create index if not exists tasks_project_idx        on public.tasks (project_id);
create index if not exists notes_user_idx          on public.notes (user_id);
create index if not exists projects_user_idx        on public.projects (user_id);
create index if not exists boards_user_idx          on public.boards (user_id);
create index if not exists board_columns_board_idx  on public.board_columns (board_id);
create index if not exists cards_column_idx         on public.cards (column_id);

-- ═══ updated_at TRIGGERS ════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'projects','tasks','notes','boards','board_columns','cards'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ═══ RLS — habilitar + 4 políticas por tabela (auth.uid() = user_id) ════════
-- Sem isto os dados VAZAM entre contas. Testar com 2 contas antes de seguir.
do $$
declare t text;
begin
  foreach t in array array[
    'projects','tasks','notes','boards','board_columns','cards'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id)',
      t || '_select', t);

    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id)',
      t || '_insert', t);

    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format(
      'create policy %I on public.%I for update
       using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_update', t);

    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id)',
      t || '_delete', t);
  end loop;
end $$;

-- ═══ REALTIME — adicionar tabelas à publicação ══════════════════════════════
-- Sync PC↔celular em tempo real (RF-13). Ignora se já estiverem na publicação.
do $$
declare t text;
begin
  foreach t in array array[
    'projects','tasks','notes','boards','board_columns','cards'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Fase 8 — post-its livres no canvas.
-- Um card com column_id NULL é um post-it livre (vive no canvas por pos_x/pos_y),
-- não numa coluna de quadro. Rode no SQL Editor do Supabase.

alter table public.cards alter column column_id drop not null;

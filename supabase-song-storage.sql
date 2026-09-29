-- Persistent storage for generated song audio.
-- Production schema was applied separately before activating the code.
alter table public.orders
  add column if not exists storage_path text,
  add column if not exists storage_path_2 text,
  add column if not exists storage_path_selected text,
  add column if not exists storage_saved_at timestamptz;

create index if not exists idx_orders_storage_path
  on public.orders (storage_path)
  where storage_path is not null;

create index if not exists idx_orders_storage_path_2
  on public.orders (storage_path_2)
  where storage_path_2 is not null;

insert into storage.buckets (id, name, public)
values ('songs', 'songs', false)
on conflict (id) do nothing;

-- PUBG player search cache
-- Stores player_name -> account_id + stats_data snapshot with updated_at TTL checks.

create table if not exists public.pubg_player_cache (
  player_name text primary key,
  account_id text not null,
  stats_data jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_pubg_player_cache_updated_at
  on public.pubg_player_cache (updated_at desc);

drop trigger if exists trg_pubg_player_cache_set_updated_at on public.pubg_player_cache;
create trigger trg_pubg_player_cache_set_updated_at
before update on public.pubg_player_cache
for each row
execute function public.set_updated_at();


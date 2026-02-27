-- PUBG leaderboard cache
-- Stores serialized /api/leaderboard payload by cache key with 1 hour TTL logic in application layer.

create table if not exists public.pubg_leaderboard_cache (
  cache_key text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_pubg_leaderboard_cache_updated_at
  on public.pubg_leaderboard_cache (updated_at desc);

drop trigger if exists trg_pubg_leaderboard_cache_set_updated_at on public.pubg_leaderboard_cache;
create trigger trg_pubg_leaderboard_cache_set_updated_at
before update on public.pubg_leaderboard_cache
for each row
execute function public.set_updated_at();


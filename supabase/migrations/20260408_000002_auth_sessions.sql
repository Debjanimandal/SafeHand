create table if not exists public.wallet_challenges (
  id uuid primary key default gen_random_uuid(),
  nonce text not null unique,
  wallet_address text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_challenges_wallet_address on public.wallet_challenges (wallet_address);
create index if not exists idx_wallet_challenges_expires_at on public.wallet_challenges (expires_at);

create table if not exists public.wallet_sessions (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  nonce text not null,
  signature_hash text not null,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_wallet_sessions_wallet_address on public.wallet_sessions (wallet_address);
create index if not exists idx_wallet_sessions_expires_at on public.wallet_sessions (expires_at);

alter table public.wallet_challenges enable row level security;
alter table public.wallet_sessions enable row level security;

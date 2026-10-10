create extension if not exists pgcrypto;

create table if not exists public.wallet_profiles (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  display_name text,
  created_at timestamptz not null default now(),
  active_chain text not null default '84532',
  verification_status text not null default 'unverified' check (verification_status in ('unverified','verified'))
);

create table if not exists public.proof_events (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  proof_provider text not null,
  action text not null,
  nullifier_hash text not null,
  status text not null,
  verified_at timestamptz,
  chain_id integer not null,
  tx_hash text,
  created_at timestamptz not null default now(),
  unique (nullifier_hash)
);

create table if not exists public.policy_sessions (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  agent_id text not null,
  spend_limit numeric not null,
  token_allowlist jsonb not null default '[]'::jsonb,
  contract_allowlist jsonb not null default '[]'::jsonb,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  status text not null default 'active',
  policy_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.media_signatures (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  file_hash text not null,
  signature_hash text not null,
  proof_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.transaction_events (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  chain_id integer not null,
  contract_address text,
  action_name text,
  tx_hash text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_address text,
  event_type text not null,
  target_id text,
  tx_hash text,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.wallet_profiles enable row level security;
alter table public.proof_events enable row level security;
alter table public.policy_sessions enable row level security;
alter table public.media_signatures enable row level security;
alter table public.transaction_events enable row level security;
alter table public.audit_logs enable row level security;

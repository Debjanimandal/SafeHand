create policy "wallet_profiles_select_own" on public.wallet_profiles
for select
using (wallet_address = (auth.jwt() ->> 'wallet_address'));

create policy "wallet_profiles_insert_own" on public.wallet_profiles
for insert
with check (wallet_address = (auth.jwt() ->> 'wallet_address'));

create policy "proof_events_select_own" on public.proof_events
for select
using (wallet_address = (auth.jwt() ->> 'wallet_address'));

create policy "proof_events_insert_own" on public.proof_events
for insert
with check (wallet_address = (auth.jwt() ->> 'wallet_address'));

create policy "policy_sessions_select_own" on public.policy_sessions
for select
using (wallet_address = (auth.jwt() ->> 'wallet_address'));

create policy "policy_sessions_insert_own" on public.policy_sessions
for insert
with check (wallet_address = (auth.jwt() ->> 'wallet_address'));

create policy "media_signatures_select_own" on public.media_signatures
for select
using (wallet_address = (auth.jwt() ->> 'wallet_address'));

create policy "media_signatures_insert_own" on public.media_signatures
for insert
with check (wallet_address = (auth.jwt() ->> 'wallet_address'));

create policy "transaction_events_select_own" on public.transaction_events
for select
using (wallet_address = (auth.jwt() ->> 'wallet_address'));

create policy "transaction_events_insert_own" on public.transaction_events
for insert
with check (wallet_address = (auth.jwt() ->> 'wallet_address'));

create policy "audit_logs_select_authenticated" on public.audit_logs
for select
using (auth.role() = 'authenticated');

create policy "wallet_challenges_select_own" on public.wallet_challenges
for select
using (wallet_address = (auth.jwt() ->> 'wallet_address'));

create policy "wallet_challenges_insert_own" on public.wallet_challenges
for insert
with check (wallet_address = (auth.jwt() ->> 'wallet_address'));

create policy "wallet_sessions_select_own" on public.wallet_sessions
for select
using (wallet_address = (auth.jwt() ->> 'wallet_address'));

create policy "wallet_sessions_insert_own" on public.wallet_sessions
for insert
with check (wallet_address = (auth.jwt() ->> 'wallet_address'));

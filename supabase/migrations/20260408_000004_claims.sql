-- ZK selective-disclosure claims table.
-- Stores ONLY the claim type and boolean result — never raw personal values.
-- The commitment (SHA-256 signal) links the claim to the World ID proof.
CREATE TABLE IF NOT EXISTS public.zk_claims (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text        NOT NULL,
  nullifier_hash text        NOT NULL,
  claim_type    text         NOT NULL,   -- e.g. 'age_gte_18', 'age_gte_21'
  result        boolean      NOT NULL,   -- true = claim is satisfied
  commitment    text         NOT NULL,   -- SHA-256(claimType:result:walletAddress) used as World ID signal
  verified_at   timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (nullifier_hash, claim_type)
);

ALTER TABLE public.zk_claims ENABLE ROW LEVEL SECURITY;

-- Public read of claim results (no personal data is stored)
CREATE POLICY "zk_claims_public_read" ON public.zk_claims
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS zk_claims_wallet_idx ON public.zk_claims (wallet_address);
CREATE INDEX IF NOT EXISTS zk_claims_nullifier_idx ON public.zk_claims (nullifier_hash);

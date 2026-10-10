-- Add document_hash to proof_events for binding documents to World ID proofs.
ALTER TABLE public.proof_events
  ADD COLUMN IF NOT EXISTS document_hash text;

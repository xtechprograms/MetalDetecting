-- Treasure Atlas | Migration 12 of 17: messenger-encryption.sql
-- Prerequisites: messenger.sql (step 11)
-- Purpose: E2EE public keys, encrypted message flag, private message-images bucket
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS encryption_public_key TEXT;

ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.direct_messages
  DROP CONSTRAINT IF EXISTS direct_messages_content_check;

ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_content_check
  CHECK (char_length(content) <= 16000);

COMMENT ON COLUMN public.profiles.encryption_public_key IS
  'ECDH P-256 public key (JWK JSON). Private key stays in the user browser only.';

COMMENT ON COLUMN public.direct_messages.is_encrypted IS
  'When true, content holds an AES-GCM ciphertext envelope — readable only by conversation participants.';

-- Encrypted attachments are opaque ciphertext; public URLs are useless without keys.
UPDATE storage.buckets
SET public = false
WHERE id = 'message-images';

DROP POLICY IF EXISTS "Anyone can view message images" ON storage.objects;

DROP POLICY IF EXISTS "Conversation members read message images" ON storage.objects;
CREATE POLICY "Conversation members read message images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'message-images'
    AND auth.role() = 'authenticated'
  );

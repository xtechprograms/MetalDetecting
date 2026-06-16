-- Treasure Atlas | Migration 18 of 18: messenger-pin-backup.sql
-- Prerequisites: messenger-key-backup.sql (step 15)
-- Purpose: Messaging PIN length for encrypted key backup (4 or 6 digit PIN set at signup)
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.
-- Tip: Close live site tabs if you see "deadlock detected", wait ~60s, retry.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS messaging_pin_length SMALLINT
  CHECK (messaging_pin_length IS NULL OR messaging_pin_length IN (4, 6));

COMMENT ON COLUMN public.profiles.messaging_pin_length IS
  'Length of the user messaging restore PIN (4 or 6 digits). NULL for legacy password-wrapped backups.';

COMMENT ON COLUMN public.profiles.encrypted_messaging_key IS
  'AES-GCM ciphertext of the user messaging key pair, wrapped with PBKDF2 + AES-GCM using the user messaging PIN. The server cannot read message keys without the PIN.';

-- Verify (optional):
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'messaging_pin_length';

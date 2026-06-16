-- Treasure Atlas | Migration 15 of 18: messenger-key-backup.sql
-- Prerequisites: messenger-encryption.sql (step 12)
-- Purpose: Encrypted messaging key backup column on profiles
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.
-- Then run messenger-pin-backup.sql (step 18) for messaging PIN support.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS encrypted_messaging_key TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS messaging_pin_length SMALLINT
  CHECK (messaging_pin_length IS NULL OR messaging_pin_length IN (4, 6));

COMMENT ON COLUMN public.profiles.encrypted_messaging_key IS
  'AES-GCM ciphertext of the user messaging key pair, wrapped with PBKDF2 + AES-GCM using the user messaging PIN. The server cannot read message keys without the PIN.';

COMMENT ON COLUMN public.profiles.messaging_pin_length IS
  'Length of the user messaging restore PIN (4 or 6 digits). NULL for legacy password-wrapped backups.';
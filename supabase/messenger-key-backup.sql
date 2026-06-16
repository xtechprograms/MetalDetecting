-- Treasure Atlas | Migration 15 of 17: messenger-key-backup.sql
-- Prerequisites: messenger-encryption.sql (step 12)
-- Purpose: Password-wrapped messaging key backup on profiles (restore after clearing browser data)
--
-- Run: SQL Editor → New query → paste ONLY this file → Run.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS encrypted_messaging_key TEXT;

COMMENT ON COLUMN public.profiles.encrypted_messaging_key IS
  'AES-GCM ciphertext of the user messaging key pair, wrapped with a key derived from their login password. The server cannot read message keys without the password.';

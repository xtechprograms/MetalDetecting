-- Password-wrapped messaging key backup (run after messenger-encryption.sql)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS encrypted_messaging_key TEXT;

COMMENT ON COLUMN public.profiles.encrypted_messaging_key IS
  'AES-GCM ciphertext of the user messaging key pair, wrapped with a key derived from their login password. The server cannot read message keys without the password.';

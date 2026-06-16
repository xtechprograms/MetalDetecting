import type { SupabaseClient } from "@supabase/supabase-js";
import type { DirectMessage } from "@/types/database";

const KEY_VERSION = 1;
const BACKUP_VERSION = 1;
const LOCAL_KEY_PREFIX = "ta-dm-private-key-";
const HKDF_INFO = "treasure-atlas-dm-v1";
const PBKDF2_ITERATIONS = 210_000;

export const LOST_KEYS_MESSAGE =
  "🔒 Message encrypted with older keys. Enter your messaging PIN to restore your chat history.";

export const UNABLE_DECRYPT_MESSAGE = "🔒 Unable to decrypt this message";

export type MessagingPinLength = 4 | 6;

export function validateMessagingPin(
  pin: string,
  expectedLength?: MessagingPinLength
): { valid: boolean; error?: string } {
  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: "PIN must contain numbers only." };
  }

  if (pin.length !== 4 && pin.length !== 6) {
    return { valid: false, error: "PIN must be 4 or 6 digits." };
  }

  if (expectedLength && pin.length !== expectedLength) {
    return { valid: false, error: `PIN must be exactly ${expectedLength} digits.` };
  }

  return { valid: true };
}

export const PENDING_MESSAGING_PIN_KEY = "ta-pending-messaging-pin";

type StoredKeyPair = {
  privateJwk: JsonWebKey;
  publicJwk: JsonWebKey;
};

type KeyBackupEnvelope = {
  v: number;
  salt: string;
  iv: string;
  ct: string;
};

export type DecryptedMessagePayload = {
  text: string;
  imagePath?: string;
  imageIv?: string;
};

export type UiDirectMessage = DirectMessage & {
  decryptedText: string;
  decryptedImageUrl?: string;
};

type EncryptedEnvelope = {
  v: number;
  iv: string;
  ct: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function randomIv(): Uint8Array<ArrayBuffer> {
  const iv = new Uint8Array(new ArrayBuffer(12));
  crypto.getRandomValues(iv);
  return iv;
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function parsePublicKeyJwk(raw: string | null | undefined): JsonWebKey | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JsonWebKey;
  } catch {
    return null;
  }
}

export function isEncryptedContent(content: string): boolean {
  if (!content.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(content) as EncryptedEnvelope;
    return parsed.v === KEY_VERSION && !!parsed.iv && !!parsed.ct;
  } catch {
    return false;
  }
}

async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"]
  );
}

async function importPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
}

function randomSalt(): Uint8Array<ArrayBuffer> {
  const salt = new Uint8Array(new ArrayBuffer(16));
  crypto.getRandomValues(salt);
  return salt;
}

async function deriveBackupKey(
  secret: string,
  salt: Uint8Array<ArrayBuffer>
): Promise<CryptoKey> {
  const secretKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    secretKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function wrapMessagingKeys(
  payload: StoredKeyPair,
  secret: string
): Promise<string> {
  const salt = randomSalt();
  const iv = randomIv();
  const key = await deriveBackupKey(secret, salt);
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  const envelope: KeyBackupEnvelope = {
    v: BACKUP_VERSION,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ciphertext)),
  };

  return JSON.stringify(envelope);
}

async function unwrapMessagingKeys(
  envelopeJson: string,
  secret: string
): Promise<StoredKeyPair | null> {
  try {
    const envelope = JSON.parse(envelopeJson) as KeyBackupEnvelope;
    if (envelope.v !== BACKUP_VERSION) return null;

    const salt = base64ToBytes(envelope.salt);
    const iv = base64ToBytes(envelope.iv);
    const ciphertext = base64ToBytes(envelope.ct);
    const key = await deriveBackupKey(secret, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );

    return JSON.parse(new TextDecoder().decode(decrypted)) as StoredKeyPair;
  } catch {
    return null;
  }
}

async function persistPublicKey(
  supabase: SupabaseClient,
  userId: string,
  publicJwk: JsonWebKey
): Promise<void> {
  await supabase
    .from("profiles")
    .update({ encryption_public_key: JSON.stringify(publicJwk) })
    .eq("id", userId);
}

export async function syncMessagingKeysFromPin(
  userId: string,
  pin: string,
  pinLength: MessagingPinLength,
  supabase: SupabaseClient
): Promise<{ restored: boolean; keysRegenerated: boolean }> {
  const validation = validateMessagingPin(pin, pinLength);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid messaging PIN.");
  }

  const storageKey = `${LOCAL_KEY_PREFIX}${userId}`;
  const stored = localStorage.getItem(storageKey);

  if (stored) {
    const parsed = JSON.parse(stored) as StoredKeyPair;
    const wrapped = await wrapMessagingKeys(parsed, pin);
    await supabase
      .from("profiles")
      .update({
        encrypted_messaging_key: wrapped,
        messaging_pin_length: pinLength,
      })
      .eq("id", userId);

    await persistPublicKey(supabase, userId, parsed.publicJwk);
    return { restored: false, keysRegenerated: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("encrypted_messaging_key, messaging_pin_length")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.encrypted_messaging_key) {
    const payload = await unwrapMessagingKeys(profile.encrypted_messaging_key, pin);
    if (!payload) {
      throw new Error("Could not unlock encrypted messages with this PIN.");
    }

    localStorage.setItem(storageKey, JSON.stringify(payload));
    await supabase
      .from("profiles")
      .update({ messaging_pin_length: pinLength })
      .eq("id", userId);
    await persistPublicKey(supabase, userId, payload.publicJwk);
    return { restored: true, keysRegenerated: false };
  }

  const { keysRegenerated } = await ensureUserEncryptionKeys(userId, supabase);
  const newStored = localStorage.getItem(storageKey);
  if (!newStored) {
    throw new Error("Failed to create message encryption keys.");
  }

  const parsed = JSON.parse(newStored) as StoredKeyPair;
  const wrapped = await wrapMessagingKeys(parsed, pin);
  await supabase
    .from("profiles")
    .update({
      encrypted_messaging_key: wrapped,
      messaging_pin_length: pinLength,
    })
    .eq("id", userId);

  return { restored: false, keysRegenerated };
}

export async function setupMessagingPin(
  userId: string,
  pin: string,
  pinLength: MessagingPinLength,
  supabase: SupabaseClient
): Promise<void> {
  const validation = validateMessagingPin(pin, pinLength);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid messaging PIN.");
  }

  const storageKey = `${LOCAL_KEY_PREFIX}${userId}`;
  let stored = localStorage.getItem(storageKey);

  if (!stored) {
    const { privateKey } = await ensureUserEncryptionKeys(userId, supabase);
    if (!privateKey) {
      throw new Error("Could not access message encryption keys on this device.");
    }
    stored = localStorage.getItem(storageKey);
  }

  if (!stored) {
    throw new Error("Could not access message encryption keys on this device.");
  }

  const parsed = JSON.parse(stored) as StoredKeyPair;
  const wrapped = await wrapMessagingKeys(parsed, pin);
  const { error } = await supabase
    .from("profiles")
    .update({
      encrypted_messaging_key: wrapped,
      messaging_pin_length: pinLength,
    })
    .eq("id", userId);

  if (error) {
    throw new Error("Could not save messaging PIN backup.");
  }

  await persistPublicKey(supabase, userId, parsed.publicJwk);
}

export async function restoreMessagingKeysFromPin(
  userId: string,
  pin: string,
  supabase: SupabaseClient,
  expectedLength?: MessagingPinLength | null
): Promise<boolean> {
  if (expectedLength) {
    const validation = validateMessagingPin(pin, expectedLength);
    if (!validation.valid) return false;
  } else {
    const validation = validateMessagingPin(pin);
    if (!validation.valid) return false;
  }

  const storageKey = `${LOCAL_KEY_PREFIX}${userId}`;

  const { data: profile } = await supabase
    .from("profiles")
    .select("encrypted_messaging_key")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.encrypted_messaging_key) return false;

  const payload = await unwrapMessagingKeys(profile.encrypted_messaging_key, pin);
  if (!payload) return false;

  localStorage.setItem(storageKey, JSON.stringify(payload));
  await persistPublicKey(supabase, userId, payload.publicJwk);
  return true;
}

/** Legacy accounts may still have login-password-wrapped backups. */
export async function restoreMessagingKeysFromPassword(
  userId: string,
  password: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const storageKey = `${LOCAL_KEY_PREFIX}${userId}`;

  const { data: profile } = await supabase
    .from("profiles")
    .select("encrypted_messaging_key, messaging_pin_length")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.encrypted_messaging_key || profile.messaging_pin_length) return false;

  const payload = await unwrapMessagingKeys(profile.encrypted_messaging_key, password);
  if (!payload) return false;

  localStorage.setItem(storageKey, JSON.stringify(payload));
  await persistPublicKey(supabase, userId, payload.publicJwk);
  return true;
}

export async function prepareMessagingKeys(
  userId: string,
  supabase: SupabaseClient
): Promise<{
  privateKey: CryptoKey | null;
  needsPinRestore: boolean;
  keysRegenerated: boolean;
  pinLength: MessagingPinLength | null;
  legacyPasswordBackup: boolean;
}> {
  const storageKey = `${LOCAL_KEY_PREFIX}${userId}`;
  const stored = localStorage.getItem(storageKey);

  if (stored) {
    const parsed = JSON.parse(stored) as StoredKeyPair;
    const privateKey = await importPrivateKey(parsed.privateJwk);
    await persistPublicKey(supabase, userId, parsed.publicJwk);
    return {
      privateKey,
      needsPinRestore: false,
      keysRegenerated: false,
      pinLength: null,
      legacyPasswordBackup: false,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("encrypted_messaging_key, messaging_pin_length")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.encrypted_messaging_key) {
    const pinLength = profile.messaging_pin_length as MessagingPinLength | null;
    return {
      privateKey: null,
      needsPinRestore: true,
      keysRegenerated: false,
      pinLength,
      legacyPasswordBackup: !pinLength,
    };
  }

  const { privateKey, keysRegenerated } = await ensureUserEncryptionKeys(userId, supabase);
  return {
    privateKey,
    needsPinRestore: false,
    keysRegenerated,
    pinLength: null,
    legacyPasswordBackup: false,
  };
}

export async function applyPendingMessagingPin(
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const raw = sessionStorage.getItem(PENDING_MESSAGING_PIN_KEY);
  if (!raw) return false;

  try {
    const pending = JSON.parse(raw) as { pin: string; length: MessagingPinLength };
    await syncMessagingKeysFromPin(userId, pending.pin, pending.length, supabase);
    sessionStorage.removeItem(PENDING_MESSAGING_PIN_KEY);
    return true;
  } catch {
    sessionStorage.removeItem(PENDING_MESSAGING_PIN_KEY);
    return false;
  }
}

export async function ensureUserEncryptionKeys(
  userId: string,
  supabase: SupabaseClient
): Promise<{ privateKey: CryptoKey; publicJwk: JsonWebKey; keysRegenerated: boolean }> {
  const storageKey = `${LOCAL_KEY_PREFIX}${userId}`;
  const stored = localStorage.getItem(storageKey);

  let publicJwk: JsonWebKey;
  let privateKey: CryptoKey;
  let keysRegenerated = false;

  if (stored) {
    const parsed = JSON.parse(stored) as {
      privateJwk: JsonWebKey;
      publicJwk: JsonWebKey;
    };
    privateKey = await importPrivateKey(parsed.privateJwk);
    publicJwk = parsed.publicJwk;
  } else {
    keysRegenerated = true;
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey", "deriveBits"]
    );
    privateKey = keyPair.privateKey;
    const privateJwk = (await crypto.subtle.exportKey(
      "jwk",
      keyPair.privateKey
    )) as JsonWebKey;
    publicJwk = (await crypto.subtle.exportKey("jwk", keyPair.publicKey)) as JsonWebKey;
    localStorage.setItem(
      storageKey,
      JSON.stringify({ privateJwk, publicJwk })
    );
  }

  await persistPublicKey(supabase, userId, publicJwk);

  return { privateKey, publicJwk, keysRegenerated };
}

export async function deriveConversationKey(
  privateKey: CryptoKey,
  friendPublicKeyJwk: JsonWebKey,
  conversationId: string
): Promise<CryptoKey> {
  const friendPublicKey = await importPublicKey(friendPublicKeyJwk);
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: friendPublicKey },
    privateKey,
    256
  );

  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    sharedBits,
    "HKDF",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new TextEncoder().encode(conversationId),
      info: new TextEncoder().encode(HKDF_INFO),
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptPayload(
  conversationKey: CryptoKey,
  payload: DecryptedMessagePayload
): Promise<string> {
  const iv = randomIv();
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, conversationKey, encoded);

  const envelope: EncryptedEnvelope = {
    v: KEY_VERSION,
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ciphertext)),
  };

  return JSON.stringify(envelope);
}

export async function decryptPayload(
  conversationKey: CryptoKey,
  content: string
): Promise<DecryptedMessagePayload | null> {
  if (!isEncryptedContent(content)) {
    return { text: content };
  }

  try {
    const envelope = JSON.parse(content) as EncryptedEnvelope;
    const iv = base64ToBytes(envelope.iv);
    const ciphertext = base64ToBytes(envelope.ct);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      conversationKey,
      ciphertext
    );
    return JSON.parse(new TextDecoder().decode(decrypted)) as DecryptedMessagePayload;
  } catch {
    return null;
  }
}

export async function encryptBinary(
  conversationKey: CryptoKey,
  data: ArrayBuffer
): Promise<{ iv: string; ciphertext: ArrayBuffer }> {
  const iv = randomIv();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    conversationKey,
    data
  );
  return { iv: bytesToBase64(iv), ciphertext };
}

export async function decryptBinary(
  conversationKey: CryptoKey,
  ciphertext: ArrayBuffer,
  ivBase64: string
): Promise<ArrayBuffer> {
  const iv = base64ToBytes(ivBase64);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, conversationKey, ciphertext);
}

export async function encryptAndUploadImage(
  supabase: SupabaseClient,
  conversationKey: CryptoKey,
  userId: string,
  file: File
): Promise<{ imagePath: string; imageIv: string }> {
  const bytes = await file.arrayBuffer();
  const { iv, ciphertext } = await encryptBinary(conversationKey, bytes);
  const path = `${userId}/${crypto.randomUUID()}.enc`;

  const { error } = await supabase.storage
    .from("message-images")
    .upload(path, ciphertext, { contentType: "application/octet-stream", upsert: false });

  if (error) throw error;

  return { imagePath: path, imageIv: iv };
}

export async function decryptImageToObjectUrl(
  supabase: SupabaseClient,
  conversationKey: CryptoKey,
  imagePath: string,
  imageIv: string,
  mimeType = "image/jpeg"
): Promise<string | undefined> {
  const { data, error } = await supabase.storage.from("message-images").download(imagePath);
  if (error || !data) return undefined;

  const encrypted = await data.arrayBuffer();
  const decrypted = await decryptBinary(conversationKey, encrypted, imageIv);
  const blob = new Blob([decrypted], { type: mimeType });
  return URL.createObjectURL(blob);
}

export async function decryptDirectMessage(
  message: DirectMessage,
  conversationKey: CryptoKey | null,
  supabase: SupabaseClient,
  options?: { keysRegenerated?: boolean }
): Promise<UiDirectMessage> {
  if (!message.is_encrypted) {
    return {
      ...message,
      decryptedText: message.content,
      decryptedImageUrl: message.image_url || undefined,
    };
  }

  if (!conversationKey) {
    return {
      ...message,
      decryptedText: options?.keysRegenerated ? LOST_KEYS_MESSAGE : "🔒 Encrypted message",
    };
  }

  const payload = await decryptPayload(conversationKey, message.content);
  if (!payload) {
    return {
      ...message,
      decryptedText: options?.keysRegenerated ? LOST_KEYS_MESSAGE : UNABLE_DECRYPT_MESSAGE,
    };
  }

  let decryptedImageUrl: string | undefined;
  if (payload.imagePath && payload.imageIv) {
    decryptedImageUrl = await decryptImageToObjectUrl(
      supabase,
      conversationKey,
      payload.imagePath,
      payload.imageIv
    );
  }

  return {
    ...message,
    decryptedText: payload.text || (payload.imagePath ? "" : "🔒 Encrypted message"),
    decryptedImageUrl,
  };
}

export function parsePublicKeyJwkFromProfile(raw: string | null | undefined): JsonWebKey | null {
  return parsePublicKeyJwk(raw);
}

export function previewFromPayload(
  payload: DecryptedMessagePayload | null,
  keysRegenerated?: boolean
): string {
  if (!payload) return keysRegenerated ? LOST_KEYS_MESSAGE : "🔒 Encrypted message";
  if (payload.text.trim()) return payload.text;
  if (payload.imagePath) return "📷 Photo";
  return "🔒 Encrypted message";
}

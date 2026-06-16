import type { SupabaseClient } from "@supabase/supabase-js";
import type { DirectMessage } from "@/types/database";

const KEY_VERSION = 1;
const LOCAL_KEY_PREFIX = "ta-dm-private-key-";
const HKDF_INFO = "treasure-atlas-dm-v1";

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

export async function ensureUserEncryptionKeys(
  userId: string,
  supabase: SupabaseClient
): Promise<{ privateKey: CryptoKey; publicJwk: JsonWebKey }> {
  const storageKey = `${LOCAL_KEY_PREFIX}${userId}`;
  const stored = localStorage.getItem(storageKey);

  let publicJwk: JsonWebKey;
  let privateKey: CryptoKey;

  if (stored) {
    const parsed = JSON.parse(stored) as {
      privateJwk: JsonWebKey;
      publicJwk: JsonWebKey;
    };
    privateKey = await importPrivateKey(parsed.privateJwk);
    publicJwk = parsed.publicJwk;
  } else {
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

  await supabase
    .from("profiles")
    .update({ encryption_public_key: JSON.stringify(publicJwk) })
    .eq("id", userId);

  return { privateKey, publicJwk };
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
  supabase: SupabaseClient
): Promise<UiDirectMessage> {
  if (!message.is_encrypted || !conversationKey) {
    return {
      ...message,
      decryptedText: message.content,
      decryptedImageUrl: message.image_url || undefined,
    };
  }

  const payload = await decryptPayload(conversationKey, message.content);
  if (!payload) {
    return {
      ...message,
      decryptedText: "🔒 Unable to decrypt this message",
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

export function previewFromPayload(payload: DecryptedMessagePayload | null): string {
  if (!payload) return "🔒 Encrypted message";
  if (payload.text.trim()) return payload.text;
  if (payload.imagePath) return "📷 Photo";
  return "🔒 Encrypted message";
}

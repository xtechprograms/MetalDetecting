import type {
  DecryptedMessagePayload,
  ReplyPreview,
  UiDirectMessage,
} from "./messengerCrypto";

export function playMessageSound() {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.22);
    oscillator.onended = () => void ctx.close();
  } catch {
    // ignore audio failures (autoplay restrictions, etc.)
  }
}

export const QUICK_EMOJIS = [
  "😀",
  "😂",
  "😍",
  "👍",
  "🙏",
  "🔥",
  "⛏️",
  "🪙",
  "🏆",
  "📍",
  "🗺️",
  "👋",
  "❤️",
  "😎",
  "🤝",
  "✨",
];

export function presenceColor(status: string): string {
  switch (status) {
    case "online":
      return "bg-green-500";
    case "busy":
      return "bg-orange-500";
    case "offline":
      return "bg-red-500";
    default:
      return "bg-green-500";
  }
}

export function presenceLabel(status: string): string {
  switch (status) {
    case "online":
      return "Online";
    case "busy":
      return "Busy";
    default:
      return "Offline";
  }
}

export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const MESSENGER_FRIENDS_CHANGED = "ta-messenger-friends-changed";

export function notifyMessengerFriendsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MESSENGER_FRIENDS_CHANGED));
}

export function buildReplyPreview(message: UiDirectMessage): ReplyPreview {
  let text = message.decryptedText?.trim() || "";
  if (!text && message.decryptedImageUrl) {
    text = "Photo";
  }
  if (!text) {
    text = "Message";
  }

  return {
    text: text.length > 120 ? `${text.slice(0, 120)}…` : text,
    hasImage: !!message.decryptedImageUrl && !message.decryptedText?.trim(),
    senderId: message.sender_id,
  };
}

function parsePlaintextPayload(
  content: string
): Omit<DecryptedMessagePayload, "imagePath" | "imageIv"> {
  if (content.startsWith("{")) {
    try {
      const parsed = JSON.parse(content) as {
        ta?: number;
        text?: string;
        replyToId?: string;
        replyPreview?: ReplyPreview;
      };
      if (parsed.ta === 1 && typeof parsed.text === "string") {
        return {
          text: parsed.text,
          replyToId: parsed.replyToId,
          replyPreview: parsed.replyPreview,
        };
      }
    } catch {
      // plain text fallback
    }
  }

  return { text: content };
}

export function encodePlaintextPayload(payload: DecryptedMessagePayload): string {
  if (payload.replyToId && payload.replyPreview) {
    return JSON.stringify({
      ta: 1,
      text: payload.text,
      replyToId: payload.replyToId,
      replyPreview: payload.replyPreview,
    });
  }

  return payload.text;
}

export function previewFromPlaintextContent(
  content: string,
  imageUrl?: string | null
): string {
  if (imageUrl) return "📷 Photo";
  const parsed = parsePlaintextPayload(content);
  const prefix = parsed.replyPreview ? "↩ " : "";
  if (parsed.text.trim()) return `${prefix}${parsed.text}`;
  return `${prefix}Message`;
}

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
      return "bg-green-400";
    case "busy":
      return "bg-amber-400";
    default:
      return "bg-slate-500";
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

const STORAGE = "notif-sound-on";

export function isNotificationSoundEnabled() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE) !== "0";
}

export function setNotificationSoundEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE, on ? "1" : "0");
}

/**
 * Short non-intrusive chime (Web Audio). Fails quietly if not allowed.
 */
export function playNotificationChime() {
  if (typeof window === "undefined" || !isNotificationSoundEnabled()) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.16);
    void ctx.resume().then(() => {
      window.setTimeout(() => void ctx.close(), 200);
    });
  } catch {
    // Autoplay or AudioContext not available
  }
}

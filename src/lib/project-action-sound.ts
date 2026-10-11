/** Suppress the generic notification chime after a project action sound. */
const CHIME_SUPPRESS_MS = 8_000;
let suppressChimeUntil = 0;

let sharedAudio: HTMLAudioElement | null = null;

export function shouldSuppressNotificationChime() {
  return typeof performance !== "undefined" && performance.now() < suppressChimeUntil;
}

/**
 * Success sound for project create / edit / collect.
 * Fails quietly if autoplay is blocked.
 */
export function playProjectActionSound() {
  if (typeof window === "undefined") return;
  try {
    suppressChimeUntil = performance.now() + CHIME_SUPPRESS_MS;
    if (!sharedAudio) {
      sharedAudio = new Audio("/sounds/project-action.mp3");
      sharedAudio.preload = "auto";
    }
    sharedAudio.currentTime = 0;
    void sharedAudio.play().catch(() => {
      // Autoplay or missing file — ignore
    });
  } catch {
    // ignore
  }
}

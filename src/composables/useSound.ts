import { ref, watch } from "vue";

// Every sound is synthesised with the Web Audio API, so the app ships no audio
// files (and carries no audio licensing). Browsers only allow audio after a
// user gesture, so the context is created lazily on the first tap.

const STORAGE_KEY = "shipper-game:muted";

const readMuted = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

export const muted = ref(readMuted());

watch(muted, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Ignore — the preference just won't persist.
  }
});

let context: AudioContext | null = null;

const getContext = () => {
  if (muted.value) return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === "suspended") void context.resume();
  return context;
};

type ToneOptions = {
  frequency: number;
  /** Seconds from now. */
  at?: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  /** Glide to this frequency over the tone's duration. */
  slideTo?: number;
};

const tone = ({ frequency, at = 0, duration = 0.12, type = "sine", volume = 0.18, slideTo }: ToneOptions) => {
  const ctx = getContext();
  if (!ctx) return;

  const start = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);

  // Short attack and exponential release avoid audible clicks.
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
};

export const sounds = {
  /** Soft tick for taps and hovers. */
  tap: () => tone({ frequency: 1250, duration: 0.05, type: "triangle", volume: 0.08 }),
  /** Push-notification chime. */
  notify: () => {
    tone({ frequency: 880, duration: 0.14, type: "sine", volume: 0.2 });
    tone({ frequency: 1318.5, at: 0.11, duration: 0.22, type: "sine", volume: 0.2 });
  },
  /** Screen change. */
  whoosh: () => tone({ frequency: 520, slideTo: 260, duration: 0.18, type: "sine", volume: 0.06 }),
  /** Order picked up. */
  confirm: () => {
    tone({ frequency: 660, duration: 0.1, type: "square", volume: 0.07 });
    tone({ frequency: 990, at: 0.09, duration: 0.16, type: "square", volume: 0.07 });
  },
  /** Order completed — a rising arpeggio. */
  success: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) =>
      tone({ frequency, at: index * 0.09, duration: 0.26, type: "triangle", volume: 0.16 }),
    );
  },
};

export const toggleMuted = () => {
  muted.value = !muted.value;
  if (!muted.value) sounds.tap();
};

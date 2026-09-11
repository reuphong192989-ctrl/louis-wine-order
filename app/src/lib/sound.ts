"use client";

let ctx: AudioContext | null = null;

/** Loud alarm-style chime (3 repeats of a 2-tone pattern, ~1.8s total) generated
 * on the fly — no audio asset needed. Used to alert staff (phone / tablet /
 * counter PC / kitchen screen) on new orders and "gọi nhân viên" calls. Also
 * vibrates the device (Android Chrome — iOS Safari has no Vibration API). */
export function playAlertSound() {
  vibrateDevice();
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    const REPEATS = 3;
    const PAIR_DURATION = 0.5; // 2 tones per repeat
    for (let r = 0; r < REPEATS; r++) {
      [1046, 784].forEach((freq, i) => {
        const osc = ctx!.createOscillator();
        const gain = ctx!.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        const start = now + r * PAIR_DURATION + i * 0.22;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.7, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
        osc.connect(gain).connect(ctx!.destination);
        osc.start(start);
        osc.stop(start + 0.22);
      });
    }
  } catch {
    // audio not available — non-critical
  }
}

/** Vibrates the device (if supported) with a strong, easy-to-feel pattern. */
function vibrateDevice() {
  try {
    navigator.vibrate?.([400, 150, 400, 150, 400]);
  } catch {
    // vibration not available — non-critical
  }
}

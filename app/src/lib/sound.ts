"use client";

let ctx: AudioContext | null = null;
let alarmTimer: ReturnType<typeof setInterval> | null = null;
let alarmStopAt = 0;

const ALARM_DURATION_MS = 30_000;
const BEAT_MS = 900;

function beat() {
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  const now = ctx.currentTime;
  [1046, 784].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    const start = now + i * 0.22;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.9, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(start);
    osc.stop(start + 0.22);
  });
  vibrateDevice();
}

/** Loud alarm-style chime that repeats for ~30s (so it's hard to miss on a busy
 * floor) — used to alert staff (phone / tablet / counter PC / kitchen screen)
 * on new orders, "gọi nhân viên" calls, and kitchen "done" feedback. Calling it
 * again while already ringing just extends the 30s window instead of stacking
 * a second overlapping alarm. Only works while this page is in the foreground —
 * see push.ts / use-push.ts for the screen-locked case (OS notification). */
export function playAlertSound() {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    alarmStopAt = Date.now() + ALARM_DURATION_MS;
    if (alarmTimer) return; // already ringing — just extended the stop time above

    beat();
    alarmTimer = setInterval(() => {
      if (Date.now() >= alarmStopAt) {
        if (alarmTimer) clearInterval(alarmTimer);
        alarmTimer = null;
        return;
      }
      beat();
    }, BEAT_MS);
  } catch {
    // audio not available — non-critical
  }
}

/** Cuts the alarm short — call this the moment staff acts on whatever it was
 * ringing for (ack/confirm/cancel/claim), so it doesn't keep blaring for the
 * rest of its 30s window after someone's already looking at it. */
export function stopAlertSound() {
  if (alarmTimer) {
    clearInterval(alarmTimer);
    alarmTimer = null;
  }
  alarmStopAt = 0;
  try {
    navigator.vibrate?.(0);
  } catch {
    // vibration not available — non-critical
  }
}

/** Vibrates the device (if supported) with a strong, easy-to-feel pattern. */
function vibrateDevice() {
  try {
    navigator.vibrate?.([300, 100, 300]);
  } catch {
    // vibration not available — non-critical
  }
}

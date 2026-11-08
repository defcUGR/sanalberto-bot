import { onScopeDispose, shallowRef, type ShallowRef } from "vue";

const now = shallowRef(Date.now());
let users = 0;
let timer: ReturnType<typeof setInterval> | undefined;

/** A shared clock for relative times, updated every 15 s while in use. */
export const useNow = (): Readonly<ShallowRef<number>> => {
  if (users++ === 0) {
    now.value = Date.now();
    timer = setInterval(() => (now.value = Date.now()), 15_000);
  }
  onScopeDispose(() => {
    if (--users === 0) clearInterval(timer);
  });
  return now;
};

const rtf = new Intl.RelativeTimeFormat("es", {
  numeric: "auto",
  style: "short",
});

/** "ahora", "hace 40 s", "hace 3 min", "hace 2 h", "ayer"… */
export const relativeTime = (iso: string, nowMs: number): string => {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return "";
  // Clamp small clock differences between server and client to "now".
  const seconds = Math.max(0, Math.round((nowMs - at) / 1000));
  if (seconds < 10) return rtf.format(0, "second");
  if (seconds < 60) return rtf.format(-seconds, "second");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  return rtf.format(-Math.floor(hours / 24), "day");
};

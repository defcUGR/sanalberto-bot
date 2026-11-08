import { io } from "socket.io-client";
import { shallowRef } from "vue";

/** A degree row as sent by the backend in the `data` event. */
export interface DegreeRow {
  id: number;
  name: string;
  points: number;
  weight?: number;
}

/** Points by degree name, as sent by the backend in the `dataobject` event. */
export type PointsByDegree = Record<string, number>;

/** Edition and scoreboard state, sent in the `state` event. */
export interface ScoreboardState {
  year: number;
  frozen: boolean;
}

/** A points movement, sent (newest first, at most 15) in the `movements` event. */
export interface Movement {
  id: number;
  degree: string;
  type: "add" | "remove";
  points: number;
  /** ISO date. */
  at: string;
}

/** A pending reveal ceremony (see the `reveal` event). */
export interface RevealRequest {
  /** Increases with every `reveal` event, so watchers see each one. */
  n: number;
  /** Value of `dataSeq` when `reveal` arrived: newer rows are the results. */
  afterSeq: number;
}

// Connect to the same origin the page is served from. In development the
// Vite dev server proxies `/socket.io` to the backend (see vite.config.ts).
export const socket = io();

/*
 * Latest state received from the server. The server only emits on connect and
 * whenever something changes, so the listeners live here (registered once,
 * before any component mounts) and components read the last known value.
 */
export const degrees = shallowRef<DegreeRow[]>([]);
export const points = shallowRef<PointsByDegree | null>(null);
export const scoreboard = shallowRef<ScoreboardState | null>(null);
export const movements = shallowRef<Movement[]>([]);
/** Whether the first `movements` payload (possibly empty) has arrived. */
export const movementsReceived = shallowRef(false);
export const revealRequest = shallowRef<RevealRequest | null>(null);

/** Number of `data` events received so far. */
export const dataSeq = shallowRef(0);

socket.on("data", (rows: DegreeRow[]) => {
  if (!Array.isArray(rows)) return;
  degrees.value = rows;
  dataSeq.value++;
});

socket.on("dataobject", (data: PointsByDegree) => {
  if (data && typeof data === "object") points.value = data;
});

socket.on("state", (state: ScoreboardState) => {
  if (state && typeof state === "object") scoreboard.value = state;
});

socket.on("movements", (list: Movement[]) => {
  if (!Array.isArray(list)) return;
  movementsReceived.value = true;
  movements.value = list;
});

// The server sends `reveal` right before the fresh `state`, `data`,
// `dataobject` and `movements`. The data sequence is captured here,
// synchronously, so the ceremony can tell the results apart from older rows.
socket.on("reveal", () => {
  revealRequest.value = {
    n: (revealRequest.value?.n ?? 0) + 1,
    afterSeq: dataSeq.value,
  };
});

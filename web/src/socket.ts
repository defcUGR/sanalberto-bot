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

// Connect to the same origin the page is served from. In development the
// Vite dev server proxies `/socket.io` to the backend (see vite.config.ts).
export const socket = io();

/**
 * Latest state received from the server. The server only emits on connect and
 * whenever points change, so the listeners live here (registered once, before
 * any component mounts) and components read the last known value.
 */
export const degrees = shallowRef<DegreeRow[]>([]);
export const points = shallowRef<PointsByDegree | null>(null);

socket.on("data", (rows: DegreeRow[]) => {
  if (Array.isArray(rows)) degrees.value = rows;
});

socket.on("dataobject", (data: PointsByDegree) => {
  if (data && typeof data === "object") points.value = data;
});

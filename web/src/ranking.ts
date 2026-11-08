import { computed } from "vue";

import { degrees, type DegreeRow } from "@/socket";

/** Rows sorted by points, highest first (without mutating the source). */
export const sortRanking = (rows: readonly DegreeRow[]): DegreeRow[] =>
  [...rows].sort((a, b) => b.points - a.points);

/** Live ranking from the latest `data` event. */
export const ranking = computed(() => sortRanking(degrees.value));

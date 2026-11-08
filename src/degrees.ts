// Look of each degree in the chart, the same colours and emojis as the web.
// A degree that is not listed gets a neutral colour and no emoji.

export interface DegreeStyle {
  color: string;
  /** File in web/src/assets/emojis. */
  emoji?: string;
}

const STYLES: Record<string, DegreeStyle> = {
  Matemáticas: { color: "#f4b183", emoji: "mates.svg" },
  Estadística: { color: "#ccffff", emoji: "estadisticabien.png.svg" },
  Física: { color: "#ffe699", emoji: "fisica.svg" },
  Geología: { color: "#ffcccc", emoji: "geologia.svg" },
  Química: { color: "#ffccff", emoji: "quimica.svg" },
  Óptica: { color: "#0099cc", emoji: "optica.svg" },
  Biología: { color: "#c5e0b4", emoji: "biologia.svg" },
  Biotecnología: { color: "#dddddd", emoji: "biotec.svg" },
  Bioquímica: { color: "#9dc3e6", emoji: "bioquimi.svg" },
  "Ing. Química": { color: "#9999ff", emoji: "ingquimica.svg" },
  "Ing. Electrónica": { color: "#ccccff", emoji: "ingelectro.svg" },
  "CC. Ambientales": { color: "#ccffcc", emoji: "ccambientales.svg" },
};

export function degreeStyle(name: string): DegreeStyle {
  return STYLES[name] ?? { color: "#94a3b8" };
}

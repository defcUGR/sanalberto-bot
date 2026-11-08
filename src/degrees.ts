// Look of each degree in the chart, the same colours and emojis as the web.
// A degree that is not listed gets a neutral colour and no emoji.

export interface DegreeStyle {
  color: string;
  /** File in web/src/assets/emojis. */
  emoji?: string;
  /** Other names people type for it (/add 20 mates). */
  aliases?: string[];
}

const STYLES: Record<string, DegreeStyle> = {
  Matemáticas: { color: "#f4b183", emoji: "mates.svg", aliases: ["mates"] },
  Estadística: { color: "#ccffff", emoji: "estadisticabien.png.svg", aliases: ["estad"] },
  Física: { color: "#ffe699", emoji: "fisica.svg" },
  Geología: { color: "#ffcccc", emoji: "geologia.svg" },
  Química: { color: "#ffccff", emoji: "quimica.svg" },
  Óptica: { color: "#0099cc", emoji: "optica.svg" },
  Biología: { color: "#c5e0b4", emoji: "biologia.svg" },
  Biotecnología: { color: "#dddddd", emoji: "biotec.svg" },
  Bioquímica: { color: "#9dc3e6", emoji: "bioquimi.svg" },
  "Ing. Química": { color: "#9999ff", emoji: "ingquimica.svg" },
  "Ing. Electrónica": { color: "#ccccff", emoji: "ingelectro.svg", aliases: ["electro"] },
  "CC. Ambientales": { color: "#ccffcc", emoji: "ccambientales.svg", aliases: ["ambientales", "ccaa"] },
};

export function degreeStyle(name: string): DegreeStyle {
  return STYLES[name] ?? { color: "#94a3b8" };
}

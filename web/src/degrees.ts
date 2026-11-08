import biologiaEmoji from "./assets/emojis/biologia.svg";
import bioquimicaEmoji from "./assets/emojis/bioquimi.svg";
import biotecEmoji from "./assets/emojis/biotec.svg";
import ambientalesEmoji from "./assets/emojis/ccambientales.svg";
import estadisticaEmoji from "./assets/emojis/estadisticabien.png.svg";
import fisicaEmoji from "./assets/emojis/fisica.svg";
import geologiaEmoji from "./assets/emojis/geologia.svg";
import ingElectroEmoji from "./assets/emojis/ingelectro.svg";
import ingQuimicaEmoji from "./assets/emojis/ingquimica.svg";
import matesEmoji from "./assets/emojis/mates.svg";
import opticaEmoji from "./assets/emojis/optica.svg";
import quimicaEmoji from "./assets/emojis/quimica.svg";

export interface Degree {
  name: string;
  color: string;
  icon: string;
}

/** Degrees in the order used by the timeline legend. */
export const DEGREES: readonly Degree[] = [
  { name: "Matemáticas", color: "#f4b183", icon: matesEmoji },
  { name: "Estadística", color: "#ccffff", icon: estadisticaEmoji },
  { name: "Física", color: "#ffe699", icon: fisicaEmoji },
  { name: "Geología", color: "#ffcccc", icon: geologiaEmoji },
  { name: "Química", color: "#ffccff", icon: quimicaEmoji },
  { name: "Óptica", color: "#0099cc", icon: opticaEmoji },
  { name: "Biología", color: "#c5e0b4", icon: biologiaEmoji },
  { name: "Biotecnología", color: "#dddddd", icon: biotecEmoji },
  { name: "Bioquímica", color: "#9dc3e6", icon: bioquimicaEmoji },
  { name: "Ing. Química", color: "#9999ff", icon: ingQuimicaEmoji },
  { name: "Ing. Electrónica", color: "#ccccff", icon: ingElectroEmoji },
  { name: "CC. Ambientales", color: "#ccffcc", icon: ambientalesEmoji },
];

const byName = new Map(DEGREES.map((d) => [d.name, d]));

export const degreeIcon = (name: string): string | undefined =>
  byName.get(name)?.icon;

export const degreeColor = (name: string): string =>
  byName.get(name)?.color ?? "#94a3b8";

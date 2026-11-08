import fs from "node:fs";
import path from "node:path";
import { createCanvas, GlobalFonts, loadImage, type Image } from "@napi-rs/canvas";
import { config } from "./config";
import { degreeStyle } from "./degrees";
import type { Logger } from "./logger";

// Ranking as a PNG, drawn on the server (for /chart and GET /ranking). The
// font ships with the bot so the result does not depend on the host's fonts.

const FONT = "Montserrat";
const WIDTH = 1000;
const ROW = 64;
const TOP = 110;
const BOTTOM = 40;
const LABEL_WIDTH = 350;
const VALUE_WIDTH = 120;
const MEDALS = ["#facc15", "#cbd5e1", "#d97706"];

let fontsLoaded = false;
const emojiCache = new Map<string, Promise<Image | null>>();

function loadFonts(logger: Logger) {
  if (fontsLoaded) return;
  fontsLoaded = true;
  for (const file of ["montserrat-500.ttf", "montserrat-700.ttf"]) {
    const fontPath = path.join(config.fontDir, file);
    if (!GlobalFonts.registerFromPath(fontPath, FONT))
      logger.warn({ fontPath }, "chart font not loaded");
  }
}

function emoji(file: string | undefined, logger: Logger): Promise<Image | null> {
  if (!file) return Promise.resolve(null);
  let image = emojiCache.get(file);
  if (!image) {
    const filePath = path.join(config.emojiDir, file);
    image = fs.promises
      .readFile(filePath)
      .then((data) => loadImage(data))
      .catch((err: unknown) => {
        logger.warn({ err, filePath }, "chart emoji not loaded");
        return null;
      });
    emojiCache.set(file, image);
  }
  return image;
}

export interface RankingEntry {
  name: string;
  points: number;
}

export async function renderRanking(
  entries: RankingEntry[],
  year: number,
  logger: Logger,
  note?: string
): Promise<Buffer> {
  loadFonts(logger);
  const rows = [...entries].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  const height = TOP + Math.max(rows.length, 1) * ROW + BOTTOM;
  const canvas = createCanvas(WIDTH, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, WIDTH, height);

  ctx.fillStyle = "#f8fafc";
  ctx.font = `700 36px ${FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillText("Carrera de Carreras", 40, 50);
  ctx.fillStyle = "#94a3b8";
  ctx.font = `500 22px ${FONT}`;
  ctx.fillText(`San Alberto ${year}${note ? ` · ${note}` : ""}`, 40, 86);

  const max = Math.max(1, ...rows.map((row) => row.points));
  const barLeft = LABEL_WIDTH;
  const barSpace = WIDTH - LABEL_WIDTH - VALUE_WIDTH - 40;

  for (const [index, row] of rows.entries()) {
    const y = TOP + index * ROW;
    const middle = y + ROW / 2;
    const style = degreeStyle(row.name);

    // Position, with a medal colour for the podium.
    ctx.beginPath();
    ctx.arc(58, middle, 18, 0, Math.PI * 2);
    ctx.fillStyle = MEDALS[index] ?? "#334155";
    ctx.fill();
    ctx.fillStyle = index < 3 ? "#0f172a" : "#e2e8f0";
    ctx.font = `700 18px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(String(index + 1), 58, middle + 1);
    ctx.textAlign = "left";

    const image = await emoji(style.emoji, logger);
    if (image) ctx.drawImage(image, 90, middle - 18, 36, 36);

    ctx.fillStyle = "#f1f5f9";
    ctx.font = `500 24px ${FONT}`;
    ctx.fillText(row.name, 138, middle, barLeft - 148);

    const width = Math.max(4, (row.points / max) * barSpace);
    ctx.fillStyle = style.color;
    ctx.beginPath();
    ctx.roundRect(barLeft, middle - 18, width, 36, 8);
    ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.font = `700 24px ${FONT}`;
    ctx.fillText(String(row.points), barLeft + width + 14, middle + 1);
  }

  return canvas.encode("png");
}

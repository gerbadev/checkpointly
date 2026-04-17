export type AdventureThemeId = "mountain" | "space" | "forest" | "ocean" | "desert";

export type AdventureThemePattern = "mountain" | "space" | "forest" | "ocean" | "desert";

export type AdventureTheme = {
  id: AdventureThemeId;
  label: string;
  emoji: string;
  accent: string;
  softBg: string;
  border: string;

  bg: { from: string; to: string };

  decor: {
    emoji: string;
    x: number;
    y: number; 
    size: number;
    opacity: number;
    rotate?: string;
  }[];

  pattern: AdventureThemePattern;
};
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function generateDecorFromSeed(
  cfg: {
    emoji: string;
    count: number;
    area: { x0: number; y0: number; x1: number; y1: number };
    sizeRange: [number, number];
    opacityRange: [number, number];
    rotateRangeDeg?: [number, number];
    cols?: number;
    rows?: number;
    jitter?: number; 
  },
  seed: number
) {
  const rand = mulberry32(seed);
  const cols = Math.max(1, cfg.cols ?? 4);
  const rows = Math.max(1, cfg.rows ?? Math.ceil(cfg.count / cols));
  const jitter = cfg.jitter ?? 0.85;

  const out: AdventureTheme["decor"] = [];

  for (let i = 0; i < cfg.count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const tx = cols === 1 ? 0.5 : col / (cols - 1);
    const ty = rows === 1 ? 0.5 : row / (rows - 1);

    const jx = (rand() - 0.5) * (0.12 * jitter);
    const jy = (rand() - 0.5) * (0.10 * jitter);

    const x = clamp(lerp(cfg.area.x0, cfg.area.x1, tx) + jx, 0, 1);
    const y = clamp(lerp(cfg.area.y0, cfg.area.y1, ty) + jy, 0, 1);

    const size = Math.round(lerp(cfg.sizeRange[0], cfg.sizeRange[1], rand()));
    const opacity = Number(lerp(cfg.opacityRange[0], cfg.opacityRange[1], rand()).toFixed(3));

    let rotate: string | undefined = undefined;
    if (cfg.rotateRangeDeg) {
      const deg = Math.round(lerp(cfg.rotateRangeDeg[0], cfg.rotateRangeDeg[1], rand()));
      rotate = `${deg}deg`;
    }

    out.push({ emoji: cfg.emoji, x, y, size, opacity, rotate });
  }

  return out;
}

export const ADVENTURE_THEMES: AdventureTheme[] = [
  {
    id: "mountain",
    label: "Planina",
    emoji: "🏔️",
    accent: "#9CA3AF",
    softBg: "rgba(156,163,175,0.14)",
    border: "rgba(156,163,175,0.30)",
    bg: { from: "#070A14", to: "#141B2E" },
    decor: [
      { emoji: "❄️", x: 0.15, y: 0.12, size: 46, opacity: 0.10 },

      ...generateDecorFromSeed(
        {
          emoji: "⛰️",
          count: 14,
          area: { x0: 0.06, y0: 0.18, x1: 0.94, y1: 0.88 },
          sizeRange: [52, 82],
          opacityRange: [0.05, 0.12],
          rotateRangeDeg: [-6, 6],
          cols: 3,
          rows: 5,
          jitter: 0.9,
        },
        314
      ),
    ],
    pattern: "mountain",
  },

  {
    id: "space",
    label: "Svemir",
    emoji: "🌌",
    accent: "#60A5FA",
    softBg: "rgba(96,165,250,0.14)",
    border: "rgba(96,165,250,0.28)",
    bg: { from: "#060816", to: "#12183A" },
    decor: [
      { emoji: "🪐", x: 0.78, y: 0.12, size: 64, opacity: 0.10 },
      { emoji: "🛰️", x: 0.16, y: 0.20, size: 54, opacity: 0.09, rotate: "-12deg" },
      ...generateDecorFromSeed(
        {
          emoji: "⭐️",
          count: 16,
          area: { x0: 0.06, y0: 0.10, x1: 0.94, y1: 0.90 },
          sizeRange: [26, 42],
          opacityRange: [0.05, 0.14],
          rotateRangeDeg: [-15, 15],
          cols: 5,
          rows: 5,
          jitter: 1,
        },
        888
      ),
    ],
    pattern: "space",
  },

  {
    id: "forest",
    label: "Šuma",
    emoji: "🌲",
    accent: "#34D399",
    softBg: "rgba(52,211,153,0.14)",
    border: "rgba(52,211,153,0.26)",
    bg: { from: "#06130C", to: "#0F2A1E" },
    decor: [
      { emoji: "🌿", x: 0.10, y: 0.12, size: 54, opacity: 0.12 },
      { emoji: "🍃", x: 0.60, y: 0.36, size: 46, opacity: 0.10 },
      ...generateDecorFromSeed(
        {
          emoji: "🌲",
          count: 18,
          area: { x0: 0.08, y0: 0.12, x1: 0.92, y1: 0.92 },
          sizeRange: [44, 72],
          opacityRange: [0.05, 0.11],
          rotateRangeDeg: [-10, 10],
          cols: 4,
          rows: 5,
          jitter: 0.9,
        },
        420
      ),
    ],
    pattern: "forest",
  },

  {
    id: "desert",
    label: "Pustinja",
    emoji: "🏜️",
    accent: "#FBBF24",
    softBg: "rgba(251,191,36,0.14)",
    border: "rgba(251,191,36,0.26)",
    bg: { from: "#140C05", to: "#2A1A0B" },
    decor: [
      { emoji: "☀️", x: 0.64, y: 0.10, size: 48, opacity: 0.10 },
      ...generateDecorFromSeed(
        {
          emoji: "🌵",
          count: 14,
          area: { x0: 0.08, y0: 0.16, x1: 0.92, y1: 0.92 },
          sizeRange: [44, 66],
          opacityRange: [0.05, 0.11],
          rotateRangeDeg: [-8, 8],
          cols: 3,
          rows: 5,
          jitter: 0.95,
        },
        777
      ),
    ],
    pattern: "desert",
  },

  {
    id: "ocean",
    label: "Ocean",
    emoji: "🌊",
    accent: "#22D3EE",
    softBg: "rgba(34,211,238,0.14)",
    border: "rgba(34,211,238,0.26)",
    bg: { from: "#04121A", to: "#0C2D3B" },
    decor: [
      { emoji: "🐋", x: 0.12, y: 0.14, size: 70, opacity: 0.08 },

      ...generateDecorFromSeed(
        {
          emoji: "🐠",
          count: 16,
          area: { x0: 0.08, y0: 0.18, x1: 0.92, y1: 0.88 },
          sizeRange: [38, 60],
          opacityRange: [0.06, 0.12],
          rotateRangeDeg: [-20, 20],
          cols: 4,
          rows: 4,
          jitter: 0.95,
        },
        2024
      ),

      ...generateDecorFromSeed(
        {
          emoji: "🫧",
          count: 12,
          area: { x0: 0.1, y0: 0.15, x1: 0.9, y1: 0.9 },
          sizeRange: [26, 46],
          opacityRange: [0.04, 0.1],
          rotateRangeDeg: [-10, 10],
          cols: 3,
          rows: 4,
          jitter: 1,
        },
        909
      ),
    ],
    pattern: "ocean",
  },
];

export function getAdventureTheme(id?: AdventureThemeId) {
  return ADVENTURE_THEMES.find((t) => t.id === id) ?? ADVENTURE_THEMES[0];
}

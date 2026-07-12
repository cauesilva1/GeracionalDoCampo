"use client";

import { useState } from "react";
import { Copy, Download, RotateCcw, Trophy } from "lucide-react";
import { BasketballHalfCourtMark } from "@/components/landing/BasketballCourtLines";
import { Button } from "@/components/ui/Button";
import { ATTRS } from "@/lib/data";
import { computeLegacyScore, liveStats } from "@/lib/simulation";
import { legacyTheme } from "@/lib/legacyTheme";
import { useGameActions, useGameState } from "@/hooks/useGameSimulation";

function OvrSpark({
  points,
  color,
}: {
  points: { age: number; ovr: number }[];
  color: string;
}) {
  if (points.length < 2) return null;
  const minO = Math.min(...points.map((p) => p.ovr)) - 3;
  const maxO = Math.max(...points.map((p) => p.ovr)) + 3;
  const w = 320;
  const h = 48;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * (w - 8) + 4;
    const y = h - 4 - ((p.ovr - minO) / (maxO - minO)) * (h - 8);
    return [x, y] as const;
  });
  const line = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `4,${h} ${line} ${w - 4},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full">
      <defs>
        <linearGradient id="ovrFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#ovrFill)" />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={line}
      />
    </svg>
  );
}

function downloadLegacyPng(opts: {
  name: string;
  pos: string;
  ovr: number;
  seasons: number;
  tierLabel: string;
  tierDesc: string;
  league: number;
  nba: number;
  euro: number;
  worldCups: number;
  olympics: number;
  mvp: number;
  finals: number;
  allstars: number;
  theme: ReturnType<typeof legacyTheme>;
}) {
  const W = 720;
  const H = 1020;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { theme } = opts;

  const bg = ctx.createLinearGradient(0, 0, W * 0.2, H);
  bg.addColorStop(0, theme.bg1);
  bg.addColorStop(0.55, theme.bg0);
  bg.addColorStop(1, "#05070c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Accent bar
  ctx.fillStyle = theme.accent;
  ctx.fillRect(0, 0, 10, H);

  // Soft top glow
  const glow = ctx.createRadialGradient(W * 0.55, 0, 20, W * 0.55, 120, 380);
  glow.addColorStop(0, theme.accent + "55");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Basketball half-court watermark
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 3;
  const cx = W * 0.72;
  const cy = H * 0.32;
  // Key
  ctx.strokeRect(cx - 45, cy - 90, 90, 78);
  // Free-throw arc
  ctx.beginPath();
  ctx.arc(cx, cy - 12, 45, 0, Math.PI);
  ctx.stroke();
  // Rim
  ctx.beginPath();
  ctx.arc(cx, cy - 72, 12, 0, Math.PI * 2);
  ctx.stroke();
  // Backboard
  ctx.beginPath();
  ctx.moveTo(cx - 28, cy - 90);
  ctx.lineTo(cx + 28, cy - 90);
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.lineWidth = 3;
  // Three-point arc
  ctx.beginPath();
  ctx.moveTo(cx - 85, cy - 90);
  ctx.lineTo(cx - 85, cy - 50);
  ctx.arc(cx, cy - 50, 85, Math.PI, 0, true);
  ctx.lineTo(cx + 85, cy - 90);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.font = "600 18px Bebas Neue, Impact, system-ui, sans-serif";
  ctx.fillText("LENDA DA QUADRA", 48, 64);

  // Giant OVR watermark
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = theme.accent;
  ctx.font = "800 280px Bebas Neue, Impact, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(String(opts.ovr), W - 36, 340);
  ctx.restore();
  ctx.textAlign = "left";

  ctx.fillStyle = "#fff";
  ctx.font = "800 72px Bebas Neue, Impact, system-ui, sans-serif";
  ctx.fillText(opts.name.toUpperCase(), 48, 150);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "500 22px system-ui, sans-serif";
  ctx.fillText(`${opts.pos}  ·  ${opts.seasons} seasons`, 48, 190);

  // OVR badge
  ctx.fillStyle = theme.accentSoft;
  roundRect(ctx, 48, 220, 120, 88, 14);
  ctx.fill();
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 1.5;
  roundRect(ctx, 48, 220, 120, 88, 14);
  ctx.stroke();
  ctx.fillStyle = theme.accent;
  ctx.font = "800 48px Bebas Neue, Impact, system-ui, sans-serif";
  ctx.fillText(String(opts.ovr), 68, 278);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText("OVR FINAL", 68, 298);

  // Tier
  ctx.fillStyle = theme.canvasTitle;
  ctx.font = "800 40px Bebas Neue, Impact, system-ui, sans-serif";
  wrapText(ctx, opts.tierLabel.toUpperCase(), 48, 370, W - 96, 44);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "400 20px system-ui, sans-serif";
  wrapText(ctx, opts.tierDesc, 48, 460, W - 96, 28);

  // Divider
  const div = ctx.createLinearGradient(48, 0, W - 48, 0);
  div.addColorStop(0, "transparent");
  div.addColorStop(0.5, theme.accent);
  div.addColorStop(1, "transparent");
  ctx.strokeStyle = div;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(48, 530);
  ctx.lineTo(W - 48, 530);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const stats: [string, number][] = [
    ["LIGA", opts.league],
    ["NBA", opts.nba],
    ["EURO", opts.euro],
    ["COPA", opts.worldCups],
    ["OLY", opts.olympics],
    ["MVP", opts.mvp],
    ["FMVP", opts.finals],
    ["AS", opts.allstars],
  ];
  stats.forEach(([label, val], i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 48 + col * 160;
    const y = 560 + row * 120;
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    roundRect(ctx, x, y, 148, 100, 14);
    ctx.fill();
    ctx.fillStyle = theme.accent;
    ctx.font = "800 44px Bebas Neue, Impact, system-ui, sans-serif";
    ctx.fillText(String(val), x + 18, y + 56);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillText(label, x + 18, y + 80);
  });

  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.font = "500 15px system-ui, sans-serif";
  ctx.fillText("lendadaquadra.app", 48, H - 48);

  const a = document.createElement("a");
  a.download = `lenda-${opts.name.replace(/\s+/g, "-").toLowerCase()}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

export function LegacyCard() {
  const { state, ovr, legacyTierId } = useGameState();
  const { restart, copySummary, tr } = useGameActions();
  const [copied, setCopied] = useState(false);
  const [hallStatus, setHallStatus] = useState<
    "idle" | "sending" | "ok" | "err"
  >("idle");
  const career = state.career;
  const player = state.player;
  if (!career || !player) return null;

  const theme = legacyTheme(legacyTierId);
  const trph = career.trophies;
  const attrs = liveStats(state);
  const keyAttrs = ATTRS.filter((a) =>
    ["shot", "fin", "def", "clu"].includes(a.k),
  );

  const handleCopy = async () => {
    const ok = await copySummary();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleHall = async () => {
    setHallStatus("sending");
    try {
      const res = await fetch("/api/hall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: player.name,
          posId: player.posId,
          ovr,
          tierId: legacyTierId,
          seasons: career.seasonsPlayed,
          leagueTitles: trph.leagueTitles,
          nbaTitles: trph.nbaTitles,
          euroTitles: trph.euroTitles ?? 0,
          worldCups: trph.worldCups,
          olympicRuns: trph.olympicRuns ?? 0,
          mvps: trph.mvps,
          finalsMvps: trph.finalsMvps,
          allStars: trph.allStars,
          legacyScore: computeLegacyScore(career),
          careerSeed: career.careerSeed || state.careerSeed || "",
          locale: state.locale,
          nickname: career.nickname,
        }),
      });
      if (!res.ok) throw new Error("fail");
      setHallStatus("ok");
    } catch {
      setHallStatus("err");
    }
  };

  const handleDownload = () => {
    downloadLegacyPng({
      name: player.name,
      pos: player.posId,
      ovr,
      seasons: career.seasonsPlayed,
      tierLabel: tr(`tier.${legacyTierId}`),
      tierDesc: tr(`tier.${legacyTierId}.desc`),
      league: trph.leagueTitles,
      nba: trph.nbaTitles,
      euro: trph.euroTitles ?? 0,
      worldCups: trph.worldCups,
      olympics: trph.olympicRuns ?? 0,
      mvp: trph.mvps,
      finals: trph.finalsMvps,
      allstars: trph.allStars,
      theme,
    });
  };

  const trophies = [
    [tr("legacy.leagueTitles"), trph.leagueTitles],
    [tr("legacy.nbaTitles"), trph.nbaTitles],
    [tr("legacy.euroTitles"), trph.euroTitles ?? 0],
    [tr("legacy.worldCups"), trph.worldCups],
    [tr("legacy.olympics"), trph.olympicRuns ?? 0],
    [tr("legacy.mvps"), trph.mvps],
    [tr("legacy.finals"), trph.finalsMvps],
    [tr("legacy.allstars"), trph.allStars],
  ] as const;

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[380px] flex-col items-center justify-center overflow-hidden px-1">
      <p className="shrink-0 text-center font-sans text-[10px] font-medium uppercase tracking-[0.32em] text-white/40">
        {tr("legacy.eyebrow")}
      </p>

      <div
        className="relative mt-3 w-full overflow-hidden rounded-[22px]"
        style={{
          background: `linear-gradient(165deg, ${theme.bg1} 0%, ${theme.bg0} 55%, #05070c 100%)`,
          boxShadow: `0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px ${theme.accent}40, 0 0 40px ${theme.glow}`,
        }}
      >
        {/* Left accent */}
        <div
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: theme.accent }}
        />

        {/* Basketball half-court watermark */}
        <BasketballHalfCourtMark
          color={theme.accent}
          className="pointer-events-none absolute -right-6 top-12 h-56 w-56 opacity-[0.12]"
        />

        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{
            background: `radial-gradient(ellipse at 40% 0%, ${theme.accentSoft}, transparent 70%)`,
          }}
        />

        <div className="relative px-5 pb-5 pt-5">
          {/* Giant OVR wash */}
          <p
            aria-hidden
            className="pointer-events-none absolute -right-1 top-2 font-display text-[120px] leading-none opacity-[0.07]"
            style={{ color: theme.accent }}
          >
            {ovr}
          </p>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 text-left">
              <p className="font-sans text-[9px] uppercase tracking-[0.28em] text-white/35">
                Lenda da Quadra
              </p>
              <h2 className="mt-1 truncate font-display text-[28px] uppercase leading-none text-white">
                {player.name}
              </h2>
              <p className="mt-1.5 font-sans text-[11px] text-white/45">
                {player.posId} · {career.seasonsPlayed}{" "}
                {tr("dash.season").toLowerCase()}s
              </p>
            </div>
            <div
              className="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-2xl"
              style={{
                background: theme.accentSoft,
                boxShadow: `inset 0 0 0 1px ${theme.accent}66`,
              }}
            >
              <span
                className={`font-display text-[34px] leading-none ${theme.ovrClass}`}
              >
                {ovr}
              </span>
              <span className="mt-0.5 font-sans text-[8px] uppercase tracking-[0.2em] text-white/40">
                {tr("legacy.ovr")}
              </span>
            </div>
          </div>

          <div className="mt-4 text-left">
            <span
              className={`inline-block rounded-sm px-2 py-1 font-sans text-[9px] font-semibold uppercase tracking-[0.16em] ${theme.ribbonClass}`}
            >
              {tr(`tier.${legacyTierId}`)}
            </span>
            <p className="mt-2 font-sans text-[12px] leading-relaxed text-white/50">
              {tr(`tier.${legacyTierId}.desc`)}
            </p>
          </div>

          <div
            className="mt-4 h-px w-full opacity-40"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
            }}
          />

          {/* Key attrs — slim */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {keyAttrs.map((a) => (
              <div key={a.k} className="text-center">
                <p className="font-sans text-[8px] uppercase tracking-wider text-white/35">
                  {tr(a.labelKey).slice(0, 4)}
                </p>
                <p
                  className={`mt-0.5 font-display text-lg leading-none ${theme.ovrClass}`}
                >
                  {attrs[a.k]}
                </p>
              </div>
            ))}
          </div>

          {/* Trophies — no nested cards */}
          <div className="mt-4 grid grid-cols-4 gap-x-2 gap-y-3">
            {trophies.map(([label, val]) => (
              <div key={label as string} className="text-left">
                <p
                  className={`font-display text-xl leading-none sm:text-2xl ${theme.ovrClass}`}
                >
                  {val}
                </p>
                <p className="mt-0.5 font-sans text-[8px] uppercase leading-tight tracking-wide text-white/40 sm:text-[9px]">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <p className="mb-1 font-sans text-[9px] uppercase tracking-[0.22em] text-white/35">
              {tr("legacy.chart")}
            </p>
            <OvrSpark points={career.ovrHistory} color={theme.accent} />
          </div>
        </div>
      </div>

      <div className="mt-4 flex shrink-0 flex-wrap justify-center gap-2">
        <Button
          variant="outline"
          disabled={hallStatus === "sending" || hallStatus === "ok"}
          onClick={() => void handleHall()}
        >
          <Trophy className="h-3.5 w-3.5" />
          {hallStatus === "ok"
            ? tr("hall.submitted")
            : hallStatus === "sending"
              ? tr("hall.submitting")
              : tr("hall.submit")}
        </Button>
        <Button variant="ghost" onClick={handleDownload}>
          <Download className="h-3.5 w-3.5" />
          {tr("legacy.download")}
        </Button>
        <Button variant="ghost" onClick={handleCopy}>
          <Copy className="h-3.5 w-3.5" />
          {copied ? tr("cta.copied") : tr("cta.copy")}
        </Button>
        <Button onClick={restart}>
          <RotateCcw className="h-3.5 w-3.5" />
          {tr("cta.newCareer")}
        </Button>
      </div>
      {hallStatus === "err" && (
        <p className="mt-2 text-center font-sans text-[11px] text-arena-buzzer">
          {tr("hall.submitError")}
        </p>
      )}
    </div>
  );
}

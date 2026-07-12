"use client";

import type { ClubTemplate } from "@/types/manager";

/** Crest from club colors + short name (no licensed logos). */
export function ClubCrest({
  club,
  size = 72,
}: {
  club: Pick<ClubTemplate, "id" | "shortName" | "colors" | "name">;
  size?: number;
}) {
  const primary = club.colors.primary || "#163024";
  const secondary = club.colors.secondary || "#fff";
  const initials = (club.shortName || club.name.slice(0, 3))
    .slice(0, 3)
    .toUpperCase();
  const gid = `crest-${club.id.replace(/[^a-zA-Z0-9]/g, "")}`;
  const textFill =
    secondary === "#000" || secondary === "#000000" ? "#f2f5f0" : secondary;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 96"
      aria-hidden
      className="shrink-0 drop-shadow-[0_6px_16px_rgba(0,0,0,0.45)]"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primary} />
          <stop
            offset="100%"
            stopColor={
              secondary === "#fff" || secondary === "#ffffff"
                ? primary
                : secondary
            }
            stopOpacity="0.9"
          />
        </linearGradient>
      </defs>
      <path
        d="M40 4 L70 16 L70 48 C70 68 56 84 40 92 C24 84 10 68 10 48 L10 16 Z"
        fill={`url(#${gid})`}
        stroke={textFill}
        strokeWidth="2.5"
      />
      <path
        d="M40 12 L62 21 L62 48 C62 64 52 76 40 82 C28 76 18 64 18 48 L18 21 Z"
        fill="none"
        stroke={textFill}
        strokeOpacity="0.35"
        strokeWidth="1.2"
      />
      <circle cx="40" cy="44" r="18" fill="#050a08" fillOpacity="0.35" />
      <text
        x="40"
        y="50"
        textAnchor="middle"
        fill={textFill}
        fontSize={initials.length > 2 ? 14 : 18}
        fontFamily="var(--font-display-face), Impact, sans-serif"
        fontWeight="700"
        letterSpacing="0.04em"
      >
        {initials}
      </text>
    </svg>
  );
}

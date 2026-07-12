"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { PastRunsSection } from "@/components/landing/PastRunsSection";
import { playHref } from "@/lib/i18n";
import { t } from "@/lib/i18n/dictionary";
import {
  coachLegacyTheme,
  LANDING_COACH_TIERS,
} from "@/lib/manager/coachTheme";
import type { Locale } from "@/types/game";

/** Turf + tactical board + coach silhouette — unique art per tier. */
function CoachCardArt({
  accent,
  tier,
  uid,
}: {
  accent: string;
  tier: string;
  uid: string;
}) {
  const stars =
    tier === "legend" ? 3 : tier === "elite" ? 2 : tier === "contender" ? 1 : 0;
  const turfId = `turf-${uid}`;
  const glowId = `glow-${uid}`;

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 180 240"
      fill="none"
    >
      <defs>
        <linearGradient id={turfId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.08" />
          <stop offset="55%" stopColor={accent} stopOpacity="0.03" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={glowId} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.45" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Night stadium wash */}
      <rect width="180" height="240" fill={`url(#${turfId})`} />
      <ellipse cx="90" cy="0" rx="90" ry="70" fill={`url(#${glowId})`} />

      {/* Perspective pitch */}
      <g opacity="0.55" stroke={accent} strokeWidth="1.1">
        <path
          d="M22 168 L158 168 L148 98 L32 98 Z"
          fill={`${accent}10`}
          strokeLinejoin="round"
        />
        <path d="M90 98 L90 168" />
        <ellipse cx="90" cy="133" rx="16" ry="9" fill="none" />
        <path d="M48 98 L52 112 L128 112 L132 98" />
        <path d="M58 168 L62 152 L118 152 L122 168" />
        {/* Yard / grass stripes */}
        {[110, 122, 134, 146, 158].map((y) => (
          <path
            key={y}
            d={`M${28 + (y - 98) * 0.08} ${y} L${152 - (y - 98) * 0.08} ${y}`}
            opacity="0.35"
            strokeWidth="0.7"
          />
        ))}
      </g>

      {/* Tactical chalkboard plate */}
      <g transform="translate(28, 52)">
        <rect
          x="0"
          y="0"
          width="124"
          height="72"
          rx="4"
          fill="#0a120e"
          stroke={accent}
          strokeOpacity="0.55"
          strokeWidth="1.2"
        />
        <rect
          x="4"
          y="4"
          width="116"
          height="64"
          rx="2"
          fill="#0f1c14"
          stroke={accent}
          strokeOpacity="0.2"
        />
        {/* Formation 4-3-3 dots */}
        <g fill={accent}>
          {/* GK */}
          <circle cx="62" cy="58" r="3.2" opacity="0.9" />
          {/* DEF */}
          {[28, 48, 76, 96].map((x) => (
            <circle key={`d${x}`} cx={x} cy="44" r="2.8" opacity="0.85" />
          ))}
          {/* MID */}
          {[38, 62, 86].map((x) => (
            <circle key={`m${x}`} cx={x} cy="28" r="2.8" opacity="0.9" />
          ))}
          {/* ATT */}
          {[32, 62, 92].map((x) => (
            <circle key={`a${x}`} cx={x} cy="12" r="3" />
          ))}
          {/* Links */}
          <g stroke={accent} strokeWidth="0.8" opacity="0.35" fill="none">
            <path d="M62 58 L48 44 M62 58 L76 44" />
            <path d="M48 44 L38 28 M76 44 L86 28 M62 44 L62 28" />
            <path d="M38 28 L32 12 M62 28 L62 12 M86 28 L92 12" />
          </g>
        </g>
        {/* Chalk scribble */}
        <path
          d="M10 62 Q20 56 28 62"
          stroke={accent}
          strokeOpacity="0.25"
          strokeWidth="0.8"
          fill="none"
        />
      </g>

      {/* Coach silhouette on the touchline */}
      <g transform="translate(118, 145)" fill={accent} opacity="0.72">
        {/* Legs */}
        <path d="M8 52 L4 72 L10 72 L12 56 L16 72 L22 72 L16 52 Z" />
        {/* Coat */}
        <path d="M5 22 L3 50 L25 50 L21 22 C19 16 9 16 5 22 Z" />
        {/* Arm + clipboard */}
        <path d="M21 26 L34 30 L33 36 L20 34 Z" opacity="0.9" />
        <rect x="30" y="28" width="12" height="14" rx="1" opacity="0.85" />
        <path
          d="M32 31 H40 M32 34 H39 M32 37 H38"
          stroke="#05150c"
          strokeWidth="0.7"
          opacity="0.5"
        />
        {/* Head */}
        <circle cx="13" cy="14" r="7" />
        {/* Cap / flat visor */}
        <path d="M6 12 L13 8 L22 12 L20 14 L6 14 Z" opacity="0.95" />
      </g>

      {/* Stars / trophies for higher tiers */}
      {stars > 0 && (
        <g transform="translate(18, 198)" fill={accent}>
          {Array.from({ length: stars }).map((_, i) => (
            <path
              key={i}
              transform={`translate(${i * 18}, 0) scale(0.85)`}
              d="M10 0 L12.2 6.5 L19 7 L14 11.5 L15.5 18 L10 14.5 L4.5 18 L6 11.5 L1 7 L7.8 6.5 Z"
              opacity={0.55 + i * 0.15}
            />
          ))}
        </g>
      )}

      {tier === "legend" && (
        <g transform="translate(138, 40)" fill={accent} opacity="0.85">
          {/* Mini cup */}
          <path d="M6 8 H18 V14 C18 19 14 22 12 22 C10 22 6 19 6 14 Z" />
          <path
            d="M6 10 C2 10 2 16 6 15 M18 10 C22 10 22 16 18 15"
            stroke={accent}
            strokeWidth="1.2"
            fill="none"
          />
          <rect x="9" y="22" width="6" height="3" rx="0.5" />
          <rect x="7" y="25" width="10" height="2.5" rx="0.5" />
        </g>
      )}
    </svg>
  );
}

function CoachTierCard({
  locale,
  ovr,
  tier,
}: {
  locale: Locale;
  ovr: number;
  tier: string;
}) {
  const theme = coachLegacyTheme(tier);
  const isLegend = tier === "legend";

  return (
    <article
      className="group relative w-full min-w-0 overflow-hidden rounded-xl transition-transform duration-300 hover:-translate-y-1"
      style={{
        boxShadow: `0 16px 36px rgba(0,0,0,0.5), 0 0 0 1px ${theme.accent}40, 0 0 28px ${theme.glow}`,
      }}
    >
      <div
        className="relative aspect-[3/4] overflow-hidden"
        style={{
          background: `linear-gradient(175deg, ${theme.bg1} 0%, ${theme.bg0} 42%, #030a07 100%)`,
        }}
      >
        <CoachCardArt accent={theme.accent} tier={tier} uid={`${tier}-${ovr}`} />

        {/* Soft vignette so text stays readable */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 28%, transparent 52%, rgba(0,0,0,0.72) 78%, rgba(0,0,0,0.88) 100%)",
          }}
        />

        <div
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: theme.accent }}
        />

        <div className="relative flex h-full flex-col px-2.5 pb-2.5 pt-2.5 text-left sm:px-3.5 sm:pb-3.5 sm:pt-3">
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <p className="font-sans text-[7px] font-medium uppercase tracking-[0.24em] text-white/40 sm:text-[8px] sm:tracking-[0.3em]">
                {t(locale, "hero.title2")}
              </p>
              <span
                className={`mt-1 inline-block rounded-sm px-1.5 py-0.5 font-sans text-[7px] font-semibold uppercase tracking-[0.14em] sm:mt-1.5 sm:text-[8px] sm:tracking-[0.16em] ${theme.ribbonClass}`}
                style={{ boxShadow: `0 0 0 1px ${theme.accent}55` }}
              >
                {isLegend
                  ? "MAX"
                  : tier === "elite"
                    ? "TOP"
                    : tier === "contender"
                      ? "RISE"
                      : "PATH"}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={`font-display text-[32px] leading-none tracking-tight sm:text-[52px] ${theme.ovrClass}`}
                style={{ textShadow: `0 0 ${isLegend ? 28 : 16}px ${theme.glow}` }}
              >
                {ovr}
              </p>
              <p className="mt-0.5 font-sans text-[7px] uppercase tracking-[0.24em] text-white/40 sm:text-[8px]">
                OVR
              </p>
            </div>
          </div>

          <div className="mt-auto pt-10 sm:pt-16">
            <h3
              className={`font-display text-[14px] uppercase leading-[0.95] tracking-wide sm:text-[21px] ${theme.titleClass}`}
            >
              {t(locale, `mgr.legacy.tier.${tier}`)}
            </h3>
            <p className="mt-1 line-clamp-2 font-sans text-[9px] leading-relaxed text-white/50 sm:mt-1.5 sm:line-clamp-3 sm:text-[11px]">
              {t(locale, `mgr.legacy.tier.${tier}.desc`)}
            </p>
            <div
              className="mt-2 h-px w-full opacity-60 sm:mt-2.5"
              style={{
                background: `linear-gradient(90deg, ${theme.accent}, transparent)`,
              }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export function LandingPage({ locale }: { locale: Locale }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-arena-bg text-brand-text">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(232,197,71,0.12)_0%,transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(196,30,58,0.12)_0%,transparent_45%),radial-gradient(ellipse_at_20%_70%,rgba(45,122,72,0.28)_0%,transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <SiteHeader locale={locale} compact />

      <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-4 text-center sm:py-6">
        <p className="mb-1.5 font-sans text-[10px] font-medium uppercase tracking-[0.32em] text-arena-accent sm:mb-2 sm:text-[11px]">
          {t(locale, "brand.eyebrow")}
        </p>

        <h1 className="mx-auto max-w-4xl font-display text-[2.1rem] leading-[0.92] tracking-wide text-white sm:text-6xl lg:text-[4.25rem]">
          {t(locale, "hero.title1")}{" "}
          <span className="bg-gradient-to-r from-arena-accent to-brand-green-bright bg-clip-text text-transparent">
            {t(locale, "hero.title2")}
          </span>
        </h1>

        <p className="mx-auto mt-2 max-w-xl text-sm leading-snug text-white/60 sm:mt-3 sm:text-base lg:max-w-2xl">
          {t(locale, "hero.sub")}
        </p>

        <div className="-mx-4 mt-4 flex w-[calc(100%+2rem)] gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mt-5 sm:grid sm:w-full sm:max-w-3xl sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 md:max-w-4xl md:grid-cols-4">
          {LANDING_COACH_TIERS.map((card) => (
            <div
              key={card.tier}
              className="w-[42vw] max-w-[160px] shrink-0 sm:w-auto sm:max-w-none"
            >
              <CoachTierCard
                locale={locale}
                ovr={card.ovr}
                tier={card.tier}
              />
            </div>
          ))}
        </div>

        <Link
          href={playHref(locale)}
          className="mt-4 inline-flex w-full max-w-xs items-center justify-center rounded-sm bg-arena-accent px-8 py-3 font-display text-xl uppercase tracking-wide text-arena-bg shadow-[0_0_24px_rgba(232,197,71,0.35)] transition-colors duration-200 hover:bg-brand-green-bright hover:text-white sm:mt-5 sm:w-auto sm:max-w-none sm:px-10 sm:py-3.5 sm:text-2xl"
        >
          {t(locale, "cta.play")}
        </Link>
        <p className="mt-2 px-2 font-mono text-[10px] leading-relaxed text-white/35">
          {t(locale, "mgr.realDisclaimer")}
        </p>
      </section>

      <PastRunsSection locale={locale} />

      <div className="relative z-10">
        <SiteFooter locale={locale} compact />
      </div>
    </div>
  );
}

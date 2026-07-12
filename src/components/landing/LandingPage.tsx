"use client";

import Link from "next/link";
import { BasketballCourtLines } from "@/components/landing/BasketballCourtLines";
import { HallLeaderboard } from "@/components/landing/HallLeaderboard";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { playHref } from "@/lib/i18n";
import { t } from "@/lib/i18n/dictionary";
import { LANDING_TIERS, legacyTheme } from "@/lib/legacyTheme";
import type { Locale } from "@/types/game";

function TierPreviewCard({
  locale,
  ovr,
  tier,
}: {
  locale: Locale;
  ovr: number;
  tier: string;
}) {
  const theme = legacyTheme(tier);
  const isGoat = tier === "goat";

  return (
    <article
      className="relative w-full overflow-hidden rounded-[16px] sm:w-[186px] sm:rounded-[18px]"
      style={{
        boxShadow: `0 14px 32px rgba(0,0,0,0.42), 0 0 0 1px ${theme.accent}33, 0 0 24px ${theme.glow}`,
      }}
    >
      <div
        className="relative aspect-[3/4] overflow-hidden"
        style={{
          background: `linear-gradient(165deg, ${theme.bg1} 0%, ${theme.bg0} 48%, #05070c 100%)`,
        }}
      >
        <BasketballCourtLines color={theme.accent} />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-70"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${theme.accentSoft}, transparent 70%)`,
          }}
        />
        <div
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: theme.accent }}
        />

        <div className="relative flex h-full flex-col px-3 pb-3 pt-2.5 text-left sm:px-3.5 sm:pb-3.5 sm:pt-3">
          <div className="flex items-start justify-between gap-1.5">
            <p className="font-sans text-[7px] font-medium uppercase tracking-[0.28em] text-white/40 sm:text-[8px]">
              Lenda
            </p>
            <div className="text-right">
              <p
                className={`font-display text-[36px] leading-none tracking-tight sm:text-[50px] ${theme.ovrClass}`}
                style={
                  isGoat ? { textShadow: `0 0 24px ${theme.glow}` } : undefined
                }
              >
                {ovr}
              </p>
              <p className="mt-0.5 font-sans text-[7px] uppercase tracking-[0.22em] text-white/35 sm:text-[8px]">
                OVR
              </p>
            </div>
          </div>

          <div className="mt-auto">
            <span
              className={`inline-block rounded-sm px-1.5 py-0.5 font-sans text-[7px] font-semibold uppercase tracking-[0.18em] sm:text-[8px] ${theme.ribbonClass}`}
            >
              {isGoat ? "99 · Elite" : tier === "allstar" ? "Star" : "Career"}
            </span>
            <h3
              className={`mt-1.5 font-display text-[15px] uppercase leading-[0.95] tracking-wide sm:text-[20px] ${theme.titleClass}`}
            >
              {t(locale, `tier.${tier}`)}
            </h3>
            <p className="mt-1 line-clamp-3 font-sans text-[9px] leading-relaxed text-white/45 sm:mt-1.5 sm:text-[11px]">
              {t(locale, `tier.${tier}.desc`)}
            </p>
          </div>

          <div
            className="mt-2 h-px w-full opacity-50 sm:mt-2.5"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
            }}
          />
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
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,122,0,0.14)_0%,transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(255,59,48,0.1)_0%,transparent_45%),radial-gradient(ellipse_at_20%_70%,rgba(30,58,138,0.25)_0%,transparent_50%)]"
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

      {/* Hero — fits first viewport on desktop */}
      <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-4 py-5 text-center sm:py-6 lg:min-h-[calc(100dvh-3.5rem)] lg:py-4">
        <p className="mb-1.5 font-sans text-[10px] font-medium uppercase tracking-[0.32em] text-arena-accent sm:mb-2 sm:text-[11px]">
          {t(locale, "brand.eyebrow")}
        </p>

        <h1 className="mx-auto max-w-4xl font-display text-[2.45rem] leading-[0.92] tracking-wide text-white sm:text-6xl lg:text-[4.25rem]">
          {t(locale, "hero.title1")}{" "}
          <span className="bg-gradient-to-r from-arena-accent to-arena-buzzer bg-clip-text text-transparent">
            {t(locale, "hero.title2")}
          </span>
          ?
        </h1>

        <p className="mx-auto mt-2 max-w-xl text-sm leading-snug text-white/60 sm:mt-3 sm:text-base lg:max-w-2xl">
          {t(locale, "hero.sub")}
        </p>

        <div className="mt-5 grid w-full max-w-[340px] grid-cols-2 gap-2.5 sm:mt-5 sm:flex sm:max-w-4xl sm:justify-center sm:gap-4 lg:mt-4">
          {LANDING_TIERS.map((card) => (
            <TierPreviewCard
              key={card.tier}
              locale={locale}
              ovr={card.ovr}
              tier={card.tier}
            />
          ))}
        </div>

        <Link
          href={playHref(locale)}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-arena-accent px-9 py-3 font-display text-xl uppercase tracking-wide text-arena-bg shadow-[0_0_24px_rgba(255,122,0,0.35)] transition-colors duration-200 hover:bg-arena-buzzer hover:text-white sm:mt-5 sm:px-10 sm:py-3.5 sm:text-2xl lg:mt-4"
        >
          [ {t(locale, "cta.play")} ]
        </Link>
      </section>

      {/* Hall of Fame — below the fold */}
      <section className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-10 pt-4 sm:pb-14 sm:pt-6">
        <div className="mb-5 text-center sm:mb-6">
          <p className="font-sans text-[10px] font-medium uppercase tracking-[0.32em] text-arena-accent">
            Top 10
          </p>
          <h2 className="mt-1 font-display text-3xl uppercase tracking-wide text-white sm:text-4xl">
            {t(locale, "hall.title")}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md font-sans text-sm text-white/50">
            {t(locale, "hall.sub")}
          </p>
        </div>
        <HallLeaderboard locale={locale} limit={10} showMoreLink />
      </section>

      <div className="relative z-10">
        <SiteFooter locale={locale} compact />
      </div>
    </div>
  );
}

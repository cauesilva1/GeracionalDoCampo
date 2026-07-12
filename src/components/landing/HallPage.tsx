"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { HallLeaderboard } from "@/components/landing/HallLeaderboard";
import { localePath } from "@/lib/i18n";
import { t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/types/game";

export function HallPage({ locale }: { locale: Locale }) {
  return (
    <div className="relative min-h-screen bg-arena-bg text-brand-text">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,122,0,0.12)_0%,transparent_55%)]"
      />
      <SiteHeader locale={locale} />
      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 py-10">
        <Link
          href={localePath(locale)}
          className="font-sans text-[11px] uppercase tracking-[0.2em] text-white/40 hover:text-arena-accent"
        >
          ← {t(locale, "nav.home")}
        </Link>
        <h1 className="mt-4 font-display text-5xl uppercase tracking-wide text-white">
          {t(locale, "hall.title")}
        </h1>
        <p className="mt-2 max-w-xl font-sans text-sm text-white/55">
          {t(locale, "hall.sub")}
        </p>
        <div className="mt-8">
          <HallLeaderboard locale={locale} limit={30} />
        </div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

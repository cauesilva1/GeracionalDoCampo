"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { localePath } from "@/lib/i18n";
import { t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/types/game";

export function InfoShell({
  locale,
  title,
  children,
}: {
  locale: Locale;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-arena-bg text-brand-text">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,122,0,0.1)_0%,transparent_50%)]"
      />
      <SiteHeader locale={locale} />
      <main className="relative z-10 mx-auto w-full max-w-2xl px-4 py-10 sm:py-12">
        <Link
          href={localePath(locale)}
          className="font-sans text-[11px] uppercase tracking-[0.2em] text-white/40 transition-colors hover:text-arena-accent"
        >
          ← {t(locale, "nav.home")}
        </Link>
        <h1 className="mt-4 font-display text-3xl uppercase tracking-wide text-white sm:text-5xl">
          {title}
        </h1>
        <div className="mt-8 space-y-6 text-left">{children}</div>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}

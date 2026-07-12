"use client";

import Link from "next/link";
import { localePath, playHref } from "@/lib/i18n";
import { t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/types/game";

export function SiteHeader({
  locale,
  compact = false,
}: {
  locale: Locale;
  compact?: boolean;
}) {
  const locales: Locale[] = ["en", "pt", "es"];
  return (
    <header
      className={`sticky top-0 z-40 border-b border-white/8 bg-arena-bg/85 backdrop-blur-md ${
        compact ? "" : ""
      }`}
    >
      <div
        className={`mx-auto flex w-full max-w-5xl items-center justify-between px-4 ${
          compact ? "h-12 sm:h-14" : "h-[64px] sm:h-[72px]"
        }`}
      >
        <Link
          href={localePath(locale)}
          className={`font-display tracking-wide transition-opacity hover:opacity-90 ${
            compact ? "text-xl sm:text-2xl" : "text-2xl"
          }`}
        >
          <span className="text-white">{t(locale, "brand.name")}</span>
          <span className="text-arena-accent">{t(locale, "brand.domain")}</span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {locales.map((l) => (
            <Link
              key={l}
              href={localePath(l)}
              className={`rounded px-1.5 py-1 font-display text-[10px] uppercase tracking-wider transition-colors sm:px-2 sm:text-[11px] ${
                l === locale
                  ? "bg-arena-accent text-arena-bg"
                  : "border border-white/10 text-white/55 hover:border-white/25 hover:text-white"
              }`}
            >
              {l}
            </Link>
          ))}
          <Link
            href={playHref(locale)}
            className={`ml-1 rounded-full bg-arena-accent font-display uppercase tracking-wide text-arena-bg transition-colors hover:bg-brand-green-bright hover:text-white sm:ml-2 ${
              compact
                ? "px-3.5 py-1.5 text-xs sm:px-4 sm:text-sm"
                : "px-5 py-2 text-sm"
            }`}
          >
            {t(locale, "cta.play")}
          </Link>
        </div>
      </div>
    </header>
  );
}

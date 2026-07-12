"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
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
          className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-90 sm:gap-2.5"
        >
          <BrandLogo
            size={compact ? 36 : 44}
            priority
            className="shrink-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
          />
          <span
            className={`min-w-0 truncate font-display tracking-wide ${
              compact ? "text-lg sm:text-2xl" : "text-xl sm:text-2xl"
            }`}
          >
            <span className="text-white">{t(locale, "brand.name")}</span>
            <span className="text-arena-accent">{t(locale, "brand.domain")}</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
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
            className={`ml-0.5 rounded-sm bg-arena-accent font-display uppercase tracking-wide text-arena-bg transition-colors hover:bg-brand-green-bright hover:text-white sm:ml-2 ${
              compact
                ? "px-2.5 py-1.5 text-[11px] sm:px-4 sm:text-sm"
                : "px-3 py-2 text-xs sm:px-5 sm:text-sm"
            }`}
          >
            {t(locale, "cta.play")}
          </Link>
        </div>
      </div>
    </header>
  );
}

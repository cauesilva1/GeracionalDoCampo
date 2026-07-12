"use client";

import Link from "next/link";
import { sitePageHref, type SitePage } from "@/lib/i18n";
import { t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/types/game";

const LINKS: { page: SitePage; key: string }[] = [
  { page: "sobre", key: "nav.about" },
  { page: "docs", key: "nav.docs" },
  { page: "privacidade", key: "nav.privacy" },
];

export function SiteFooter({
  locale,
  compact = false,
}: {
  locale: Locale;
  compact?: boolean;
}) {
  return (
    <footer
      className={`w-full border-t border-white/8 ${compact ? "py-2" : "py-6"}`}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-4 sm:flex-row sm:justify-between">
        <p className="text-center font-sans text-[10px] text-white/35 sm:text-left">
          {t(locale, "footer.note")}
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {LINKS.map(({ page, key }) => (
            <Link
              key={page}
              href={sitePageHref(locale, page)}
              className="font-sans text-[10px] uppercase tracking-wider text-white/45 transition-colors hover:text-white"
            >
              {t(locale, key)}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

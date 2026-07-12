"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MANAGER_STORAGE_KEY } from "@/lib/manager/clubs";
import { playHref } from "@/lib/i18n";
import { t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/types/game";
import type { ManagerPhase } from "@/types/manager";

const CONTINUE_PHASES: ManagerPhase[] = [
  "hub",
  "season_end",
  "offers",
  "match_live",
  "career_event",
  "national",
  "fired",
];

function hasContinueSave(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(MANAGER_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as {
      phase?: ManagerPhase;
      career?: unknown;
    };
    if (!parsed?.career || !parsed.phase) return false;
    if (parsed.phase === "setup" || parsed.phase === "legacy") return false;
    return CONTINUE_PHASES.includes(parsed.phase);
  } catch {
    return false;
  }
}

const playCtaClass =
  "inline-flex w-full max-w-xs items-center justify-center rounded-sm bg-arena-accent px-8 py-3 font-display text-xl uppercase tracking-wide text-arena-bg shadow-[0_0_24px_rgba(232,197,71,0.35)] transition-colors duration-200 hover:bg-brand-green-bright hover:text-white sm:w-auto sm:max-w-none sm:px-10 sm:py-3.5 sm:text-2xl";

/** Landing / play CTA: Continuar when a mid-career save exists, else default play. */
export function ContinueCareerCta({ locale }: { locale: Locale }) {
  const [mode, setMode] = useState<"loading" | "fresh" | "continue">("loading");

  useEffect(() => {
    setMode(hasContinueSave() ? "continue" : "fresh");
  }, []);

  if (mode === "loading") {
    return (
      <div className="mt-4 h-12 w-full max-w-xs sm:mt-5 sm:h-[3.25rem] sm:w-48" />
    );
  }

  if (mode === "fresh") {
    return (
      <Link href={playHref(locale)} className={`mt-4 sm:mt-5 ${playCtaClass}`}>
        {t(locale, "cta.play")}
      </Link>
    );
  }

  return (
    <div className="mt-4 flex w-full max-w-xs flex-col items-stretch gap-2 sm:mt-5 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-3">
      <Link href={playHref(locale)} className={playCtaClass}>
        {t(locale, "mgr.continue")}
      </Link>
      <Link
        href={playHref(locale)}
        className="inline-flex items-center justify-center rounded-sm border border-white/20 px-6 py-2.5 font-display text-sm uppercase tracking-wide text-white/70 transition-colors hover:border-white/40 hover:text-white sm:text-base"
        onClick={() => {
          try {
            localStorage.removeItem(MANAGER_STORAGE_KEY);
          } catch {
            /* ignore */
          }
        }}
      >
        {t(locale, "mgr.newGame")}
      </Link>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Volume2, VolumeX } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { ManagerHub } from "@/components/manager/ManagerHub";
import { ManagerSetup } from "@/components/manager/ManagerSetup";
import {
  ManagerGameProvider,
  useManagerActions,
  useManagerState,
} from "@/hooks/useManagerGame";
import { isSfxMuted, loadSfxMute, setSfxMute } from "@/lib/sfx";
import type { Locale } from "@/types/game";

function LocaleChips({ locale }: { locale: Locale }) {
  const locales: Locale[] = ["en", "pt", "es"];
  return (
    <div className="flex gap-1">
      {locales.map((l) => (
        <Link
          key={l}
          href={`/play?locale=${l}`}
          className={`cursor-pointer rounded px-2 py-1 font-display text-[11px] uppercase ${
            l === locale
              ? "bg-arena-accent text-arena-bg"
              : "border border-white/10 text-white/60"
          }`}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}

function SfxToggle({ tr }: { tr: (k: string) => string }) {
  const [muted, setMuted] = useState(() => loadSfxMute());

  return (
    <button
      type="button"
      title={muted ? tr("sfx.unmute") : tr("sfx.mute")}
      onClick={() => {
        const next = !isSfxMuted();
        setSfxMute(next);
        setMuted(next);
      }}
      className="cursor-pointer rounded border border-white/10 p-1.5 text-white/50 hover:border-white/25 hover:text-white"
    >
      {muted ? (
        <VolumeX className="h-3.5 w-3.5" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function PlayShell({ locale }: { locale: Locale }) {
  const { state, hydrated } = useManagerState();
  const { tr, restart } = useManagerActions();

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center overflow-hidden bg-arena-bg">
        <div className="h-8 w-8 animate-pulse rounded-full border-2 border-arena-accent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-arena-bg text-brand-text">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <Link
          href={locale === "pt" ? "/" : `/${locale}`}
          className="flex min-w-0 items-center gap-2 font-display text-sm uppercase tracking-wide text-white/80 hover:text-arena-accent"
        >
          <BrandLogo size={28} className="shrink-0" />
          <span className="truncate">
            {tr("brand.name")}
            <span className="text-arena-accent">{tr("brand.domain")}</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {state.phase !== "setup" && (
            <button
              type="button"
              onClick={restart}
              className="cursor-pointer font-mono text-[9px] uppercase text-white/40 hover:text-white/70 sm:text-[10px]"
            >
              {tr("mgr.restart")}
            </button>
          )}
          <SfxToggle tr={tr} />
          <LocaleChips locale={locale} />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        {state.phase === "setup" ? <ManagerSetup /> : <ManagerHub />}
      </main>
    </div>
  );
}

export function PlayApp({ locale }: { locale: Locale }) {
  return (
    <ManagerGameProvider locale={locale}>
      <PlayShell locale={locale} />
    </ManagerGameProvider>
  );
}

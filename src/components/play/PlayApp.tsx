"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { Dashboard } from "@/components/play/Dashboard";
import { DraftPanel } from "@/components/play/DraftPanel";
import { HowToPanel } from "@/components/play/HowToPanel";
import { LegacyCard } from "@/components/play/events/LegacyCard";
import { RevealPanel } from "@/components/play/RevealPanel";
import { SetupPanel } from "@/components/play/SetupPanel";
import {
  GameSimulationProvider,
  useGameActions,
  useGameState,
} from "@/hooks/useGameSimulation";
import { localePath } from "@/lib/i18n";
import { fadeFast } from "@/lib/motion";
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
  const { state, hydrated } = useGameState();
  const { tr, restart } = useGameActions();

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center overflow-hidden bg-arena-bg">
        <div className="h-8 w-8 animate-pulse rounded-full border-2 border-arena-accent" />
      </div>
    );
  }

  let body;
  switch (state.phase) {
    case "setup":
      body = <SetupPanel />;
      break;
    case "howto":
      body = <HowToPanel />;
      break;
    case "draft":
      body = <DraftPanel />;
      break;
    case "reveal":
      body = <RevealPanel />;
      break;
    case "career":
    case "transfers":
    case "nba_draft":
      body = <Dashboard />;
      break;
    case "legacy":
      body = <LegacyCard />;
      break;
    default:
      body = <SetupPanel />;
  }

  const careerLike =
    state.phase === "career" ||
    state.phase === "transfers" ||
    state.phase === "nba_draft";
  const locked = state.phase === "legacy";
  const phaseKey =
    state.phase === "career" ||
    state.phase === "transfers" ||
    state.phase === "nba_draft"
      ? "career"
      : state.phase;

  return (
    <div
      className={`flex flex-col bg-arena-bg text-brand-text ${
        locked ? "h-screen overflow-hidden" : "min-h-screen"
      }`}
    >
      <header className="sticky top-0 z-40 shrink-0 border-b border-white/10 bg-arena-bg/95 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-3 sm:px-4">
          <Link
            href={localePath(locale)}
            className="font-display text-lg tracking-wide text-white"
          >
            {tr("brand.name")}
            <span className="text-arena-accent">{tr("brand.domain")}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <SfxToggle tr={tr} />
            <LocaleChips locale={locale} />
            {state.phase !== "setup" && (
              <button
                type="button"
                onClick={restart}
                className="cursor-pointer font-display text-[11px] uppercase text-white/40 hover:text-white"
              >
                {tr("cta.newCareer")}
              </button>
            )}
          </div>
        </div>
      </header>
      <main
        className={`mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 sm:px-4 ${
          locked
            ? "min-h-0 overflow-hidden py-2"
            : careerLike
              ? "items-stretch py-4 pb-10"
              : "items-center py-4 pb-10"
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={phaseKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fadeFast}
            className="flex w-full flex-1 flex-col"
          >
            {body}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export function PlayApp({ locale }: { locale: Locale }) {
  return (
    <GameSimulationProvider initialLocale={locale}>
      <PlayShell locale={locale} />
    </GameSimulationProvider>
  );
}

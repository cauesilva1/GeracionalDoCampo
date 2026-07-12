"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, Trophy, User } from "lucide-react";
import { PlayerProfile } from "@/components/play/columns/PlayerProfile";
import { StandingsColumn } from "@/components/play/columns/StandingsColumn";
import { AwardPopup } from "@/components/play/events/AwardPopup";
import { ClutchMoment } from "@/components/play/events/ClutchMoment";
import { FinalsPrompt } from "@/components/play/events/FinalsPrompt";
import { JourneyKickoff } from "@/components/play/events/JourneyKickoff";
import { NationalCallupPanel } from "@/components/play/events/NationalCallupPanel";
import { NbaDraftNight } from "@/components/play/events/NbaDraftNight";
import { SeasonResult } from "@/components/play/events/SeasonResult";
import { SeasonEventPanel } from "@/components/play/events/SeasonEventPanel";
import { SeasonSimulating } from "@/components/play/events/SeasonSimulating";
import { TransferOffers } from "@/components/play/events/TransferOffers";
import { ImpactToastStrip } from "@/components/play/events/ImpactToastStrip";
import { childReveal, parentFade } from "@/lib/motion";
import { getLeague } from "@/lib/simulation";
import { useGameActions, useGameState } from "@/hooks/useGameSimulation";

type MobileTab = "profile" | "court" | "standings";

/** Layout shell only — enter/exit owned by parent AnimatePresence. */
function EventCard({ children }: { children: ReactNode }) {
  return (
    <motion.div
      layout
      {...childReveal}
      className="mx-auto w-full max-w-md rounded-xl border border-white/10 bg-arena-panel/95 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)] sm:p-5"
    >
      {children}
    </motion.div>
  );
}

function centerViewKey(
  phase: string,
  centerView: string,
  awardId?: string,
): string {
  if (phase === "nba_draft" || centerView === "nba_draft") return "nba_draft";
  if (centerView === "award") return `award:${awardId ?? "none"}`;
  return centerView;
}

export function Dashboard() {
  const { state, ovr } = useGameState();
  const { tr } = useGameActions();
  const career = state.career;
  const player = state.player;
  const [mobileTab, setMobileTab] = useState<MobileTab>("court");

  const isModalEvent =
    state.centerView === "finals_prompt" ||
    state.centerView === "clutch" ||
    state.centerView === "award" ||
    state.centerView === "mid_event" ||
    state.centerView === "offseason_event" ||
    state.centerView === "simulating" ||
    state.centerView === "journey" ||
    state.centerView === "national_callup";

  useEffect(() => {
    if (isModalEvent) setMobileTab("court");
  }, [isModalEvent, state.centerView]);

  if (!career || !player) return null;

  const league = getLeague(career.leagueId);

  let center;
  if (state.phase === "nba_draft" || state.centerView === "nba_draft") {
    center = <NbaDraftNight />;
  } else if (state.centerView === "journey") {
    center = <JourneyKickoff />;
  } else if (state.centerView === "national_callup") {
    center = <NationalCallupPanel />;
  } else if (state.centerView === "simulating") {
    center = <SeasonSimulating />;
  } else if (
    state.centerView === "mid_event" ||
    state.centerView === "offseason_event"
  ) {
    center = <SeasonEventPanel />;
  } else if (state.centerView === "finals_prompt") {
    center = <FinalsPrompt />;
  } else if (state.centerView === "clutch") {
    center = <ClutchMoment />;
  } else if (state.centerView === "award") {
    center = <AwardPopup />;
  } else if (state.centerView === "transfers") {
    center = <TransferOffers />;
  } else {
    center = <SeasonResult />;
  }

  const viewKey = centerViewKey(
    state.phase,
    state.centerView,
    state.activeAward?.id,
  );

  const useEventShell =
    isModalEvent &&
    state.centerView !== "clutch" &&
    state.centerView !== "award";

  // Single React tree: desktop shows all cols; mobile toggles via CSS (no double-mount)
  const showProfile = mobileTab === "profile";
  const showCourt = mobileTab === "court";
  const showStandings = mobileTab === "standings";

  return (
    <div className="relative flex w-full flex-col">
      <ImpactToastStrip />

      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-arena-panel px-3 py-2">
        <div className="min-w-0 text-left">
          <p className="truncate font-display text-base uppercase text-white sm:text-lg">
            {player.name}{" "}
            <span className="text-white/40">· {career.clubName}</span>
          </p>
          <p className="text-[11px] text-white/45">
            {tr(league.nameKey)} · {tr("dash.season")} {career.season} ·{" "}
            {career.calendarYear ?? 2016} · {career.age} {tr("dash.age")}
          </p>
        </div>
        <div className="rounded-md border border-arena-accent/50 px-2.5 py-0.5 font-display text-base text-arena-accent">
          OVR {ovr}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div
          className={`md:col-span-3 ${showProfile ? "block" : "hidden"} md:block`}
        >
          <PlayerProfile />
        </div>

        <div
          className={`md:col-span-6 ${showCourt ? "block" : "hidden"} md:block`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={viewKey}
              {...parentFade}
              className={isModalEvent ? "flex justify-center py-4" : undefined}
            >
              {useEventShell ? (
                <EventCard>{center}</EventCard>
              ) : isModalEvent ? (
                <motion.div {...childReveal} className="w-full max-w-lg">
                  {center}
                </motion.div>
              ) : (
                <motion.div {...childReveal} className="w-full">
                  {center}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div
          className={`md:col-span-3 ${showStandings ? "block" : "hidden"} md:block`}
        >
          <StandingsColumn />
        </div>
      </div>

      {/* Mobile bottom tabs — layout unchanged */}
      <nav className="sticky bottom-2 z-30 mt-4 flex shrink-0 items-stretch gap-1 rounded-xl border border-white/10 bg-arena-panel/95 p-1 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md md:hidden">
        {(
          [
            { id: "profile" as const, label: tr("nav.profile"), Icon: User },
            { id: "court" as const, label: tr("nav.court"), Icon: LayoutGrid },
            {
              id: "standings" as const,
              label: tr("nav.standings"),
              Icon: Trophy,
            },
          ] as const
        ).map(({ id, label, Icon }) => {
          const active = mobileTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMobileTab(id)}
              className={`flex flex-1 cursor-pointer flex-col items-center gap-0.5 rounded-lg px-2 py-2 ${
                active
                  ? "bg-arena-accent/15 text-arena-accent"
                  : "text-white/45 hover:text-white/70"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              <span className="font-sans text-[10px] font-medium uppercase tracking-wider">
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

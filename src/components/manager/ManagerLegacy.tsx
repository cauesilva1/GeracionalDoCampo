"use client";

import { Button } from "@/components/ui/Button";
import {
  useManagerActions,
  useManagerState,
} from "@/hooks/useManagerGame";
import { coachLegacyTheme } from "@/lib/manager/coachTheme";
import { emptyTrophyCabinet } from "@/lib/manager/legacy";
import { LEAGUES } from "@/lib/manager/clubs";

export function ManagerLegacy() {
  const { state } = useManagerState();
  const { tr, restart } = useManagerActions();
  const career = state.career!;
  const cabinet = career.trophyCabinet ?? emptyTrophyCabinet();
  const ovr = Math.round(career.ovr ?? career.reputation ?? 50);
  const tier = career.legacyTier ?? "prospect";
  const theme = coachLegacyTheme(tier);

  const stats: [string, number][] = [
    [tr("mgr.ovr"), ovr],
    [tr("mgr.legacy.leagueTitles"), cabinet.leagueTitles],
    [tr("mgr.legacy.topFlight"), cabinet.topFlightTitles],
    [tr("mgr.legacy.secondDiv"), cabinet.secondDivTitles],
    [tr("mgr.legacy.promotions"), cabinet.promotions],
    [tr("mgr.legacy.bigClub"), cabinet.bigClubTitles],
    [tr("mgr.legacy.wins"), career.careerWins ?? 0],
    [tr("mgr.legacy.seasons"), career.seasonsInCareer],
    [tr("mgr.legacy.clubs"), career.clubsManaged ?? 1],
  ];

  return (
    <div className="mx-auto max-w-lg px-4 py-8 text-center sm:py-12">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-arena-accent">
        {tr("mgr.legacy.eyebrow")}
      </p>
      <h2 className="mt-2 font-display text-3xl uppercase text-white sm:text-4xl">
        {tr("mgr.legacy.title")}
      </h2>
      <p className="mt-2 text-sm text-white/55">
        {career.endReason === "retired"
          ? tr("mgr.legacy.retired")
          : tr("mgr.legacy.fired")}
      </p>

      <div
        className="mt-6 rounded-sm border px-4 py-5"
        style={{
          borderColor: `${theme.accent}66`,
          background: `linear-gradient(160deg, ${theme.bg1}, ${theme.bg0})`,
          boxShadow: `0 0 28px ${theme.glow}`,
        }}
      >
        <p className="font-display text-2xl text-white">{career.coachName}</p>
        <p className="mt-1 font-mono text-[10px] uppercase text-white/50">
          {tr(`mgr.country.${career.country}`)} ·{" "}
          {tr(`mgr.origin.${career.origin ?? "assistant"}`)} ·{" "}
          {tr(`mgr.philosophy.${career.philosophy ?? "balanced"}`)}
        </p>
        <p
          className={`mt-4 font-display text-5xl sm:text-6xl ${theme.ovrClass}`}
          style={{ textShadow: `0 0 24px ${theme.glow}` }}
        >
          {ovr}
        </p>
        <p className="font-mono text-[10px] uppercase text-white/45">
          {tr("mgr.ovr")}
        </p>
        <p className={`mt-2 font-display text-lg uppercase ${theme.titleClass}`}>
          {tr(`mgr.legacy.tier.${tier}`)}
        </p>
        <p className="mt-1 text-xs text-white/50">
          {tr(`mgr.legacy.tier.${tier}.desc`)}
        </p>
        <p className="mt-2 font-mono text-[10px] text-white/40">
          {career.clubName} · {tr(LEAGUES[career.leagueId].nameKey)}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 text-left sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div
            key={label}
            className="rounded-sm border border-white/10 bg-black/30 px-3 py-2"
          >
            <p className="font-mono text-[9px] uppercase text-white/40">{label}</p>
            <p className="font-display text-xl text-white">{value}</p>
          </div>
        ))}
      </div>

      <Button className="mt-8 w-full sm:w-auto" onClick={restart}>
        {tr("mgr.restart")}
      </Button>
    </div>
  );
}

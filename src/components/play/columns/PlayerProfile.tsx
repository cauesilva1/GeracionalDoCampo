"use client";

import { useEffect } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { ScoutBar } from "@/components/play/ScoutBar";
import {
  ATTRS,
  EURO_OVR,
  NBA_DRAFT_MAX_AGE,
  NBA_DRAFT_MIN_SEASONS,
  NBA_DRAFT_OVR,
} from "@/lib/data";
import { completeStats } from "@/lib/progression";
import { injuryTier, streetRiskPct } from "@/lib/injury";
import { getLeague, liveStats } from "@/lib/simulation";
import { formatMoney } from "@/lib/utils";
import { useGameActions, useGameState } from "@/hooks/useGameSimulation";
import type { AttrKey } from "@/types/game";

const SHORT: Record<AttrKey, string> = {
  shot: "ARR",
  fin: "FIN",
  drb: "DRB",
  pass: "PAS",
  def: "DEF",
  reb: "REB",
  ath: "ATL",
  clu: "INS",
};

export function PlayerProfile() {
  const { state, ovr, marketValue, draftEligible } = useGameState();
  const { clearStatFlash, tr } = useGameActions();
  const career = state.career;
  const player = state.player;
  const flash = state.statFlash;

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(clearStatFlash, 2200);
    return () => clearTimeout(timer);
  }, [flash, clearStatFlash]);

  if (!career || !player) return null;

  const league = getLeague(career.leagueId);
  const s = career.lastSeason;
  const current = completeStats(liveStats(state));
  const max = completeStats(state.maxStats);

  return (
    <aside className="flex flex-col gap-2">
      <div className="shrink-0 rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-arena-panel p-3">
        <p className="font-sans text-[10px] font-medium uppercase tracking-widest text-white/40">
          {tr("dash.profile")}
        </p>
        <div className="mt-2 flex items-start gap-2">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-arena-accent/40 bg-arena-accent/10 font-display text-sm text-arena-accent">
            {career.clubName.slice(0, 3).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg uppercase leading-none text-white">
              {player.name}
            </h2>
            <p className="mt-0.5 font-sans text-[11px] text-white/50">
              {player.posId} · {career.clubName}
            </p>
            <p className="font-display text-sm text-arena-accent">
              OVR {ovr} · {career.age} {tr("dash.age")}
            </p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div className="rounded-lg border border-white/10 bg-arena-bg/40 px-2 py-1.5">
            <p className="font-sans text-[9px] font-medium uppercase tracking-wider text-white/40">
              {tr("dash.market")}
            </p>
            <p className="font-display text-sm text-white">
              {formatMoney(marketValue, league.currency)}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-arena-bg/40 px-2 py-1.5">
            <p className="font-sans text-[9px] font-medium uppercase tracking-wider text-white/40">
              {tr("dash.wallet")}
            </p>
            <p className="font-display text-sm text-white">
              {formatMoney(career.wallet ?? 0, career.contractCurrency ?? league.currency)}
            </p>
          </div>
        </div>
        {(career.annualSalary ?? 0) > 0 && (
          <div className="mt-1.5 rounded-lg border border-arena-accent/25 bg-arena-accent/5 px-2 py-1.5">
            <p className="font-sans text-[9px] font-medium uppercase tracking-wider text-white/40">
              {tr("dash.contract")}
            </p>
            <p className="font-display text-sm text-arena-accent">
              {formatMoney(
                career.annualSalary,
                career.contractCurrency ?? league.currency,
              )}
              <span className="font-sans text-[10px] font-medium text-white/40">
                {" "}
                {tr("dash.salary")}
              </span>
            </p>
            <p className="mt-0.5 font-sans text-[10px] text-white/45">
              {tr("dash.contractYears", {
                n: career.contractYearsRemaining ?? 0,
              })}
            </p>
          </div>
        )}
        {!career.inNba &&
          career.age <= NBA_DRAFT_MAX_AGE &&
          career.seasonsPlayed >= NBA_DRAFT_MIN_SEASONS - 1 && (
            <div className="mt-1.5 rounded-lg border border-white/10 bg-arena-bg/40 px-2 py-1.5">
              <p className="font-sans text-[9px] font-medium uppercase tracking-wider text-white/40">
                {draftEligible
                  ? tr("dash.eligibleDraft")
                  : tr("dash.draftProgress")}
              </p>
              <p className="mt-0.5 font-sans text-[10px] text-white/55">
                {tr("dash.draftNeed", {
                  ovr: NBA_DRAFT_OVR,
                  current: ovr,
                  age: NBA_DRAFT_MAX_AGE,
                  seasons: NBA_DRAFT_MIN_SEASONS,
                })}
              </p>
              <ScoutBar
                ovr={ovr}
                age={career.age}
                seasonsPlayed={career.seasonsPlayed}
              />
              {ovr < EURO_OVR && (
                <p className="mt-1 font-sans text-[9px] text-white/35">
                  {tr("dash.euroNeed", { ovr: EURO_OVR })}
                </p>
              )}
            </div>
          )}
        {career.rivalClubName && (
          <p className="mt-1.5 font-sans text-[10px] text-white/40">
            {tr("dash.rival")}:{" "}
            <span className="text-white/70">{career.rivalClubName}</span>
          </p>
        )}
        <div className="mt-1.5 rounded-lg border border-white/10 bg-arena-bg/40 px-2 py-1.5">
          <p className="font-sans text-[9px] font-medium uppercase tracking-wider text-white/40">
            {tr("dash.injury")}
          </p>
          <p className="mt-0.5 font-sans text-[11px] text-white/70">
            {tr(`dash.injury.${injuryTier(career.injuryRisk ?? 0.15)}`)}
            <span className="text-white/40">
              {" "}
              · {streetRiskPct(career.injuryRisk ?? 0.15)}%
            </span>
          </p>
          <p className="mt-0.5 font-sans text-[9px] text-white/35">
            {tr("dash.injury.hint")}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-arena-panel p-2.5">
        <p className="mb-2 font-sans text-[10px] font-medium uppercase tracking-widest text-white/40">
          {tr("dash.attrs")}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {ATTRS.map((a) => {
            const delta = flash?.[a.k];
            return (
              <div
                key={a.k}
                className="relative rounded-md border border-white/10 bg-arena-bg/50 px-2 py-1.5"
              >
                <div className="flex items-baseline justify-between gap-1">
                  <span className="font-sans text-[10px] font-medium uppercase tracking-wider text-white/45">
                    {SHORT[a.k]}
                  </span>
                  {delta !== undefined && delta !== 0 && (
                    <span
                      className={`animate-pulse font-sans text-[10px] font-semibold ${
                        delta > 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 font-display text-lg leading-none text-white">
                  {current[a.k]}
                  <span className="font-sans text-[11px] font-medium text-white/35">
                    {" "}
                    / {max[a.k]}
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {s && (
        <div className="shrink-0 rounded-xl border border-white/10 bg-arena-panel p-2.5">
          <p className="mb-1.5 font-sans text-[10px] font-medium uppercase tracking-widest text-white/40">
            {tr("dash.season")} {career.season}
          </p>
          <div className="grid grid-cols-4 gap-1">
            {[
              [tr("dash.ppg"), s.ppg, 1],
              [tr("dash.rpg"), s.rpg, 1],
              [tr("dash.apg"), s.apg, 1],
              [tr("dash.rating"), s.rating, 1],
            ].map(([label, val, dec]) => (
              <div key={String(label)} className="text-center">
                <div className="font-display text-sm text-white">
                  <CountUp target={Number(val)} decimals={Number(dec)} />
                </div>
                <div className="font-sans text-[8px] uppercase text-white/40">
                  {label}
                </div>
              </div>
            ))}
          </div>
          {(() => {
            const mods = career.seasonMods;
            const badges: { text: string; bad: boolean }[] = [];
            if (mods?.ppgPenalty)
              badges.push({
                text: `${mods.ppgPenalty > 0 ? "+" : ""}${mods.ppgPenalty} PPG`,
                bad: mods.ppgPenalty < 0,
              });
            if (mods?.gamesMissed)
              badges.push({
                text: `−${mods.gamesMissed} GP`,
                bad: true,
              });
            if (career.pendingGamesMissed)
              badges.push({
                text: tr("dash.pendingMiss", { n: career.pendingGamesMissed }),
                bad: true,
              });
            if (career.injuryShield)
              badges.push({ text: tr("dash.shield"), bad: false });
            if (!badges.length) return null;
            return (
              <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                {badges.map((b) => (
                  <span
                    key={b.text}
                    className={`rounded border px-1.5 py-0.5 font-sans text-[9px] font-semibold uppercase ${
                      b.bad
                        ? "animate-pulse border-red-400/50 text-red-300"
                        : "border-emerald-400/40 text-emerald-300"
                    }`}
                  >
                    {b.text}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </aside>
  );
}

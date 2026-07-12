"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useGameActions, useGameState } from "@/hooks/useGameSimulation";
import { springPremium } from "@/lib/motion";
import { getLeague } from "@/lib/simulation";
import { formatMoney } from "@/lib/utils";

/** Post-draft destination card — club is assigned before any mid-season event. */
export function JourneyKickoff() {
  const { state, ovr } = useGameState();
  const { launchSeason, tr } = useGameActions();
  const career = state.career;
  const player = state.player;
  if (!career || !player) return null;

  const league = getLeague(career.leagueId);
  const salary = formatMoney(
    career.annualSalary ?? 0,
    career.contractCurrency ?? league.currency,
  );

  return (
    <div className="w-full text-center">
      <p className="font-sans text-[10px] font-medium uppercase tracking-[0.3em] text-arena-accent">
        {tr("journey.eyebrow")}
      </p>
      <h3 className="mt-2 font-display text-2xl uppercase leading-tight text-white sm:text-3xl">
        {tr("journey.title")}
      </h3>
      <p className="mt-2 font-sans text-sm leading-relaxed text-white/55">
        {tr("journey.body", {
          club: career.clubName,
          league: tr(league.nameKey),
        })}
      </p>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springPremium}
        className="mt-4 rounded-xl border border-arena-accent/40 bg-arena-bg/50 px-4 py-4 text-left"
      >
        <p className="font-display text-2xl uppercase text-white">
          {career.clubName}
        </p>
        <p className="mt-0.5 font-sans text-xs text-white/45">
          {tr(league.nameKey)} ·{" "}
          {tr("journey.year", {
            season: career.season,
            year: career.calendarYear ?? 2016,
          })}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/10 px-2.5 py-2">
            <p className="font-display text-xl text-arena-accent">OVR {ovr}</p>
            <p className="text-[9px] uppercase text-white/40">
              {player.name} · {player.posId}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 px-2.5 py-2">
            <p className="font-display text-sm text-white">{salary}</p>
            <p className="text-[9px] uppercase text-white/40">
              {tr("journey.contract", {
                n: career.contractYearsRemaining ?? 0,
              })}
            </p>
          </div>
        </div>
        {career.rivalClubName && (
          <p className="mt-3 font-sans text-[11px] text-white/45">
            {tr("journey.rival", { rival: career.rivalClubName })}
          </p>
        )}
      </motion.div>

      <p className="mt-3 font-sans text-[11px] text-white/40">
        {tr("journey.hint")}
      </p>
      <Button className="mt-4 w-full justify-center" onClick={launchSeason}>
        {tr("journey.cta")}
      </Button>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ClubCrest } from "@/components/manager/ClubCrest";
import { useManagerActions } from "@/hooks/useManagerGame";
import {
  clubsByLeague,
  LEAGUES,
  startingLeagueForCountry,
} from "@/lib/manager/clubs";
import {
  COACH_ORIGINS,
  COACH_PHILOSOPHIES,
} from "@/lib/manager/legacy";
import type {
  ClubTemplate,
  CoachCountry,
  CoachOrigin,
  CoachPhilosophy,
} from "@/types/manager";

const COUNTRIES: CoachCountry[] = [
  "br",
  "en",
  "es",
  "pt",
  "fr",
  "it",
  "de",
  "ar",
];

type SpinPhase = "idle" | "spinning" | "landed";

export function ManagerSetup() {
  const { tr, chooseClub } = useManagerActions();
  const [country, setCountry] = useState<CoachCountry>("br");
  const [origin, setOrigin] = useState<CoachOrigin>("ex_player");
  const [philosophy, setPhilosophy] =
    useState<CoachPhilosophy>("possession");
  const [coachName, setCoachName] = useState("Técnico");
  const [spinPhase, setSpinPhase] = useState<SpinPhase>("idle");
  const [displayClub, setDisplayClub] = useState<ClubTemplate | null>(null);
  const [wonClub, setWonClub] = useState<ClubTemplate | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startLeague = startingLeagueForCountry(country);
  const clubs = useMemo(() => clubsByLeague(startLeague), [startLeague]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    setSpinPhase("idle");
    setDisplayClub(null);
    setWonClub(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [country]);

  const startSpin = () => {
    if (!clubs.length || spinPhase === "spinning" || spinPhase === "landed")
      return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setWonClub(null);
    setSpinPhase("spinning");

    const target = clubs[Math.floor(Math.random() * clubs.length)]!;
    let ticks = 0;
    const totalTicks = 28 + Math.floor(Math.random() * 10);
    let delay = 45;

    const tick = () => {
      setDisplayClub(clubs[ticks % clubs.length]!);
      ticks += 1;
      if (ticks >= totalTicks) {
        setDisplayClub(target);
        setWonClub(target);
        setSpinPhase("landed");
        return;
      }
      delay = Math.min(220, delay + (ticks > totalTicks - 10 ? 18 : 4));
      timerRef.current = setTimeout(tick, delay);
    };
    tick();
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-4 px-3 py-5 sm:px-4 lg:grid-cols-[1fr_280px]">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-arena-accent">
          {tr("brand.eyebrow")}
        </p>
        <h1 className="mt-1 font-display text-3xl uppercase text-white sm:text-4xl">
          {tr("mgr.setup.title")}
        </h1>
        <p className="mt-1 text-xs text-white/50">{tr("mgr.setup.leadCareer")}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="font-mono text-[9px] uppercase text-white/40">
              {tr("mgr.setup.coach")}
            </span>
            <input
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-arena-accent"
            />
          </label>
          <div>
            <p className="font-mono text-[9px] uppercase text-white/40">
              {tr("mgr.setup.pickCountry")} · {tr(LEAGUES[startLeague].nameKey)}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {COUNTRIES.map((id) => (
                <Button
                  key={id}
                  variant={country === id ? "chipActive" : "chip"}
                  className="!px-2 !py-1 text-[10px]"
                  onClick={() => setCountry(id)}
                  disabled={spinPhase !== "idle"}
                >
                  {tr(`mgr.country.${id}`)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[9px] uppercase text-white/40">
              {tr("mgr.setup.pickOrigin")}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {COACH_ORIGINS.map((id) => (
                <Button
                  key={id}
                  variant={origin === id ? "chipActive" : "chip"}
                  className="!px-2 !py-1 text-[10px]"
                  onClick={() => setOrigin(id)}
                  disabled={spinPhase === "spinning"}
                >
                  {tr(`mgr.origin.${id}`)}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase text-white/40">
              {tr("mgr.setup.pickPhilosophy")}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {COACH_PHILOSOPHIES.map((id) => (
                <Button
                  key={id}
                  variant={philosophy === id ? "chipActive" : "chip"}
                  className="!px-2 !py-1 text-[10px]"
                  onClick={() => setPhilosophy(id)}
                  disabled={spinPhase === "spinning"}
                >
                  {tr(`mgr.philosophy.${id}`)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <aside
        className={`flex flex-col items-center justify-center rounded-sm border px-3 py-5 text-center ${
          spinPhase === "landed"
            ? "border-arena-accent"
            : "border-white/15 bg-black/40"
        }`}
        style={
          displayClub
            ? {
                background: `linear-gradient(160deg, ${displayClub.colors.primary}40, #05150c 70%)`,
              }
            : undefined
        }
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
          {tr("mgr.setup.rouletteLead")}
        </p>
        {displayClub ? (
          <>
            <div className="mt-3">
              <ClubCrest
                club={displayClub}
                size={spinPhase === "landed" ? 88 : 72}
              />
            </div>
            <p className="mt-3 font-display text-xl uppercase text-white">
              {displayClub.name}
            </p>
            <p className="font-mono text-[9px] uppercase text-white/45">
              {displayClub.shortName} · {tr(`mgr.diff.${displayClub.difficulty}`)}
            </p>
          </>
        ) : (
          <p className="mt-6 font-display text-lg uppercase text-white/35">?</p>
        )}

        <div className="mt-4 w-full">
          {spinPhase === "idle" && (
            <Button className="w-full" onClick={startSpin}>
              {tr("mgr.setup.rouletteSpin")}
            </Button>
          )}
          {spinPhase === "spinning" && (
            <p className="font-mono text-[10px] uppercase text-arena-accent animate-pulse">
              {tr("mgr.setup.rouletteSpinning")}
            </p>
          )}
          {spinPhase === "landed" && wonClub && (
            <Button
              className="w-full"
              onClick={() =>
                chooseClub(country, wonClub.id, coachName, origin, philosophy)
              }
            >
              {tr("mgr.setup.start")}
            </Button>
          )}
        </div>
      </aside>
    </div>
  );
}

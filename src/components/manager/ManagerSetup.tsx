"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
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
    <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
      <div className="mb-4 flex items-center gap-3 sm:mb-5">
        <BrandLogo size={52} className="shrink-0 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]" />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-arena-accent">
            {tr("brand.eyebrow")}
          </p>
          <h1 className="font-display text-2xl uppercase leading-tight text-white sm:text-4xl">
            {tr("mgr.setup.title")}
          </h1>
          <p className="mt-0.5 text-xs text-white/50 sm:text-sm">
            {tr("mgr.setup.leadCareer")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Roulette first on mobile */}
        <aside
          className={`order-1 flex flex-col items-center justify-center rounded-md border px-4 py-6 text-center lg:order-2 ${
            spinPhase === "landed"
              ? "border-arena-accent shadow-[0_0_28px_rgba(232,197,71,0.18)]"
              : "border-white/12 bg-black/35"
          }`}
          style={
            displayClub
              ? {
                  background: `linear-gradient(165deg, ${displayClub.colors.primary}55, #05150c 68%)`,
                }
              : undefined
          }
        >
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">
            {tr("mgr.setup.rouletteLead")}
          </p>
          {displayClub ? (
            <>
              <div className="mt-4">
                <ClubCrest
                  club={displayClub}
                  size={spinPhase === "landed" ? 96 : 80}
                />
              </div>
              <p className="mt-3 font-display text-xl uppercase text-white sm:text-2xl">
                {displayClub.name}
              </p>
              <p className="font-mono text-[9px] uppercase text-white/45">
                {displayClub.shortName} ·{" "}
                {tr(`mgr.diff.${displayClub.difficulty}`)}
              </p>
            </>
          ) : (
            <div className="mt-6 flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-white/20">
              <p className="font-display text-3xl uppercase text-white/30">?</p>
            </div>
          )}

          <div className="mt-5 w-full max-w-xs">
            {spinPhase === "idle" && (
              <Button className="w-full" onClick={startSpin}>
                {tr("mgr.setup.rouletteSpin")}
              </Button>
            )}
            {spinPhase === "spinning" && (
              <p className="animate-pulse font-mono text-[10px] uppercase text-arena-accent">
                {tr("mgr.setup.rouletteSpinning")}
              </p>
            )}
            {spinPhase === "landed" && wonClub && (
              <Button
                className="w-full"
                onClick={() =>
                  chooseClub(
                    country,
                    wonClub.id,
                    coachName,
                    origin,
                    philosophy,
                  )
                }
              >
                {tr("mgr.setup.start")}
              </Button>
            )}
          </div>
        </aside>

        <div className="order-2 space-y-4 rounded-md border border-white/10 bg-black/25 p-3 sm:p-4 lg:order-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="font-mono text-[9px] uppercase text-white/40">
                {tr("mgr.setup.coach")}
              </span>
              <input
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                className="mt-1 w-full rounded-sm border border-white/15 bg-black/40 px-2.5 py-2 text-sm text-white outline-none focus:border-arena-accent"
              />
            </label>
            <div>
              <p className="font-mono text-[9px] uppercase text-white/40">
                {tr("mgr.setup.pickCountry")} ·{" "}
                {tr(LEAGUES[startLeague].nameKey)}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="font-mono text-[9px] uppercase text-white/40">
                {tr("mgr.setup.pickOrigin")}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
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
              <div className="mt-1.5 flex flex-wrap gap-1">
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
      </div>
    </div>
  );
}

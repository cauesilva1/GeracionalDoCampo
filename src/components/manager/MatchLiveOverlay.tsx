"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getClub } from "@/lib/manager/clubs";
import {
  formationSlots,
  jitter,
  mirrorAway,
  type PitchXY,
} from "@/lib/manager/matchPitch";
import type {
  FormationId,
  MatchResult,
  SquadPlayer,
  TacticStyle,
  TacticsState,
} from "@/types/manager";

type Tr = (key: string, vars?: Record<string, string | number>) => string;

/** ~14s to 90' — readable pace */
const TICK_MS = 155;
const MAX_MIN = 90;
/** Move dots every N minutes, gently */
const MOVE_EVERY = 3;

type Dot = {
  id: string;
  name: string;
  side: "home" | "away";
  user: boolean;
  base: PitchXY;
  xy: PitchXY;
  fatigue: number;
  rating: number;
  ovr: number;
};

function buildDots(
  match: MatchResult,
  clubId: string,
  squad: SquadPlayer[],
  starters: string[],
  formation: FormationId,
  oppSquad: SquadPlayer[],
): Dot[] {
  const slots = formationSlots(formation);
  const userHome = match.homeId === clubId;
  const dots: Dot[] = [];

  starters.slice(0, 11).forEach((id, i) => {
    const p = squad.find((s) => s.id === id);
    if (!p) return;
    const slot = slots[i] ?? { x: 50, y: 50 };
    const base = userHome ? slot : mirrorAway(slot);
    dots.push({
      id: p.id,
      name: p.name,
      side: userHome ? "home" : "away",
      user: true,
      base,
      xy: { ...base },
      fatigue: p.fitness,
      rating: 6.2 + (p.ovr - 70) * 0.04,
      ovr: p.ovr,
    });
  });

  const oppTop = [...oppSquad].sort((a, b) => b.ovr - a.ovr).slice(0, 11);
  oppTop.forEach((p, i) => {
    const slot = slots[i] ?? { x: 50, y: 50 };
    const base = userHome ? mirrorAway(slot) : slot;
    dots.push({
      id: `opp-${p.id}`,
      name: p.name,
      side: userHome ? "away" : "home",
      user: false,
      base,
      xy: { ...base },
      fatigue: 88,
      rating: 6.0,
      ovr: p.ovr,
    });
  });

  return dots;
}

export function MatchLiveOverlay({
  match,
  clubId,
  squad,
  starters,
  bench,
  tactics,
  oppSquad,
  important,
  tr,
  onDone,
}: {
  match: MatchResult;
  clubId: string;
  squad: SquadPlayer[];
  starters: string[];
  bench: string[];
  tactics: TacticsState;
  oppSquad: SquadPlayer[];
  important: boolean;
  tr: Tr;
  onDone: (override?: { homeGoals: number; awayGoals: number }) => void;
}) {
  const [minute, setMinute] = useState(0);
  const [homeGoals, setHomeGoals] = useState(0);
  const [awayGoals, setAwayGoals] = useState(0);
  const [feed, setFeed] = useState<string[]>([]);
  const [formation, setFormation] = useState<FormationId>(tactics.formation);
  const [style, setStyle] = useState<TacticStyle>(tactics.style);
  const [boardOpen, setBoardOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [momentum, setMomentum] = useState(0);
  const [xi, setXi] = useState<string[]>(() => starters.slice(0, 11));
  const [dots, setDots] = useState<Dot[]>(() =>
    buildDots(match, clubId, squad, starters, tactics.formation, oppSquad),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subOutId, setSubOutId] = useState<string | null>(null);
  const [scoreMod, setScoreMod] = useState<"none" | "extra" | "drop">("none");

  const clockStopRef = useRef(false);
  const appliedRef = useRef(new Set<number>());
  const pausedRef = useRef(false);

  const home = getClub(match.homeId);
  const away = getClub(match.awayId);
  const userHome = match.homeId === clubId;
  const userColor = userHome
    ? (home?.colors.primary ?? "#e8c547")
    : (away?.colors.primary ?? "#e8c547");
  const oppColor = userHome
    ? (away?.colors.primary ?? "#7dd3fc")
    : (home?.colors.primary ?? "#7dd3fc");

  const goals = useMemo(() => {
    let base = match.events.filter((e) => e.kind === "goal");
    if (scoreMod === "extra") {
      base = [
        ...base,
        {
          minute: 84,
          kind: "goal" as const,
          clubId,
          textKey: "mgr.event.goal",
          playerName: tr("mgr.live.tacticalGoal"),
        },
      ].sort((a, b) => a.minute - b.minute);
    }
    if (scoreMod === "drop") {
      const filtered = base.filter(
        (g) => !(g.clubId === clubId && g.minute >= 70),
      );
      if (filtered.length) base = filtered;
    }
    return base;
  }, [match.events, clubId, tr, scoreMod]);

  const finalScore = useMemo(() => {
    let h = 0;
    let a = 0;
    for (const g of goals) {
      if (g.clubId === match.homeId) h++;
      else a++;
    }
    if (goals.length === 0) {
      return { h: match.homeGoals, a: match.awayGoals };
    }
    return { h, a };
  }, [goals, match.homeId, match.homeGoals, match.awayGoals]);

  useEffect(() => {
    pausedRef.current = boardOpen || finished;
  }, [boardOpen, finished]);

  // Clock
  useEffect(() => {
    clockStopRef.current = false;
    appliedRef.current = new Set();
    setMinute(0);
    setHomeGoals(0);
    setAwayGoals(0);
    setFeed([]);
    setBoardOpen(false);
    setFinished(false);
    setMomentum(0);
    setScoreMod("none");
    setSubOutId(null);

    const id = window.setInterval(() => {
      if (pausedRef.current || clockStopRef.current) return;
      setMinute((m) => {
        if (m >= MAX_MIN) return MAX_MIN;
        return m + 1;
      });
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [match.fixtureId]);

  // Gentle movement + fatigue
  useEffect(() => {
    if (boardOpen || finished || minute <= 0) return;

    setDots((prev) =>
      prev.map((d) => {
        const press =
          style === "pressing" ? 0.35 : style === "direct" ? 0.22 : 0.16;
        const fatigue = Math.max(
          22,
          d.fatigue - (d.user ? press : 0.12) - (minute > 70 ? 0.08 : 0),
        );
        let rating = d.rating;
        if (fatigue < 45 && d.user) rating -= 0.02;
        if (fatigue > 70 && d.user && minute % 10 === 0) rating += 0.04;

        const shouldMove = minute % MOVE_EVERY === 0;
        return {
          ...d,
          fatigue,
          rating: Math.max(4.5, Math.min(9.8, rating)),
          xy: shouldMove ? jitter(d.base, fatigue < 40 ? 0.6 : 1.1) : d.xy,
        };
      }),
    );
  }, [minute, boardOpen, finished, style]);

  // Goals + full time
  useEffect(() => {
    for (let i = 0; i < goals.length; i++) {
      const g = goals[i]!;
      if (g.minute > minute || appliedRef.current.has(i)) continue;
      appliedRef.current.add(i);
      const scorer = g.playerName ?? tr(g.textKey);
      if (g.clubId === match.homeId) setHomeGoals((n) => n + 1);
      else setAwayGoals((n) => n + 1);
      setFeed((f) =>
        [`${g.minute}' · ${tr("mgr.event.goal")} · ${scorer}`, ...f].slice(0, 5),
      );
      if (g.clubId === clubId) {
        setDots((prev) => {
          const users = prev.filter((d) => d.user);
          const pick = users[Math.floor(Math.random() * users.length)];
          if (!pick) return prev;
          return prev.map((d) =>
            d.id === pick.id
              ? { ...d, rating: Math.min(9.9, d.rating + 0.55) }
              : d,
          );
        });
      }
    }

    if (minute >= MAX_MIN && !finished) {
      clockStopRef.current = true;
      setHomeGoals(finalScore.h);
      setAwayGoals(finalScore.a);
      setFinished(true);
      setBoardOpen(false);
    }
  }, [
    minute,
    goals,
    match.homeId,
    tr,
    clubId,
    finished,
    finalScore.h,
    finalScore.a,
  ]);

  useEffect(() => {
    if (scoreMod !== "none") return;
    if (momentum >= 0.4) setScoreMod("extra");
    else if (momentum <= -0.25) setScoreMod("drop");
  }, [momentum, scoreMod]);

  const applyFormation = (f: FormationId) => {
    setFormation(f);
    const slots = formationSlots(f);
    setDots((prev) => {
      let ui = 0;
      let oi = 0;
      return prev.map((d) => {
        if (d.user) {
          const slot = slots[ui++] ?? d.base;
          const base = userHome ? slot : mirrorAway(slot);
          return { ...d, base, xy: { ...base } };
        }
        const slot = slots[oi++] ?? d.base;
        const base = userHome ? mirrorAway(slot) : slot;
        return { ...d, base, xy: { ...base } };
      });
    });
    setMomentum((m) => m + 0.12);
    setFeed((prev) =>
      [`${minute}' · ${tr("mgr.live.changedFormation", { f })}`, ...prev].slice(
        0,
        5,
      ),
    );
  };

  const applyStyle = (s: TacticStyle) => {
    setStyle(s);
    const losing = userHome ? homeGoals < awayGoals : awayGoals < homeGoals;
    setMomentum(
      (m) => m + (s === "pressing" && losing ? 0.22 : 0.1),
    );
    setFeed((f) =>
      [
        `${minute}' · ${tr("mgr.live.changedStyle", { s: tr(`mgr.style.${s}`) })}`,
        ...f,
      ].slice(0, 5),
    );
  };

  const applySub = (outId: string, inId: string) => {
    const fresh = squad.find((p) => p.id === inId);
    const outDot = dots.find((d) => d.id === outId);
    if (!fresh || !outDot) return;
    setXi((prev) => prev.map((id) => (id === outId ? fresh.id : id)));
    setDots((prev) =>
      prev.map((d) =>
        d.id === outId
          ? {
              ...d,
              id: fresh.id,
              name: fresh.name,
              fatigue: Math.min(100, fresh.fitness + 8),
              rating: 6.3,
              ovr: fresh.ovr,
            }
          : d,
      ),
    );
    setMomentum((m) => m + 0.28);
    setFeed((f) =>
      [
        `${minute}' · ${tr("mgr.live.subDone", {
          out: outDot.name,
          inn: fresh.name,
        })}`,
        ...f,
      ].slice(0, 5),
    );
    setSubOutId(null);
    setSelectedId(fresh.id);
  };

  const jumpToEnd = () => {
    clockStopRef.current = true;
    setMinute(MAX_MIN);
    setHomeGoals(finalScore.h);
    setAwayGoals(finalScore.a);
    setBoardOpen(false);
    setFinished(true);
  };

  const confirmFinish = () => {
    const changed =
      finalScore.h !== match.homeGoals || finalScore.a !== match.awayGoals
        ? { homeGoals: finalScore.h, awayGoals: finalScore.a }
        : undefined;
    onDone(changed);
  };

  const openBoard = () => {
    if (finished) return;
    setBoardOpen(true);
  };

  const closeBoard = () => {
    setBoardOpen(false);
    setSubOutId(null);
  };

  const userDots = dots
    .filter((d) => d.user)
    .sort((a, b) => b.rating - a.rating);
  const benchPlayers = squad.filter(
    (p) => !xi.includes(p.id) && p.injuredWeeks <= 0,
  );
  const selected = dots.find((d) => d.id === selectedId);
  const ug = userHome ? homeGoals : awayGoals;
  const og = userHome ? awayGoals : homeGoals;

  return (
    <div className="absolute inset-0 z-30 flex items-stretch justify-center overflow-y-auto bg-arena-bg/96 px-2 py-2 backdrop-blur-md sm:px-4 sm:py-4">
      <div className="flex w-full max-w-4xl flex-col gap-2 lg:flex-row lg:items-start lg:gap-3">
        {/* Score + actions first so mobile doesn't bury buttons */}
        <div className="order-1 min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2 rounded-sm border border-white/10 bg-black/50 px-2.5 py-2">
            <p className="min-w-0 truncate font-display text-sm uppercase text-white sm:text-base">
              {home?.shortName}{" "}
              <span className="text-arena-accent">
                {homeGoals}–{awayGoals}
              </span>{" "}
              {away?.shortName}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              {important && (
                <span className="hidden font-mono text-[8px] uppercase tracking-wider text-arena-buzzer sm:inline">
                  {tr("mgr.live.important")}
                </span>
              )}
              <span className="font-mono text-lg tabular-nums text-arena-accent sm:text-xl">
                {finished ? "FT" : `${minute}'`}
              </span>
            </div>
          </div>

          {/* Pitch + compact feed side-by-side on phone */}
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-2 lg:grid-cols-1">
            <div className="mx-auto w-full max-w-[200px] sm:max-w-[280px] lg:max-w-[300px]">
              <div
                className="relative aspect-[68/105] overflow-hidden rounded-md shadow-[0_8px_28px_rgba(0,0,0,0.5)] ring-1 ring-white/20"
                style={{
                  background: `
                  repeating-linear-gradient(
                    90deg,
                    #1f6b38 0px,
                    #1f6b38 18px,
                    #246f3d 18px,
                    #246f3d 36px
                  )
                `,
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)",
                  }}
                />

                <div className="pointer-events-none absolute inset-[4.5%] border border-white/55">
                  <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/55" />
                  <div className="absolute left-1/2 top-1/2 h-[16%] w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/55" />
                  <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
                  <div className="absolute left-[18%] right-[18%] top-0 h-[12%] border border-t-0 border-white/55" />
                  <div className="absolute left-[32%] right-[32%] top-0 h-[5%] border border-t-0 border-white/45" />
                  <div className="absolute bottom-0 left-[18%] right-[18%] h-[12%] border border-b-0 border-white/55" />
                  <div className="absolute bottom-0 left-[32%] right-[32%] h-[5%] border border-b-0 border-white/45" />
                </div>

                {dots.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    title={`${d.name} · ${d.rating.toFixed(1)}`}
                    onClick={() => d.user && setSelectedId(d.id)}
                    className={`absolute z-[1] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-[left,top,transform] duration-700 ease-in-out ${
                      selectedId === d.id ? "z-10 scale-125" : ""
                    }`}
                    style={{
                      left: `${d.xy.x}%`,
                      top: `${100 - d.xy.y}%`,
                      width: d.user ? 10 : 8,
                      height: d.user ? 10 : 8,
                      backgroundColor: d.user ? userColor : oppColor,
                      borderColor:
                        selectedId === d.id ? "#fff" : "rgba(255,255,255,0.75)",
                      opacity: d.fatigue < 40 ? 0.55 : 0.95,
                      boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
                    }}
                  />
                ))}

                {finished && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
                    <div className="mx-2 rounded-sm border border-arena-accent/50 bg-arena-panel/95 px-3 py-3 text-center">
                      <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-arena-accent">
                        {tr("mgr.live.fullTime")}
                      </p>
                      <p className="mt-0.5 font-display text-xl text-white">
                        {homeGoals}–{awayGoals}
                      </p>
                      <Button
                        className="mt-2 w-full !py-1.5 text-[11px]"
                        onClick={confirmFinish}
                      >
                        {tr("mgr.live.finish")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-arena-accent transition-[width] duration-150 ease-linear"
                  style={{ width: `${(minute / MAX_MIN) * 100}%` }}
                />
              </div>
            </div>

            {/* Mobile-first controls beside pitch */}
            <div className="flex min-w-0 flex-col gap-1.5 lg:hidden">
              <div className="rounded-sm border border-white/10 bg-black/40 p-2">
                <p className="font-mono text-[8px] uppercase text-white/40">
                  {tr("mgr.live.feed")}
                </p>
                <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto">
                  {feed.length === 0 && (
                    <li className="text-[10px] text-white/35">
                      {tr("mgr.live.kickoff")}
                    </li>
                  )}
                  {feed.slice(0, 4).map((line, i) => (
                    <li
                      key={`${line}-${i}`}
                      className="border-l-2 border-arena-accent/60 pl-1.5 font-mono text-[9px] text-white/75"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
                <p className="mt-1 font-mono text-[8px] text-white/35">
                  {formation} · {tr(`mgr.style.${style}`)}
                </p>
              </div>

              {!finished ? (
                <div className="flex flex-col gap-1">
                  <Button
                    className="w-full !py-2 text-[11px]"
                    onClick={openBoard}
                  >
                    {tr("mgr.live.tacticsBtn")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full !py-1.5 text-[10px]"
                    onClick={jumpToEnd}
                  >
                    {tr("mgr.live.skip")}
                  </Button>
                </div>
              ) : (
                <Button className="w-full !py-2 text-[11px]" onClick={confirmFinish}>
                  {tr("mgr.live.finish")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop / tablet side panel */}
        <div className="order-2 hidden w-full flex-col gap-2 lg:flex lg:w-72 lg:shrink-0">
          <div className="rounded-sm border border-white/10 bg-black/40 p-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
              {tr("mgr.live.onPitch")}
            </p>
            <ul className="mt-1.5 max-h-48 space-y-1 overflow-y-auto">
              {userDots.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(d.id)}
                    className={`flex w-full items-center gap-2 px-1 py-0.5 text-left text-[11px] ${
                      selectedId === d.id ? "bg-arena-accent/15" : ""
                    }`}
                  >
                    <span className="w-7 font-display text-arena-accent">
                      {d.rating.toFixed(1)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-white/85">
                      {d.name}
                    </span>
                    <span
                      className={`w-10 text-right font-mono text-[9px] ${
                        d.fatigue < 40
                          ? "text-arena-buzzer"
                          : d.fatigue < 60
                            ? "text-amber-300"
                            : "text-white/40"
                      }`}
                    >
                      {Math.round(d.fatigue)}%
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {selected && (
              <p className="mt-2 border-t border-white/10 pt-2 text-[10px] text-white/50">
                {selected.name}: {tr("mgr.live.rating")}{" "}
                <span className="text-arena-accent">
                  {selected.rating.toFixed(1)}
                </span>{" "}
                · {tr("mgr.live.fatigue")} {Math.round(selected.fatigue)}%
              </p>
            )}
          </div>

          <div className="rounded-sm border border-white/10 bg-black/40 p-2.5">
            <p className="font-mono text-[9px] uppercase text-white/40">
              {tr("mgr.live.feed")}
            </p>
            <ul className="mt-1 min-h-[3.5rem] space-y-1">
              {feed.length === 0 && (
                <li className="text-[11px] text-white/35">
                  {tr("mgr.live.kickoff")}
                </li>
              )}
              {feed.map((line, i) => (
                <li
                  key={`${line}-${i}`}
                  className="border-l-2 border-arena-accent/60 pl-2 font-mono text-[10px] text-white/75"
                >
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-2 font-mono text-[9px] text-white/35">
              {formation} · {tr(`mgr.style.${style}`)} · {ug}-{og}
            </p>
          </div>

          {!finished ? (
            <div className="flex flex-col gap-1.5">
              <Button className="w-full !py-2 text-[12px]" onClick={openBoard}>
                {tr("mgr.live.tacticsBtn")}
              </Button>
              <Button
                variant="ghost"
                className="w-full !py-1.5 text-[11px]"
                onClick={jumpToEnd}
              >
                {tr("mgr.live.skip")}
              </Button>
            </div>
          ) : (
            <Button className="w-full !py-2.5" onClick={confirmFinish}>
              {tr("mgr.live.finish")}
            </Button>
          )}
        </div>
      </div>

      {/* Manual tactics board */}
      {boardOpen && !finished && (
        <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/60 px-3 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:pb-0">
          <div className="w-full max-w-md rounded-sm border border-arena-accent/45 bg-arena-panel p-4 shadow-2xl sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-arena-accent">
                  {tr("mgr.live.dec.badge")} · {minute}&apos;
                </p>
                <h3 className="mt-0.5 font-display text-xl uppercase text-white">
                  {tr("mgr.live.board.title")}
                </h3>
              </div>
              <Button
                variant="ghost"
                className="!px-2 !py-1 text-[10px]"
                onClick={closeBoard}
              >
                {tr("mgr.live.resume")}
              </Button>
            </div>

            <p className="mt-3 font-mono text-[9px] uppercase text-white/40">
              {tr("mgr.formation")}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {(["433", "442", "352", "4231"] as FormationId[]).map((f) => (
                <Button
                  key={f}
                  variant={formation === f ? "chipActive" : "chip"}
                  className="!px-2 !py-1 text-[10px]"
                  onClick={() => applyFormation(f)}
                >
                  {f === "433"
                    ? "4-3-3"
                    : f === "442"
                      ? "4-4-2"
                      : f === "352"
                        ? "3-5-2"
                        : "4-2-3-1"}
                </Button>
              ))}
            </div>

            <p className="mt-3 font-mono text-[9px] uppercase text-white/40">
              {tr("mgr.style")}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {(["possession", "direct", "pressing"] as TacticStyle[]).map(
                (s) => (
                  <Button
                    key={s}
                    variant={style === s ? "chipActive" : "chip"}
                    className="!px-2 !py-1 text-[10px]"
                    onClick={() => applyStyle(s)}
                  >
                    {tr(`mgr.style.${s}`)}
                  </Button>
                ),
              )}
            </div>

            <p className="mt-3 font-mono text-[9px] uppercase text-white/40">
              {tr("mgr.live.makeSub")}
            </p>
            <p className="mt-0.5 text-[10px] text-white/45">
              {tr("mgr.live.subHint")}
            </p>
            <div className="mt-2 grid max-h-36 grid-cols-2 gap-2 overflow-y-auto">
              <div>
                <p className="mb-1 font-mono text-[8px] uppercase text-white/35">
                  {tr("mgr.live.subOut")}
                </p>
                {userDots.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSubOutId(d.id)}
                    className={`mb-0.5 block w-full truncate px-1.5 py-1 text-left text-[10px] ${
                      subOutId === d.id
                        ? "bg-arena-buzzer/25 text-white"
                        : "text-white/70 hover:bg-white/5"
                    }`}
                  >
                    {d.name} · {Math.round(d.fatigue)}%
                  </button>
                ))}
              </div>
              <div>
                <p className="mb-1 font-mono text-[8px] uppercase text-white/35">
                  {tr("mgr.live.subIn")}
                </p>
                {benchPlayers.length === 0 && (
                  <p className="text-[10px] text-white/35">—</p>
                )}
                {benchPlayers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!subOutId}
                    onClick={() => subOutId && applySub(subOutId, p.id)}
                    className="mb-0.5 block w-full truncate px-1.5 py-1 text-left text-[10px] text-white/70 hover:bg-white/5 disabled:opacity-30"
                  >
                    {p.name} · {p.ovr}
                  </button>
                ))}
              </div>
            </div>

            <Button className="mt-4 w-full" onClick={closeBoard}>
              {tr("mgr.live.resume")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

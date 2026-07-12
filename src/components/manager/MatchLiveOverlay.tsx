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

const TICK_MS = 70;
const MAX_MIN = 90;

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

type DecisionKind = "sub" | "formation" | "style" | "push";

type Decision = {
  id: string;
  kind: DecisionKind;
  titleKey: string;
  bodyKey: string;
  name?: string;
  outId?: string;
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
  const [paused, setPaused] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [momentum, setMomentum] = useState(0);
  const [xi, setXi] = useState<string[]>(() => starters.slice(0, 11));
  const [dots, setDots] = useState<Dot[]>(() =>
    buildDots(match, clubId, squad, starters, tactics.formation, oppSquad),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [scoreMod, setScoreMod] = useState<"none" | "extra" | "drop">("none");

  const doneRef = useRef(false);
  const appliedRef = useRef(new Set<number>());
  const decisionsFired = useRef(new Set<string>());
  const pausedRef = useRef(false);

  const home = getClub(match.homeId);
  const away = getClub(match.awayId);
  const userHome = match.homeId === clubId;

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

  const finalHome = useMemo(() => {
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
    pausedRef.current = paused || !!decision;
  }, [paused, decision]);

  // Clock
  useEffect(() => {
    doneRef.current = false;
    appliedRef.current = new Set();
    decisionsFired.current = new Set();
    setMinute(0);
    setHomeGoals(0);
    setAwayGoals(0);
    setFeed([]);
    setPaused(false);
    setDecision(null);
    setMomentum(0);
    setScoreMod("none");

    const id = window.setInterval(() => {
      if (pausedRef.current || doneRef.current) return;
      setMinute((m) => (m >= MAX_MIN ? MAX_MIN : m + 1));
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [match.fixtureId]);

  // Animate dots + fatigue each minute
  useEffect(() => {
    if (paused || decision || minute <= 0) return;

    setDots((prev) =>
      prev.map((d) => {
        const press = style === "pressing" ? 0.55 : style === "direct" ? 0.35 : 0.28;
        const fatigue = Math.max(
          18,
          d.fatigue - (d.user ? press : 0.22) - (minute > 70 ? 0.15 : 0),
        );
        let rating = d.rating;
        if (fatigue < 45 && d.user) rating -= 0.03;
        if (fatigue > 70 && d.user && Math.random() < 0.08) rating += 0.05;
        const amp = fatigue < 40 ? 1.1 : 2.4;
        return {
          ...d,
          fatigue,
          rating: Math.max(4.5, Math.min(9.8, rating)),
          xy: jitter(d.base, amp),
        };
      }),
    );
  }, [minute, paused, decision, style]);

  // Goals + decisions + end
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
      // Boost rating of a random user attacker on our goal
      if (g.clubId === clubId) {
        setDots((prev) => {
          const users = prev.filter((d) => d.user);
          const pick = users[Math.floor(Math.random() * users.length)];
          if (!pick) return prev;
          return prev.map((d) =>
            d.id === pick.id
              ? { ...d, rating: Math.min(9.9, d.rating + 0.6) }
              : d,
          );
        });
      }
    }

    // Spawn tactical decision cards
    const tryDecision = (key: string, d: Decision) => {
      if (decisionsFired.current.has(key)) return;
      decisionsFired.current.add(key);
      setDecision(d);
      setPaused(true);
    };

    const ug = userHome ? homeGoals : awayGoals;
    const og = userHome ? awayGoals : homeGoals;
    const losing = ug < og;
    const drawing = ug === og;

    if (minute === 28 && important) {
      tryDecision("form28", {
        id: "form28",
        kind: "formation",
        titleKey: "mgr.live.dec.formation.title",
        bodyKey: "mgr.live.dec.formation.body",
      });
    }

    if (minute === 55 && (important || losing)) {
      tryDecision("style55", {
        id: "style55",
        kind: "style",
        titleKey: "mgr.live.dec.style.title",
        bodyKey: losing
          ? "mgr.live.dec.style.bodyLose"
          : "mgr.live.dec.style.body",
      });
    }

    if (minute === 62 || minute === 75) {
      const tired = dots
        .filter((d) => d.user)
        .sort((a, b) => a.fatigue - b.fatigue)[0];
      if (tired && tired.fatigue < 52 && (important || losing || drawing)) {
        tryDecision(`sub-${minute}`, {
          id: `sub-${minute}`,
          kind: "sub",
          titleKey: "mgr.live.dec.sub.title",
          bodyKey: "mgr.live.dec.sub.body",
          name: tired.name,
          outId: tired.id,
        });
      }
    }

    if (minute === 70 && important && (losing || drawing)) {
      tryDecision("push70", {
        id: "push70",
        kind: "push",
        titleKey: "mgr.live.dec.push.title",
        bodyKey: "mgr.live.dec.push.body",
      });
    }

    if (minute >= MAX_MIN && !doneRef.current && !decision) {
      doneRef.current = true;
      const h = finalHome.h;
      const a = finalHome.a;
      setHomeGoals(h);
      setAwayGoals(a);
      const t = window.setTimeout(() => {
        const changed =
          h !== match.homeGoals || a !== match.awayGoals
            ? { homeGoals: h, awayGoals: a }
            : undefined;
        onDone(changed);
      }, 1100);
      return () => window.clearTimeout(t);
    }
  }, [
    minute,
    goals,
    match,
    onDone,
    tr,
    important,
    userHome,
    homeGoals,
    awayGoals,
    dots,
    decision,
    clubId,
    finalHome,
  ]);

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
      [`${minute}' · ${tr("mgr.live.changedFormation", { f })}`, ...prev].slice(0, 5),
    );
  };

  const resolveDecision = (choice: string) => {
    if (!decision) return;

    if (decision.kind === "formation") {
      if (choice === "433" || choice === "442" || choice === "352" || choice === "4231") {
        applyFormation(choice);
      } else if (choice === "keep") {
        setMomentum((m) => m + 0.02);
      }
    }

    if (decision.kind === "style") {
      if (choice === "pressing" || choice === "direct" || choice === "possession") {
        setStyle(choice);
        setMomentum((m) => m + (choice === "pressing" && (userHome ? homeGoals < awayGoals : awayGoals < homeGoals) ? 0.22 : 0.1));
        setFeed((f) =>
          [`${minute}' · ${tr("mgr.live.changedStyle", { s: tr(`mgr.style.${choice}`) })}`, ...f].slice(
            0,
            5,
          ),
        );
      }
    }

    if (decision.kind === "sub" && decision.outId) {
      if (choice === "sub") {
        const outId = decision.outId;
        const benchIds = bench.filter((id) => !xi.includes(id));
        const fresh = benchIds
          .map((id) => squad.find((p) => p.id === id))
          .filter(Boolean)
          .sort((a, b) => (b!.fitness + b!.ovr) - (a!.fitness + a!.ovr))[0];
        if (fresh) {
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
                out: decision.name ?? "",
                inn: fresh.name,
              })}`,
              ...f,
            ].slice(0, 5),
          );
        }
      } else {
        setMomentum((m) => m - 0.08);
      }
    }

    if (decision.kind === "push") {
      if (choice === "allin") {
        setStyle("pressing");
        setMomentum((m) => m + 0.35);
        setFeed((f) => [`${minute}' · ${tr("mgr.live.allIn")}`, ...f].slice(0, 5));
      } else if (choice === "hold") {
        setStyle("possession");
        setMomentum((m) => m + 0.05);
      }
    }

    setDecision(null);
    setPaused(false);
  };

  // Promote good tactics into a late goal / punish bad ones
  useEffect(() => {
    if (scoreMod !== "none") return;
    if (momentum >= 0.4) setScoreMod("extra");
    else if (momentum <= -0.25) setScoreMod("drop");
  }, [momentum, scoreMod]);

  const skip = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDecision(null);
    setPaused(false);
    const h = finalHome.h;
    const a = finalHome.a;
    setMinute(MAX_MIN);
    setHomeGoals(h);
    setAwayGoals(a);
    const changed =
      h !== match.homeGoals || a !== match.awayGoals
        ? { homeGoals: h, awayGoals: a }
        : undefined;
    onDone(changed);
  };

  const userDots = dots.filter((d) => d.user).sort((a, b) => b.rating - a.rating);
  const selected = dots.find((d) => d.id === selectedId);
  const ug = userHome ? homeGoals : awayGoals;
  const og = userHome ? awayGoals : homeGoals;

  return (
    <div className="absolute inset-0 z-30 flex items-stretch justify-center overflow-y-auto bg-arena-bg/95 px-2 py-3 backdrop-blur-md sm:px-4 sm:py-6">
      <div className="flex w-full max-w-5xl flex-col gap-3 lg:flex-row">
        {/* Pitch column */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 border border-white/10 bg-black/40 px-3 py-2">
            <p className="truncate font-display text-sm uppercase text-white sm:text-base">
              {home?.shortName}{" "}
              <span className="text-arena-accent">
                {homeGoals}–{awayGoals}
              </span>{" "}
              {away?.shortName}
            </p>
            <div className="flex items-center gap-2">
              {important && (
                <span className="font-mono text-[8px] uppercase tracking-wider text-arena-buzzer">
                  {tr("mgr.live.important")}
                </span>
              )}
              <span className="font-mono text-xl tabular-nums text-arena-accent">
                {minute}&apos;
              </span>
            </div>
          </div>

          <div
            className="relative mt-2 aspect-[68/105] w-full overflow-hidden border border-white/15"
            style={{
              background:
                "linear-gradient(180deg, #1a5c2e 0%, #147a38 50%, #1a5c2e 100%)",
            }}
          >
            {/* Pitch markings */}
            <div className="pointer-events-none absolute inset-[3%] border border-white/35">
              <div className="absolute left-0 right-0 top-1/2 h-px bg-white/35" />
              <div className="absolute left-1/2 top-1/2 h-[18%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35" />
              <div className="absolute left-[20%] right-[20%] top-0 h-[14%] border border-t-0 border-white/35" />
              <div className="absolute bottom-0 left-[20%] right-[20%] h-[14%] border border-b-0 border-white/35" />
            </div>

            {dots.map((d) => (
              <button
                key={d.id}
                type="button"
                title={`${d.name} · ${d.rating.toFixed(1)} · fadiga ${Math.round(d.fatigue)}`}
                onClick={() => d.user && setSelectedId(d.id)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border transition-[left,top] duration-300 ease-out ${
                  d.user
                    ? selectedId === d.id
                      ? "z-10 h-4 w-4 border-white bg-arena-accent shadow-[0_0_10px_rgba(255,200,60,0.7)]"
                      : "h-3 w-3 border-white/80 bg-arena-accent"
                    : "h-2.5 w-2.5 border-white/40 bg-sky-300/90"
                }`}
                style={{
                  left: `${d.xy.x}%`,
                  top: `${100 - d.xy.y}%`,
                  opacity: d.fatigue < 40 ? 0.55 : 1,
                }}
              />
            ))}
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-arena-accent transition-[width] duration-75 ease-linear"
              style={{ width: `${(minute / MAX_MIN) * 100}%` }}
            />
          </div>
        </div>

        {/* Side panel */}
        <div className="flex w-full flex-col gap-2 lg:w-72">
          <div className="border border-white/10 bg-black/35 p-2.5">
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

          <div className="border border-white/10 bg-black/35 p-2.5">
            <p className="font-mono text-[9px] uppercase text-white/40">
              {tr("mgr.live.feed")}
            </p>
            <ul className="mt-1 min-h-[4rem] space-y-1">
              {feed.length === 0 && (
                <li className="text-[11px] text-white/35">{tr("mgr.live.kickoff")}</li>
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

          <Button variant="ghost" className="w-full !py-1.5 text-[11px]" onClick={skip}>
            {tr("mgr.live.skip")}
          </Button>
        </div>
      </div>

      {/* Decision card */}
      {decision && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-arena-accent/50 bg-arena-panel p-5 shadow-2xl">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-arena-accent">
              {tr("mgr.live.dec.badge")} · {minute}&apos;
            </p>
            <h3 className="mt-1 font-display text-2xl uppercase text-white">
              {tr(decision.titleKey)}
            </h3>
            <p className="mt-2 text-sm text-white/65">
              {tr(decision.bodyKey, { name: decision.name ?? "" })}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {decision.kind === "formation" && (
                <>
                  {(["433", "442", "352", "4231"] as FormationId[]).map((f) => (
                    <Button key={f} className="w-full" onClick={() => resolveDecision(f)}>
                      {f === "433"
                        ? "4-3-3"
                        : f === "442"
                          ? "4-4-2"
                          : f === "352"
                            ? "3-5-2"
                            : "4-2-3-1"}
                    </Button>
                  ))}
                  <Button variant="ghost" className="w-full" onClick={() => resolveDecision("keep")}>
                    {tr("mgr.live.dec.keep")}
                  </Button>
                </>
              )}
              {decision.kind === "style" && (
                <>
                  {(["pressing", "direct", "possession"] as TacticStyle[]).map((s) => (
                    <Button key={s} className="w-full" onClick={() => resolveDecision(s)}>
                      {tr(`mgr.style.${s}`)}
                    </Button>
                  ))}
                </>
              )}
              {decision.kind === "sub" && (
                <>
                  <Button className="w-full" onClick={() => resolveDecision("sub")}>
                    {tr("mgr.live.dec.sub.yes", { name: decision.name ?? "" })}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => resolveDecision("hold")}
                  >
                    {tr("mgr.live.dec.sub.no")}
                  </Button>
                </>
              )}
              {decision.kind === "push" && (
                <>
                  <Button className="w-full" onClick={() => resolveDecision("allin")}>
                    {tr("mgr.live.dec.push.yes")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => resolveDecision("hold")}
                  >
                    {tr("mgr.live.dec.push.no")}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

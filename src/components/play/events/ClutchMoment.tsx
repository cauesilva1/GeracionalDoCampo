"use client";

import { memo, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useGameActions, useGameState } from "@/hooks/useGameSimulation";
import { springPremium } from "@/lib/motion";
import { sfxBuzzer, sfxSwish } from "@/lib/sfx";
import type { DefenseAction, OffenseAction } from "@/types/game";

function formatClock(s: number): string {
  return `${s.toFixed(1)}s`;
}

function noteLabel(
  note: string | null,
  tr: (k: string, vars?: Record<string, string | number>) => string,
): string {
  if (!note) return "";
  if (note === "lead") return tr("crunch.note.lead");
  if (note === "buzzer") return tr("crunch.note.buzzer");

  const [kind, pct] = note.split(":");
  const p = pct ?? "";

  switch (kind) {
    case "made3":
      return tr("crunch.note.made3", { p });
    case "miss3":
      return tr("crunch.note.miss3", { p });
    case "made2":
      return tr("crunch.note.made2", { p });
    case "miss2":
      return tr("crunch.note.miss2", { p });
    case "kick2":
      return tr("crunch.note.kick2", { p });
    case "kick3":
      return tr("crunch.note.kick3", { p });
    case "kickMiss":
      return tr("crunch.note.kickMiss", { p });
    case "steal":
      return tr("crunch.note.steal", { p });
    case "stealFail2":
      return tr("crunch.note.stealFail2", { p });
    case "stealFail3":
      return tr("crunch.note.stealFail3", { p });
    case "oppMade2":
      return tr("crunch.note.oppMade2", { p });
    case "oppMade3":
      return tr("crunch.note.oppMade3", { p });
    case "contest":
      return tr("crunch.note.contest", { p });
    case "foul":
      return tr("crunch.note.foul", { n: p });
    case "overtime":
      return tr("crunch.note.overtime");
    default:
      return note;
  }
}

function bridgeKeyFor(clock: number, possession: "offense" | "defense"): string {
  if (clock <= 5) return "crunch.bridge.final5";
  if (clock <= 10) return "crunch.bridge.ten";
  if (possession === "defense") return "crunch.bridge.press";
  return "crunch.bridge.halfcourt";
}

/**
 * Crunch Time Simulator — possession-based endgame with juice.
 */
function ClutchMomentInner() {
  const { state } = useGameState();
  const {
    resolveCrunchOffense,
    resolveCrunchDefense,
    finishClutch,
    tr,
  } = useGameActions();
  const clutch = state.clutch;

  const [bridge, setBridge] = useState<string | null>(null);
  const [flashPlayer, setFlashPlayer] = useState(false);
  const [flashOpp, setFlashOpp] = useState(false);
  const prevScores = useRef<{ p: number; o: number } | null>(null);
  const prevLogId = useRef<string | null>(null);
  const buzzed = useRef(false);

  useEffect(() => {
    if (!clutch) return;
    if (prevScores.current === null) {
      prevScores.current = {
        p: clutch.playerScore,
        o: clutch.opponentScore,
      };
      return;
    }
    const scoredPlayer = clutch.playerScore > prevScores.current.p;
    const scoredOpp = clutch.opponentScore > prevScores.current.o;
    if (scoredPlayer) {
      setFlashPlayer(true);
      sfxSwish();
      const t = setTimeout(() => setFlashPlayer(false), 380);
      prevScores.current = {
        p: clutch.playerScore,
        o: clutch.opponentScore,
      };
      return () => clearTimeout(t);
    }
    if (scoredOpp) {
      setFlashOpp(true);
      sfxSwish();
      const t = setTimeout(() => setFlashOpp(false), 380);
      prevScores.current = {
        p: clutch.playerScore,
        o: clutch.opponentScore,
      };
      return () => clearTimeout(t);
    }
    prevScores.current = {
      p: clutch.playerScore,
      o: clutch.opponentScore,
    };
  }, [clutch?.playerScore, clutch?.opponentScore]);

  // Buzzer only at 0.0s when the period ends
  useEffect(() => {
    if (!clutch) return;
    if (clutch.clock <= 0 && clutch.resolved && !buzzed.current) {
      buzzed.current = true;
      sfxBuzzer();
    }
    if (clutch.clock > 0) buzzed.current = false;
  }, [clutch?.clock, clutch?.resolved]);

  // Narrative bridge between possessions (~600ms)
  useEffect(() => {
    if (!clutch || clutch.phase !== "playing") {
      setBridge(null);
      return;
    }
    const latest = clutch.log[0]?.id ?? null;
    if (!latest || latest === prevLogId.current) return;
    prevLogId.current = latest;
    if (clutch.resolved) return;

    const key = bridgeKeyFor(clutch.clock, clutch.possession);
    setBridge(key);
    const t = setTimeout(() => setBridge(null), 600);
    return () => clearTimeout(t);
  }, [clutch?.log, clutch?.phase, clutch?.clock, clutch?.possession, clutch?.resolved]);

  if (!clutch) return null;

  const deficit = clutch.opponentScore - clutch.playerScore;
  const onOffense = clutch.possession === "offense";
  const criticalClock = clutch.clock > 0 && clutch.clock <= 5;
  const bridging = bridge !== null && clutch.phase === "playing";

  return (
    <div className="flex w-full flex-col items-center text-center">
      <div
        className={`w-full shrink-0 rounded-xl border-2 p-3 ${
          clutch.phase === "playing"
            ? "animate-buzzer-pulse border-arena-buzzer/70"
            : "border-arena-accent/50 bg-arena-panel"
        }`}
      >
        <p className="font-display text-[10px] uppercase tracking-[0.25em] text-arena-accent">
          {tr(clutch.finals.titleKey)} · {tr("crunch.title")}
          {clutch.overtime ? ` · ${tr("crunch.ot")}` : ""}
        </p>
        <div className="mt-2 flex items-center justify-center gap-4">
          <div>
            <p className="font-display text-4xl text-white sm:text-5xl">
              <motion.span
                key={`p-${clutch.playerScore}`}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={springPremium}
                className={`inline-block tabular-nums ${
                  flashPlayer
                    ? "text-arena-accent drop-shadow-[0_0_12px_rgba(255,122,0,0.7)]"
                    : ""
                }`}
              >
                {clutch.playerScore}
              </motion.span>
              <span className="text-white/25"> – </span>
              <motion.span
                key={`o-${clutch.opponentScore}`}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={springPremium}
                className={`inline-block tabular-nums ${
                  flashOpp
                    ? "text-red-400 drop-shadow-[0_0_12px_rgba(255,59,48,0.7)]"
                    : "text-arena-buzzer"
                }`}
              >
                {clutch.opponentScore}
              </motion.span>
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/40">
              {deficit > 0
                ? tr("crunch.downBy", { n: deficit })
                : deficit < 0
                  ? tr("crunch.upBy", { n: Math.abs(deficit) })
                  : tr("crunch.tied")}
            </p>
          </div>
          <div
            className={`rounded-lg border bg-arena-bg/80 px-3 py-1.5 ${
              criticalClock
                ? "animate-pulse border-red-500/70"
                : "border-arena-buzzer/50"
            }`}
          >
            <p
              className={`font-display text-3xl tabular-nums sm:text-4xl ${
                criticalClock ? "text-red-500" : "text-arena-buzzer"
              }`}
            >
              {formatClock(clutch.clock)}
            </p>
          </div>
        </div>
      </div>

      {clutch.phase === "playing" && (
        <AnimatePresence mode="wait">
          {bridging ? (
            <motion.div
              key={bridge ?? "bridge"}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={springPremium}
              className="mt-4 flex min-h-[7.5rem] w-full max-w-lg flex-col items-center justify-center px-2"
            >
              <p className="font-display text-xl uppercase tracking-wide text-white/80 sm:text-2xl">
                {tr(bridge!)}
              </p>
              <p className="mt-2 font-sans text-[11px] uppercase tracking-wider text-white/35">
                {tr("crunch.bridge.wait")}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="actions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={springPremium}
              className="mt-3 w-full max-w-lg"
            >
              <div className="shrink-0">
                <p
                  className={`animate-possession-pulse font-display text-xl uppercase tracking-wide sm:text-2xl ${
                    onOffense ? "text-arena-accent" : "text-arena-buzzer"
                  }`}
                >
                  {onOffense ? tr("crunch.offense") : tr("crunch.defense")}
                </p>
                <p className="mt-0.5 text-xs text-white/50">
                  {onOffense
                    ? tr("crunch.offenseHint")
                    : tr("crunch.defenseHint")}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {clutch.lastNote ? (
                  <motion.p
                    key={clutch.lastNote}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={springPremium}
                    className="mt-2 line-clamp-2 max-w-md shrink-0 text-sm text-white/70"
                  >
                    {noteLabel(clutch.lastNote, tr)}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <div className="mt-3 grid w-full shrink-0 gap-2">
                {onOffense
                  ? (
                      [
                        ["three", "crunch.act.three"],
                        ["drive", "crunch.act.drive"],
                        ["kick", "crunch.act.kick"],
                      ] as const
                    ).map(([id, key]) => (
                      <motion.button
                        key={id}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={springPremium}
                        onClick={() =>
                          resolveCrunchOffense(id as OffenseAction)
                        }
                        className="cursor-pointer rounded-xl border border-white/15 bg-arena-panel px-3 py-3 text-left hover:border-arena-accent hover:bg-arena-accent/10"
                      >
                        <span className="font-display text-base uppercase text-white sm:text-lg">
                          {tr(key)}
                        </span>
                        <span className="mt-0.5 block text-[10px] uppercase text-white/40">
                          {tr(`${key}.hint`)}
                        </span>
                      </motion.button>
                    ))
                  : (
                      [
                        ["steal", "crunch.act.steal"],
                        ["contest", "crunch.act.contest"],
                        ["foul", "crunch.act.foul"],
                      ] as const
                    ).map(([id, key]) => (
                      <motion.button
                        key={id}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        transition={springPremium}
                        onClick={() =>
                          resolveCrunchDefense(id as DefenseAction)
                        }
                        className="cursor-pointer rounded-xl border border-white/15 bg-arena-panel px-3 py-3 text-left hover:border-arena-buzzer hover:bg-arena-buzzer/10"
                      >
                        <span className="font-display text-base uppercase text-white sm:text-lg">
                          {tr(key)}
                        </span>
                        <span className="mt-0.5 block text-[10px] uppercase text-white/40">
                          {tr(`${key}.hint`)}
                        </span>
                      </motion.button>
                    ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {clutch.phase === "result" && (
        <div className="mt-4 w-full max-w-sm shrink-0 rounded-xl border border-arena-accent/50 bg-arena-panel p-4">
          <p className="font-display text-3xl uppercase text-arena-accent">
            {state.clutchKind === "key_game"
              ? clutch.winsGame
                ? tr("key.win")
                : tr("key.lose")
              : clutch.winsGame
                ? tr("clutch.win")
                : tr("clutch.lose")}
          </p>
          <p className="mt-1 text-sm text-white/55">
            {noteLabel(clutch.lastNote, tr)}
          </p>
          <p className="mt-2 font-display text-2xl text-white">
            {clutch.playerScore} – {clutch.opponentScore}
          </p>
          <Button className="mt-3 w-full justify-center" onClick={finishClutch}>
            {tr("clutch.continue")}
          </Button>
        </div>
      )}
    </div>
  );
}

export const ClutchMoment = memo(ClutchMomentInner);

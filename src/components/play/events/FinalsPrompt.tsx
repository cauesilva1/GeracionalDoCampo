"use client";

import { Button } from "@/components/ui/Button";
import { useGameActions, useGameState } from "@/hooks/useGameSimulation";

export function FinalsPrompt() {
  const { state } = useGameState();
  const { watchFinals, skipFinals, tr } = useGameActions();
  const finals = state.pendingFinals;
  if (!finals) return null;

  return (
    <div className="flex flex-col items-center text-center">
      <p className="font-display text-xs uppercase tracking-[0.3em] text-brand-yellow">
        {tr("finals.prompt")}
      </p>
      <h3 className="mt-2 font-display text-3xl uppercase leading-none text-white sm:text-4xl">
        {tr(finals.titleKey)}
      </h3>
      <p className="mt-4 font-display text-2xl text-white/80">
        {state.career?.clubName}{" "}
        <span className="text-white/40">{tr("finals.vs")}</span>{" "}
        {finals.opponentName.startsWith("key.")
          ? tr(finals.opponentName)
          : finals.opponentName}
      </p>
      <div className="mt-6 rounded-2xl border border-brand-yellow/40 bg-arena-panel px-8 py-4">
        <p className="font-display text-5xl text-brand-yellow">
          {finals.playerScore}–{finals.opponentScore}
        </p>
        <p className="mt-1 text-xs uppercase tracking-wider text-white/45">
          Game 7 · {tr("crunch.title")}
          {finals.deficit > 0
            ? ` · ${tr("crunch.downBy", { n: finals.deficit })}`
            : ` · ${tr("crunch.tied")}`}
        </p>
      </div>
      <div className="mt-8 flex w-full max-w-sm flex-col items-center gap-3">
        <Button className="w-full justify-center" onClick={watchFinals}>
          {tr("finals.watch")}
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-center"
          onClick={skipFinals}
        >
          {tr("finals.skip")}
        </Button>
      </div>
    </div>
  );
}

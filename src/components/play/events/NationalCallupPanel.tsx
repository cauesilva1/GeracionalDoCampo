"use client";

import { Button } from "@/components/ui/Button";
import { useGameActions, useGameState } from "@/hooks/useGameSimulation";

/** World Cup / Olympics invitation — even fringe minutes matter. */
export function NationalCallupPanel() {
  const { state } = useGameState();
  const { resolveNationalCallup, tr } = useGameActions();
  const call = state.pendingNational;
  if (!call) return null;

  return (
    <div className="w-full text-center">
      <p className="font-sans text-[10px] font-medium uppercase tracking-[0.3em] text-arena-accent">
        {tr("national.eyebrow")}
      </p>
      <h3 className="mt-2 font-display text-2xl uppercase text-white sm:text-3xl">
        {tr(call.titleKey, { year: call.year })}
      </h3>
      <p className="mt-2 font-sans text-sm text-white/55">
        {tr(call.bodyKey, { year: call.year })}
      </p>
      <p className="mt-3 font-sans text-[11px] text-white/40">
        {call.minutesLikely
          ? tr("national.minutesHint")
          : tr("national.starHint")}
      </p>
      <div className="mt-4 grid gap-2">
        <Button
          className="w-full justify-center"
          onClick={() => resolveNationalCallup("accept")}
        >
          {tr("national.accept")}
        </Button>
        <Button
          variant="outline"
          className="w-full justify-center"
          onClick={() => resolveNationalCallup("decline")}
        >
          {tr("national.decline")}
        </Button>
      </div>
    </div>
  );
}

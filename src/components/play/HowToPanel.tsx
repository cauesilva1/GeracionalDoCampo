"use client";

import { Button } from "@/components/ui/Button";
import { useGameActions } from "@/hooks/useGameSimulation";

const STEPS = [
  "howto.step1",
  "howto.step2",
  "howto.step3",
  "howto.step4",
] as const;

/** Pre-draft onboarding — streamer can read aloud in ~10s. */
export function HowToPanel() {
  const { beginDraft, tr } = useGameActions();

  return (
    <div className="mx-auto w-full max-w-lg text-center">
      <p className="font-sans text-[10px] font-medium uppercase tracking-[0.3em] text-arena-accent">
        {tr("howto.eyebrow")}
      </p>
      <h2 className="mt-2 font-display text-3xl uppercase text-white sm:text-4xl">
        {tr("howto.title")}
      </h2>
      <p className="mt-2 font-sans text-sm text-white/55">{tr("howto.lead")}</p>

      <ol className="mt-5 space-y-2 text-left">
        {STEPS.map((key, i) => (
          <li
            key={key}
            className="flex gap-3 rounded-xl border border-white/10 bg-arena-panel/90 px-3 py-2.5"
          >
            <span className="font-display text-lg text-arena-accent">
              {i + 1}
            </span>
            <span className="font-sans text-sm leading-snug text-white/75">
              {tr(key)}
            </span>
          </li>
        ))}
      </ol>

      <Button className="mt-6 w-full justify-center" onClick={beginDraft}>
        {tr("howto.cta")}
      </Button>
    </div>
  );
}

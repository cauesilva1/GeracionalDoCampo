"use client";

import { motion } from "framer-motion";
import {
  canAffordOption,
  midEventCount,
  optionGainChips,
  optionWalletDelta,
} from "@/lib/progression";
import { streetRiskPct } from "@/lib/injury";
import { springPremium } from "@/lib/motion";
import { formatMoney } from "@/lib/utils";
import { sfxClick } from "@/lib/sfx";
import { useGameActions, useGameState } from "@/hooks/useGameSimulation";

export function SeasonEventPanel() {
  const { state } = useGameState();
  const { resolveSeasonEvent, tr } = useGameActions();
  const event = state.pendingEvent;
  if (!event) return null;

  const isOff = event.kind === "offseason";
  const midTotal = midEventCount(state.career?.inNba ?? false);
  const wallet = state.career?.wallet ?? 0;
  const currency = state.career?.contractCurrency ?? "USD";

  return (
    <div className="w-full text-center">
      <p
        className={`font-sans text-[10px] font-medium uppercase tracking-[0.3em] ${
          isOff ? "text-arena-accent" : "text-arena-buzzer"
        }`}
      >
        {isOff ? tr("event.off.eyebrow") : tr("event.mid.eyebrow")}
      </p>
      <h3 className="mt-2 font-display text-2xl uppercase leading-tight text-white sm:text-3xl">
        {tr(event.titleKey)}
      </h3>
      <p className="mt-2 font-sans text-sm leading-relaxed text-white/55">
        {tr(event.bodyKey)}
      </p>

      {isOff && (
        <p className="mt-2 font-sans text-[11px] text-white/40">
          {tr("event.off.balance")}:{" "}
          <span className="font-medium text-arena-accent">
            {formatMoney(wallet, currency)}
          </span>
        </p>
      )}

      <div className="mt-4 space-y-2">
        {event.options.map((opt) => {
          const delta = optionWalletDelta(opt);
          const afford = canAffordOption(wallet, opt);
          const chips = optionGainChips(opt);
          const blocked = isOff && !afford;

          return (
            <motion.button
              key={opt.id}
              layout
              type="button"
              disabled={blocked}
              whileHover={blocked ? undefined : { scale: 1.02 }}
              whileTap={blocked ? undefined : { scale: 0.98 }}
              transition={springPremium}
              onClick={() => {
                if (blocked) return;
                sfxClick();
                resolveSeasonEvent(opt.id);
              }}
              className={`w-full rounded-xl border px-4 py-3 text-left ${
                blocked
                  ? "cursor-not-allowed border-white/10 bg-white/[0.03] opacity-45"
                  : "cursor-pointer border-white/15 bg-arena-bg/60 hover:border-arena-accent hover:bg-arena-accent/10"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-display text-base uppercase text-white">
                  {tr(opt.labelKey)}
                </span>
                {isOff && (
                  <span
                    className={`shrink-0 font-display text-sm ${
                      delta === 0
                        ? "text-emerald-400"
                        : delta < 0
                          ? "text-arena-accent"
                          : "text-emerald-400"
                    }`}
                  >
                    {delta === 0
                      ? tr("event.off.free")
                      : delta < 0
                        ? `−${formatMoney(Math.abs(delta), currency)}`
                        : `+${formatMoney(delta, currency)}`}
                  </span>
                )}
              </div>
              {opt.hintKey && (
                <span className="mt-0.5 block font-sans text-[11px] text-white/45">
                  {opt.hintKey === "event.off.street.hint"
                    ? tr("event.off.street.hintDyn", {
                        pct: streetRiskPct(
                          state.career?.injuryRisk ?? 0.15,
                        ),
                      })
                    : tr(opt.hintKey)}
                </span>
              )}
              {chips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {chips.map((c) => (
                    <span
                      key={c.key + String(c.vars?.n ?? "")}
                      className="rounded border border-white/10 px-1.5 py-0.5 font-sans text-[9px] uppercase tracking-wide text-white/50"
                    >
                      {tr(c.key, c.vars)}
                    </span>
                  ))}
                </div>
              )}
              {blocked && (
                <span className="mt-1.5 block font-sans text-[10px] font-medium uppercase text-red-300/80">
                  {tr("event.off.cantAfford")}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      {!isOff && (
        <p className="mt-3 font-sans text-[10px] font-medium uppercase tracking-wider text-white/35">
          {tr("event.mid.progress", {
            n: (state.career?.midEventsDone ?? 0) + 1,
            total: midTotal,
          })}
        </p>
      )}
    </div>
  );
}

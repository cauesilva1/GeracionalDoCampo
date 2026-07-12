"use client";

import { useEffect, useState } from "react";
import { coachLegacyTheme } from "@/lib/manager/coachTheme";
import { LEAGUES } from "@/lib/manager/clubs";
import { loadPastRuns, type PastRun } from "@/lib/manager/pastRuns";
import { t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/types/game";

function formatDate(ts: number, locale: Locale): string {
  try {
    return new Intl.DateTimeFormat(
      locale === "en" ? "en-US" : locale === "es" ? "es-ES" : "pt-BR",
      { day: "2-digit", month: "short", year: "numeric" },
    ).format(new Date(ts));
  } catch {
    return "";
  }
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="min-w-0 rounded-sm bg-black/35 px-2 py-1.5">
      <p className="font-mono text-[8px] uppercase tracking-wider text-white/35">
        {label}
      </p>
      <p
        className={`mt-0.5 truncate font-display text-sm text-white ${accent ?? ""}`}
      >
        {value}
      </p>
    </div>
  );
}

export function PastRunsSection({ locale }: { locale: Locale }) {
  const [runs, setRuns] = useState<PastRun[]>([]);

  useEffect(() => {
    setRuns(loadPastRuns());
  }, []);

  if (runs.length === 0) return null;

  return (
    <section className="relative z-10 mx-auto mt-8 w-full max-w-5xl px-4 pb-8 sm:mt-10 sm:pb-10">
      <div className="rounded-md border border-white/10 bg-black/30 px-3 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-arena-accent">
              {t(locale, "mgr.past.eyebrow")}
            </p>
            <h2 className="mt-1 font-display text-xl uppercase text-white sm:text-2xl">
              {t(locale, "mgr.past.title")}
            </h2>
            <p className="mt-1 text-xs text-white/45">
              {t(locale, "mgr.past.sub", { n: runs.length })}
            </p>
          </div>
        </div>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {runs.map((run) => {
            const theme = coachLegacyTheme(run.legacyTier);
            const games = run.wins + run.draws + run.losses;
            const winPct =
              games > 0 ? Math.round((run.wins / games) * 100) : 0;

            return (
              <li
                key={run.id}
                className="rounded-sm border border-white/10 bg-black/40 p-3 text-left sm:p-4"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: theme.accent,
                  boxShadow: `inset 0 0 0 1px ${theme.accent}18`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base uppercase text-white sm:text-lg">
                      {run.coachName}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-white/55">
                      {run.clubName}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[9px] uppercase text-white/35">
                      {t(locale, `mgr.country.${run.country}`)} ·{" "}
                      {t(
                        locale,
                        LEAGUES[run.leagueId]?.nameKey ?? "mgr.tier2",
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-block rounded-sm px-1.5 py-0.5 font-sans text-[8px] font-semibold uppercase tracking-wider ${theme.ribbonClass}`}
                    >
                      {t(locale, `mgr.legacy.tier.${run.legacyTier}`)}
                    </span>
                    <p className={`mt-1 font-display text-2xl ${theme.ovrClass}`}>
                      {run.ovr}
                    </p>
                    <p className="font-mono text-[8px] uppercase text-white/35">
                      {t(locale, "mgr.past.ovr")}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  <Stat
                    label={t(locale, "mgr.past.score")}
                    value={run.legacyScore}
                    accent={theme.ovrClass}
                  />
                  <Stat
                    label={t(locale, "mgr.past.titles")}
                    value={run.titles}
                  />
                  <Stat
                    label={t(locale, "mgr.past.topFlight")}
                    value={run.topFlightTitles ?? 0}
                  />
                  <Stat
                    label={t(locale, "mgr.past.seasonsLabel")}
                    value={run.seasons}
                  />
                  <Stat
                    label={t(locale, "mgr.past.clubs")}
                    value={run.clubsManaged ?? 1}
                  />
                  <Stat
                    label={t(locale, "mgr.past.winRate")}
                    value={`${winPct}%`}
                  />
                </div>

                <p className="mt-2 font-mono text-[10px] text-white/50">
                  {run.wins} {t(locale, "mgr.past.wins")} · {run.draws}{" "}
                  {t(locale, "mgr.past.draws")} · {run.losses}{" "}
                  {t(locale, "mgr.past.losses")}
                  {games > 0 ? ` · ${games} ${t(locale, "mgr.past.games")}` : ""}
                </p>

                <p className="mt-1 text-[10px] text-white/40">
                  {t(locale, `mgr.origin.${run.origin ?? "assistant"}`)} ·{" "}
                  {t(
                    locale,
                    `mgr.philosophy.${run.philosophy ?? "balanced"}`,
                  )}
                </p>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
                  <span className="font-mono text-[9px] uppercase tracking-wide text-arena-accent/90">
                    {t(locale, `mgr.past.reason.${run.endReason}`)}
                  </span>
                  <span className="font-mono text-[9px] text-white/35">
                    {formatDate(run.endedAt, locale)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

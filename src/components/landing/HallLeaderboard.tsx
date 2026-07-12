"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { legacyTheme } from "@/lib/legacyTheme";
import { sitePageHref } from "@/lib/i18n";
import { t } from "@/lib/i18n/dictionary";
import type { Locale } from "@/types/game";

export type HallEntry = {
  id: string;
  playerName: string;
  posId: string;
  ovr: number;
  tierId: string;
  seasons: number;
  leagueTitles: number;
  nbaTitles: number;
  euroTitles: number;
  worldCups: number;
  olympicRuns: number;
  mvps: number;
  finalsMvps: number;
  allStars: number;
  legacyScore: number;
  nickname: string | null;
};

/** Major titles that break OVR ties. */
export function majorTitles(e: HallEntry): number {
  return (
    e.leagueTitles +
    e.nbaTitles +
    e.euroTitles +
    e.worldCups +
    e.olympicRuns
  );
}

export function HallLeaderboard({
  locale,
  limit = 10,
  showMoreLink = false,
}: {
  locale: Locale;
  limit?: number;
  showMoreLink?: boolean;
}) {
  const [entries, setEntries] = useState<HallEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/hall?limit=${limit}`);
        const data = (await res.json()) as { entries?: HallEntry[] };
        setEntries(data.entries ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [limit]);

  return (
    <div className="w-full">
      {loading && (
        <p className="py-8 text-center font-sans text-sm text-white/40">…</p>
      )}
      {!loading && entries.length === 0 && (
        <p className="py-8 text-center font-sans text-sm text-white/40">
          {t(locale, "hall.empty")}
        </p>
      )}

      <ol className="space-y-3">
        {entries.map((e, i) => {
          const theme = legacyTheme(e.tierId);
          const titles = majorTitles(e);
          const trophyRows: [string, number][] = [
            [t(locale, "hall.stat.league"), e.leagueTitles],
            [t(locale, "hall.stat.nba"), e.nbaTitles],
            [t(locale, "hall.stat.euro"), e.euroTitles],
            [t(locale, "hall.stat.wc"), e.worldCups],
            [t(locale, "hall.stat.oly"), e.olympicRuns],
            [t(locale, "hall.stat.mvp"), e.mvps],
            [t(locale, "hall.stat.fmvp"), e.finalsMvps],
            [t(locale, "hall.stat.as"), e.allStars],
          ];

          return (
            <li
              key={e.id}
              className="overflow-hidden rounded-2xl border border-white/10"
              style={{
                background: `linear-gradient(105deg, ${theme.bg1}99, ${theme.bg0})`,
                boxShadow: `inset 3px 0 0 ${theme.accent}`,
              }}
            >
              <div className="flex items-start gap-2 px-3 py-3 sm:gap-3 sm:px-4">
                <div className="flex w-8 shrink-0 flex-col items-center pt-0.5 sm:w-10">
                  <span className="font-display text-xl text-white/35 sm:text-2xl">
                    {i + 1}
                  </span>
                </div>

                <div className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-lg uppercase leading-none text-white sm:text-xl">
                        {e.playerName}
                        {e.nickname ? (
                          <span className="ml-2 font-sans text-xs normal-case text-white/40">
                            “{e.nickname}”
                          </span>
                        ) : null}
                      </h3>
                      <p
                        className={`mt-1 font-sans text-[10px] uppercase sm:text-[11px] ${theme.titleClass}`}
                      >
                        {t(locale, `tier.${e.tierId}`)} · {e.posId} ·{" "}
                        {e.seasons} {t(locale, "dash.season").toLowerCase()}s
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-3 text-right">
                      <div>
                        <p className={`font-display text-2xl leading-none ${theme.ovrClass}`}>
                          {e.ovr}
                        </p>
                        <p className="mt-0.5 font-sans text-[8px] uppercase tracking-wider text-white/35">
                          OVR
                        </p>
                      </div>
                      <div>
                        <p className="font-display text-2xl leading-none text-white">
                          {titles}
                        </p>
                        <p className="mt-0.5 font-sans text-[8px] uppercase tracking-wider text-white/35">
                          {t(locale, "hall.stat.titles")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-x-2 gap-y-2 sm:grid-cols-8">
                    {trophyRows.map(([label, val]) => (
                      <div key={label} className="text-center sm:text-left">
                        <p
                          className={`font-display text-base leading-none ${
                            val > 0 ? theme.ovrClass : "text-white/25"
                          }`}
                        >
                          {val}
                        </p>
                        <p className="mt-0.5 font-sans text-[8px] uppercase leading-tight text-white/35">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {showMoreLink && entries.length > 0 && (
        <div className="mt-5 text-center">
          <Link
            href={sitePageHref(locale, "hall")}
            className="font-sans text-[11px] uppercase tracking-[0.2em] text-arena-accent hover:text-white"
          >
            {t(locale, "hall.seeAll")} →
          </Link>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { ClubCrest } from "@/components/manager/ClubCrest";
import { ManagerLegacy } from "@/components/manager/ManagerLegacy";
import { MatchLiveOverlay } from "@/components/manager/MatchLiveOverlay";
import {
  useManagerActions,
  useManagerState,
} from "@/hooks/useManagerGame";
import { ECONOMY, getClub, LEAGUES, toDisplayMoney } from "@/lib/manager/clubs";
import { emptyTrophyCabinet } from "@/lib/manager/legacy";
import { canBuyPlayer } from "@/lib/manager/market";
import { sortTable } from "@/lib/manager/match";
import {
  FORMATION_SLOTS,
  type FormationId,
  type TacticStyle,
} from "@/types/manager";

function money(
  eur: number,
  leagueId: import("@/types/manager").LeagueId,
  currency: string,
): string {
  const n = toDisplayMoney(eur, leagueId);
  if (n >= 1_000_000) return `${currency}${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${currency}${(n / 1_000).toFixed(0)}K`;
  return `${currency}${n}`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-white/10 bg-black/25 p-2.5 sm:p-3">
      <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
        {title}
      </p>
      {children}
    </section>
  );
}

export function ManagerHub() {
  const { state } = useManagerState();
  const {
    tr,
    updateTactics,
    setFormation,
    setStyle,
    assignStarter,
    doAutoLineup,
    doBuy,
    doSell,
    doPlayMatch,
    doFinishLiveMatch,
    doResolveEvent,
    doOpenNational,
    doCloseNational,
    doToggleCallUp,
    doPlayTournament,
    doNextSeason,
    doAcceptOffer,
    doDeclineOffers,
    doRetire,
    doViewLegacy,
    restart,
  } = useManagerActions();

  const career = state.career;
  const season = state.season;
  const table = useMemo(
    () => sortTable(season?.table ?? []),
    [season?.table],
  );

  if (state.phase === "legacy" && career) {
    return <ManagerLegacy />;
  }

  if (!career || !season) {
    return (
      <div className="px-4 py-16 text-center text-white/50">
        {tr("mgr.restart")}
      </div>
    );
  }

  const club = getClub(career.clubId);
  const league = LEAGUES[career.leagueId];
  const currency = league.currency;
  const m = (eur: number) => money(eur, career.leagueId, currency);
  const myPos = table.findIndex((r) => r.clubId === career.clubId) + 1;
  const transferBudget = career.transferBudget ?? career.budget;
  const wageBudget = career.wageBudget ?? career.wageBill * 1.2;
  const signings = career.signingsThisWindow ?? 0;
  const cabinet = career.trophyCabinet ?? emptyTrophyCabinet();
  const avgOvr = Math.round(
    state.squad.reduce((s, p) => s + p.ovr, 0) / Math.max(state.squad.length, 1),
  );

  const nextFixture = season.fixtures.find(
    (f) =>
      f.matchday === season.matchday &&
      !f.played &&
      (f.homeId === career.clubId || f.awayId === career.clubId),
  );

  const blocked =
    state.phase === "fired" ||
    state.phase === "offers" ||
    state.phase === "season_end" ||
    state.phase === "match_live" ||
    state.phase === "career_event" ||
    state.phase === "national";

  const nt = state.nationalTeam;

  return (
    <div className="relative mx-auto w-full max-w-6xl px-2 py-3 sm:px-4">
      {state.phase === "match_live" && state.liveMatch && (
        <MatchLiveOverlay
          match={state.liveMatch}
          clubId={career.clubId}
          squad={state.squad}
          starters={state.starters}
          bench={state.squad
            .filter((p) => !state.starters.includes(p.id) && p.injuredWeeks <= 0)
            .map((p) => p.id)}
          tactics={state.tactics}
          oppSquad={
            state.aiSquads[
              state.liveMatch.homeId === career.clubId
                ? state.liveMatch.awayId
                : state.liveMatch.homeId
            ] ?? []
          }
          important={(() => {
            const oppId =
              state.liveMatch.homeId === career.clubId
                ? state.liveMatch.awayId
                : state.liveMatch.homeId;
            const opp = getClub(oppId);
            const myPos = table.findIndex((r) => r.clubId === career.clubId) + 1;
            const oppPos = table.findIndex((r) => r.clubId === oppId) + 1;
            return (
              (opp?.prestige ?? 0) >= 78 ||
              myPos <= 3 ||
              oppPos <= 3 ||
              season.matchday >= season.matchdaysTotal - 2
            );
          })()}
          tr={tr}
          onDone={doFinishLiveMatch}
        />
      )}

      {state.phase === "career_event" && state.careerEvent && (
        <div className="absolute inset-0 z-20 flex items-start justify-center bg-arena-bg/85 px-4 pt-14 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-sm border border-arena-accent/40 bg-arena-panel p-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
              {tr("mgr.event.badge")}
            </p>
            <h2 className="mt-1 font-display text-2xl uppercase text-arena-accent">
              {tr(state.careerEvent.titleKey)}
            </h2>
            <p className="mt-2 text-sm text-white/65">
              {tr(state.careerEvent.bodyKey, {
                name: state.careerEvent.playerName ?? "",
              })}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {state.careerEvent.choices.map((c) => (
                <Button
                  key={c.id}
                  className="w-full"
                  variant={c.id === "sell" || c.id === "decline" ? "ghost" : undefined}
                  onClick={() => doResolveEvent(c.id)}
                >
                  {tr(c.labelKey, {
                    name: state.careerEvent!.playerName ?? "",
                  })}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {state.phase === "national" && nt && (
        <div className="absolute inset-0 z-20 flex items-start justify-center overflow-y-auto bg-arena-bg/90 px-3 py-10 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-sm border border-arena-accent/40 bg-arena-panel p-5">
            <h2 className="text-center font-display text-2xl uppercase text-arena-accent">
              {tr("mgr.nt.title")}
            </h2>
            <p className="mt-1 text-center font-mono text-[10px] uppercase text-white/45">
              {tr(`mgr.country.${nt.country}`)} · {tr("mgr.nt.titles", { n: nt.titles })} ·{" "}
              {nt.calledUpIds.length}/23
            </p>
            {nt.pendingTournament && (
              <p className="mt-2 text-center text-sm text-white/60">
                {tr(nt.pendingTournament.nameKey)} {nt.pendingTournament.year}
              </p>
            )}
            <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
              {[...nt.pool]
                .sort((a, b) => b.ovr - a.ovr)
                .map((p) => {
                  const on = nt.calledUpIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => doToggleCallUp(p.id)}
                      className={`flex w-full items-center justify-between gap-2 border px-2 py-1.5 text-left text-[11px] ${
                        on
                          ? "border-arena-accent/50 bg-arena-accent/10 text-white"
                          : "border-white/10 text-white/60 hover:border-white/25"
                      }`}
                    >
                      <span className="truncate">
                        <span className="font-mono text-arena-accent">{p.pos}</span>{" "}
                        {p.name}
                      </span>
                      <span className="font-display">{p.ovr}</span>
                    </button>
                  );
                })}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                className="w-full"
                disabled={!nt.pendingTournament || nt.calledUpIds.length < 11}
                onClick={doPlayTournament}
              >
                {tr("mgr.nt.play")}
              </Button>
              <Button className="w-full" variant="ghost" onClick={doCloseNational}>
                {tr("mgr.nt.close")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal overlays stay on same screen context */}
      {state.phase === "fired" && (
        <div className="absolute inset-0 z-20 flex items-start justify-center bg-arena-bg/85 px-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-sm border border-arena-buzzer/50 bg-arena-panel p-6 text-center">
            <h2 className="font-display text-3xl uppercase text-arena-buzzer">
              {tr("mgr.fired.title")}
            </h2>
            <p className="mt-2 text-sm text-white/60">{tr("mgr.fired.body")}</p>
            <p className="mt-2 font-display text-white">
              OVR {Math.round(career.ovr ?? 58)} · {cabinet.leagueTitles}{" "}
              {tr("mgr.legacy.leagueTitles")}
            </p>
            <Button className="mt-5" onClick={doViewLegacy}>
              {tr("mgr.fired.toLegacy")}
            </Button>
          </div>
        </div>
      )}
      {state.phase === "offers" && (
        <div className="absolute inset-0 z-20 flex items-start justify-center bg-arena-bg/85 px-4 pt-12 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-sm border border-arena-accent/40 bg-arena-panel p-5">
            <h2 className="text-center font-display text-2xl uppercase text-arena-accent">
              {tr("mgr.offers.title")}
            </h2>
            <div className="mt-4 space-y-2">
              {state.offers.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-2 border border-white/10 px-3 py-2"
                >
                  <div>
                    <p className="font-display text-sm text-white">{o.clubName}</p>
                    <p className="font-mono text-[9px] uppercase text-white/40">
                      {tr(LEAGUES[o.leagueId].nameKey)}
                    </p>
                  </div>
                  <Button
                    className="!px-2 !py-1 text-[10px]"
                    onClick={() => doAcceptOffer(o.id)}
                  >
                    {tr("mgr.offers.accept")}
                  </Button>
                </div>
              ))}
            </div>
            <Button
              className="mt-4 w-full"
              variant="ghost"
              onClick={doDeclineOffers}
            >
              {tr("mgr.offers.decline")}
            </Button>
          </div>
        </div>
      )}
      {state.phase === "season_end" && (
        <div className="absolute inset-0 z-20 flex items-start justify-center bg-arena-bg/85 px-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-sm border border-arena-accent/40 bg-arena-panel p-6 text-center">
            <h2 className="font-display text-3xl uppercase text-arena-accent">
              {tr("mgr.seasonEnd.title")}
            </h2>
            <p className="mt-2 font-display text-xl text-white">
              {tr("mgr.seasonEnd.pos", { n: myPos })}
            </p>
            <p className="mt-1 text-sm text-white/50">
              OVR {Math.round(career.ovr ?? 58)} · {cabinet.leagueTitles}{" "}
              {tr("mgr.legacy.leagueTitles")}
            </p>
            <Button className="mt-5" onClick={doNextSeason}>
              {tr("mgr.nextSeason")}
            </Button>
            <Button className="mt-2" variant="ghost" onClick={doRetire}>
              {tr("mgr.retire")}
            </Button>
          </div>
        </div>
      )}

      {/* Header strip — all key data */}
      <header
        className="flex flex-col gap-2 border border-white/10 bg-black/30 px-2.5 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-3 sm:py-2.5"
        style={{
          borderLeftColor: club?.colors.primary,
          borderLeftWidth: 4,
        }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {club && <ClubCrest club={club} size={36} />}
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base uppercase text-white sm:text-xl">
              {career.clubName}
            </p>
            <p className="truncate font-mono text-[8px] uppercase text-white/45 sm:text-[9px]">
              {career.coachName} · {tr(league.nameKey)} ·{" "}
              {tr("mgr.season", { n: career.season })} · #
              {myPos || "—"} · {tr(`mgr.goal.${career.boardGoal}`)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-x-2 gap-y-1 font-mono text-[10px] text-white/70 sm:ml-auto sm:grid-cols-6 sm:gap-x-3">
          <span>
            <span className="text-white/35">OVR </span>
            <span className="font-display text-arena-accent">
              {Math.round(career.ovr ?? 58)}
            </span>
          </span>
          <span>
            <span className="text-white/35">T </span>
            {cabinet.leagueTitles}
          </span>
          <span>
            <span className="text-white/35">DIR </span>
            {career.boardConfidence}%
          </span>
          <span>
            <span className="text-white/35">CX </span>
            {m(transferBudget)}
          </span>
          <span>
            <span className="text-white/35">SAL </span>
            {m(career.wageBill)}
          </span>
          <span>
            <span className="text-white/35">RD </span>
            {season.matchday}/{season.matchdaysTotal}
          </span>
        </div>
      </header>

      {/* Single data screen */}
      <div
        className={`mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.9fr_0.85fr] ${
          blocked ? "pointer-events-none opacity-40" : ""
        }`}
      >
        {/* Col 1 — Match + tactics + XI */}
        <div className="space-y-3">
          <Section title={tr("mgr.tab.match")}>
            {nextFixture ? (
              <div className="text-center">
                <p className="font-display text-base text-white sm:text-lg">
                  {getClub(nextFixture.homeId)?.shortName} {tr("mgr.vs")}{" "}
                  {getClub(nextFixture.awayId)?.shortName}
                </p>
                <Button
                  className="mt-2 w-full"
                  onClick={doPlayMatch}
                  disabled={state.starters.length < 11}
                >
                  {state.starters.length < 11
                    ? tr("mgr.needXi")
                    : tr("mgr.playMatch")}
                </Button>
              </div>
            ) : (
              <p className="text-center text-xs text-white/40">—</p>
            )}
            {season.lastResult && (
              <div className="mt-2 border-t border-white/10 pt-2 text-center">
                <p className="font-display text-arena-accent">
                  {tr(season.lastResult.summaryKey)}{" "}
                  {season.lastResult.homeGoals}–{season.lastResult.awayGoals}
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-white/40">
                  {season.lastResult.events
                    .filter((e) => e.kind === "goal")
                    .slice(0, 4)
                    .map(
                      (e) =>
                        `${e.minute}' ${e.playerName ?? tr(e.textKey)}`,
                    )
                    .join(" · ")}
                </p>
              </div>
            )}
          </Section>

          <Section title={tr("mgr.tab.tactics")}>
            <div className="flex flex-wrap gap-1">
              {(["433", "442", "352", "4231"] as FormationId[]).map((f) => (
                <Button
                  key={f}
                  variant={
                    state.tactics.formation === f ? "chipActive" : "chip"
                  }
                  className="!px-2 !py-0.5 text-[10px]"
                  onClick={() => setFormation(f)}
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
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(["possession", "direct", "pressing"] as TacticStyle[]).map(
                (s) => (
                  <Button
                    key={s}
                    variant={state.tactics.style === s ? "chipActive" : "chip"}
                    className="!px-2 !py-0.5 text-[10px]"
                    onClick={() => setStyle(s)}
                  >
                    {tr(`mgr.style.${s}`)}
                  </Button>
                ),
              )}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(
                [
                  ["attack", state.tactics.attack],
                  ["midfield", state.tactics.midfield],
                  ["defense", state.tactics.defense],
                ] as const
              ).map(([key, val]) => (
                <label key={key} className="block">
                  <span className="font-mono text-[8px] uppercase text-white/35">
                    {tr(`mgr.axis.${key}`)} {val}
                  </span>
                  <input
                    type="range"
                    min={30}
                    max={80}
                    value={val}
                    onChange={(e) =>
                      updateTactics({ [key]: Number(e.target.value) })
                    }
                    className="mt-0.5 w-full accent-arena-accent"
                  />
                </label>
              ))}
            </div>
          </Section>

          <Section title={tr("mgr.tab.lineup")}>
            <Button
              variant="outline"
              className="mb-2 !px-2 !py-1 text-[10px]"
              onClick={doAutoLineup}
            >
              {tr("mgr.autoLineup")}
            </Button>
            <div className="grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2">
              {FORMATION_SLOTS[state.tactics.formation].map((slot, i) => {
                const pid = state.starters[i];
                return (
                  <div key={`slot-${i}`} className="flex items-center gap-1">
                    <span className="w-6 font-mono text-[9px] text-arena-accent">
                      {slot}
                    </span>
                    <select
                      className="min-w-0 flex-1 rounded-sm border border-white/10 bg-arena-bg px-1 py-0.5 text-[11px] text-white"
                      value={pid ?? ""}
                      onChange={(e) => assignStarter(i, e.target.value)}
                    >
                      {state.squad.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.pos} {p.name} ({p.ovr})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        {/* Col 2 — Squad + market */}
        <div className="space-y-3">
          <Section
            title={`${tr("mgr.tab.squad")} · ${state.squad.length}/${ECONOMY.maxSquadSize} · Ø${avgOvr}`}
          >
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-arena-bg font-mono text-[8px] uppercase text-white/35">
                  <tr>
                    <th className="py-1">{tr("mgr.pos")}</th>
                    <th>Nome</th>
                    <th>{tr("mgr.ovr")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...state.squad]
                    .sort((a, b) => b.ovr - a.ovr)
                    .map((p) => (
                      <tr
                        key={p.id}
                        className="border-t border-white/5 text-white/80"
                      >
                        <td className="py-0.5 font-mono text-arena-accent">
                          {p.pos}
                        </td>
                        <td className="truncate pr-1">
                          {p.isCaptain ? "© " : ""}
                          {p.name}
                          {p.takesPk ? " · BP" : ""}
                          {p.injuredWeeks > 0 ? " ⚕" : ""}
                        </td>
                        <td className="font-display">{p.ovr}</td>
                        <td>
                          {!state.starters.includes(p.id) &&
                            season.transferWindowOpen && (
                              <button
                                type="button"
                                className="cursor-pointer font-mono text-[8px] uppercase text-white/40 hover:text-arena-buzzer"
                                onClick={() => doSell(p.id)}
                              >
                                {tr("mgr.sell")}
                              </button>
                            )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section
            title={`${tr("mgr.tab.market")} · ${
              season.transferWindowOpen
                ? tr("mgr.windowOpen")
                : tr("mgr.windowClosed")
            } · ${signings}/${ECONOMY.maxSigningsPerWindow}`}
          >
            {!season.transferWindowOpen ? (
              <p className="text-[11px] text-white/40">{tr("mgr.windowClosed")}</p>
            ) : (
              <div className="max-h-52 space-y-1 overflow-y-auto">
                {state.market.slice(0, 12).map((listing) => {
                  const block = canBuyPlayer(state, listing);
                  return (
                    <div
                      key={listing.id}
                      className={`flex items-center justify-between gap-2 border-b py-1 text-[11px] ${
                        listing.isSuper
                          ? "border-arena-accent/30 bg-arena-accent/5"
                          : "border-white/5"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-white">
                          {listing.isSuper ? (
                            <span className="mr-1 font-mono text-[8px] uppercase text-arena-accent">
                              {tr("mgr.market.super")}
                            </span>
                          ) : null}
                          {listing.player.pos} {listing.player.name}{" "}
                          <span className="text-arena-accent">
                            {listing.player.ovr}
                          </span>
                        </p>
                        <p className="font-mono text-[8px] text-white/35">
                          {m(listing.askingPrice)}
                          {block !== "ok" ? (
                            <span className="ml-1 text-arena-buzzer/80">
                              · {tr(`mgr.block.${block}`)}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="shrink-0 !px-1.5 !py-0.5 text-[9px]"
                        disabled={block !== "ok"}
                        onClick={() => doBuy(listing.id)}
                      >
                        {tr("mgr.buy")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        {/* Col 3 — Table + news + actions */}
        <div className="space-y-3">
          <Section title={tr("mgr.tab.table")}>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-arena-bg font-mono text-[8px] uppercase text-white/35">
                  <tr>
                    <th className="py-1">#</th>
                    <th>{tr("mgr.table.club")}</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((row, i) => {
                    const c = getClub(row.clubId);
                    const mine = row.clubId === career.clubId;
                    return (
                      <tr
                        key={row.clubId}
                        className={`border-t border-white/5 ${
                          mine
                            ? "bg-arena-accent/10 text-arena-accent"
                            : "text-white/75"
                        }`}
                      >
                        <td className="py-0.5 font-mono">{i + 1}</td>
                        <td className="truncate font-display text-[11px]">
                          {c?.shortName ?? row.clubId}
                        </td>
                        <td className="font-display">{row.pts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title={tr("mgr.tab.overview")}>
            <p className="text-[11px] text-white/55">
              {career.careerWins ?? 0}V / {career.careerDraws ?? 0}E /{" "}
              {career.careerLosses ?? 0}D ·{" "}
              {tr(`mgr.origin.${career.origin ?? "assistant"}`)} ·{" "}
              {tr(`mgr.philosophy.${career.philosophy ?? "balanced"}`)}
            </p>
            {career.nationalCoach && nt && (
              <div className="mt-2 border border-arena-accent/30 bg-arena-accent/5 px-2 py-2">
                <p className="font-mono text-[9px] uppercase text-arena-accent">
                  {tr("mgr.nt.badge")}
                </p>
                <p className="mt-0.5 text-[11px] text-white/60">
                  {tr(`mgr.country.${nt.country}`)} ·{" "}
                  {tr("mgr.nt.titles", { n: nt.titles })}
                  {nt.pendingTournament
                    ? ` · ${tr(nt.pendingTournament.nameKey)}`
                    : ""}
                </p>
                <Button
                  className="mt-2 !px-2 !py-1 text-[10px]"
                  onClick={doOpenNational}
                >
                  {tr("mgr.nt.open")}
                </Button>
              </div>
            )}
            <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto">
              {state.news.slice(0, 5).map((n, i) => (
                <li
                  key={`${n}-${i}`}
                  className="border-l border-arena-accent/40 pl-2 text-[11px] text-white/55"
                >
                  {tr(n)}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-1">
              <Button
                variant="outline"
                className="!px-2 !py-1 text-[10px]"
                onClick={doRetire}
              >
                {tr("mgr.retire")}
              </Button>
              <Button
                variant="ghost"
                className="!px-2 !py-1 text-[10px]"
                onClick={restart}
              >
                {tr("mgr.restart")}
              </Button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useRef, useState } from "react";
import { toBlob, toPng } from "html-to-image";
import { Button } from "@/components/ui/Button";
import {
  useManagerActions,
  useManagerState,
} from "@/hooks/useManagerGame";
import { coachLegacyTheme } from "@/lib/manager/coachTheme";
import { emptyTrophyCabinet } from "@/lib/manager/legacy";
import { LEAGUES } from "@/lib/manager/clubs";

export function ManagerLegacy() {
  const { state } = useManagerState();
  const { tr, restart } = useManagerActions();
  const career = state.career!;
  const cabinet = career.trophyCabinet ?? emptyTrophyCabinet();
  const ovr = Math.round(career.ovr ?? career.reputation ?? 50);
  const tier = career.legacyTier ?? "prospect";
  const theme = coachLegacyTheme(tier);
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const stats: [string, number][] = [
    [tr("mgr.ovr"), ovr],
    [tr("mgr.legacy.leagueTitles"), cabinet.leagueTitles],
    [tr("mgr.legacy.topFlight"), cabinet.topFlightTitles],
    [tr("mgr.legacy.secondDiv"), cabinet.secondDivTitles],
    [tr("mgr.legacy.promotions"), cabinet.promotions],
    [tr("mgr.legacy.bigClub"), cabinet.bigClubTitles],
    [tr("mgr.legacy.wins"), career.careerWins ?? 0],
    [tr("mgr.legacy.seasons"), career.seasonsInCareer],
    [tr("mgr.legacy.clubs"), career.clubsManaged ?? 1],
  ];

  const fileName = `geracional-${career.coachName.replace(/\s+/g, "-").toLowerCase()}-legado.png`;

  const exportCard = useCallback(async () => {
    if (!cardRef.current || busy) return;
    setBusy(true);
    setShareMsg(null);
    try {
      const node = cardRef.current;
      const blob = await toBlob(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0a0c10",
      });
      if (!blob) throw new Error("blob");

      const canShare =
        typeof navigator !== "undefined" &&
        !!navigator.share &&
        (!!navigator.canShare
          ? navigator.canShare({
              files: [new File([blob], fileName, { type: "image/png" })],
            })
          : true);

      if (canShare) {
        const file = new File([blob], fileName, { type: "image/png" });
        await navigator.share({
          title: "Geracional",
          text: tr("mgr.legacy.shareText", { name: career.coachName, ovr }),
          files: [file],
        });
        setShareMsg(tr("mgr.legacy.shared"));
      } else {
        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: "#0a0c10",
        });
        const link = document.createElement("a");
        link.download = fileName;
        link.href = dataUrl;
        link.click();
        setShareMsg(tr("mgr.legacy.downloaded"));
      }
    } catch {
      try {
        if (!cardRef.current) return;
        const dataUrl = await toPng(cardRef.current, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: "#0a0c10",
        });
        const link = document.createElement("a");
        link.download = fileName;
        link.href = dataUrl;
        link.click();
        setShareMsg(tr("mgr.legacy.downloaded"));
      } catch {
        setShareMsg(tr("mgr.legacy.shareFail"));
      }
    } finally {
      setBusy(false);
    }
  }, [busy, career.coachName, fileName, ovr, tr]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 text-center sm:py-12">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-arena-accent">
        {tr("mgr.legacy.eyebrow")}
      </p>
      <h2 className="mt-2 font-display text-3xl uppercase text-white sm:text-4xl">
        {tr("mgr.legacy.title")}
      </h2>
      <p className="mt-2 text-sm text-white/55">
        {career.endReason === "retired"
          ? tr("mgr.legacy.retired")
          : tr("mgr.legacy.fired")}
      </p>

      <div
        ref={cardRef}
        className="mt-6 overflow-hidden rounded-sm border px-4 py-5 text-left"
        style={{
          borderColor: `${theme.accent}66`,
          background: `linear-gradient(160deg, ${theme.bg1}, ${theme.bg0})`,
          boxShadow: `0 0 28px ${theme.glow}`,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/45">
            Geracional
          </p>
          <p className="font-mono text-[9px] uppercase text-white/35">
            {tr(`mgr.legacy.tier.${tier}`)}
          </p>
        </div>
        <p className="mt-3 font-display text-2xl text-white">{career.coachName}</p>
        <p className="mt-1 font-mono text-[10px] uppercase text-white/50">
          {tr(`mgr.country.${career.country}`)} ·{" "}
          {tr(`mgr.origin.${career.origin ?? "assistant"}`)} ·{" "}
          {tr(`mgr.philosophy.${career.philosophy ?? "balanced"}`)}
        </p>
        <p
          className={`mt-4 text-center font-display text-5xl sm:text-6xl ${theme.ovrClass}`}
          style={{ textShadow: `0 0 24px ${theme.glow}` }}
        >
          {ovr}
        </p>
        <p className="text-center font-mono text-[10px] uppercase text-white/45">
          {tr("mgr.ovr")}
        </p>
        <p
          className={`mt-2 text-center font-display text-lg uppercase ${theme.titleClass}`}
        >
          {tr(`mgr.legacy.tier.${tier}`)}
        </p>
        <p className="mt-1 text-center text-xs text-white/50">
          {tr(`mgr.legacy.tier.${tier}.desc`)}
        </p>
        <p className="mt-2 text-center font-mono text-[10px] text-white/40">
          {career.clubName} · {tr(LEAGUES[career.leagueId].nameKey)}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {stats.slice(0, 6).map(([label, value]) => (
            <div
              key={label}
              className="rounded-sm border border-white/10 bg-black/25 px-2 py-1.5"
            >
              <p className="font-mono text-[8px] uppercase text-white/40">
                {label}
              </p>
              <p className="font-display text-lg text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-left sm:grid-cols-3">
        {stats.slice(6).map(([label, value]) => (
          <div
            key={label}
            className="rounded-sm border border-white/10 bg-black/30 px-3 py-2"
          >
            <p className="font-mono text-[9px] uppercase text-white/40">{label}</p>
            <p className="font-display text-xl text-white">{value}</p>
          </div>
        ))}
      </div>

      {shareMsg ? (
        <p className="mt-3 font-mono text-[10px] text-arena-accent">{shareMsg}</p>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          disabled={busy}
          onClick={exportCard}
        >
          {busy ? tr("mgr.legacy.sharing") : tr("mgr.legacy.share")}
        </Button>
        <Button className="w-full sm:w-auto" onClick={restart}>
          {tr("mgr.restart")}
        </Button>
      </div>
    </div>
  );
}

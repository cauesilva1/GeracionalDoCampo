import { clamp, pick, rand } from "@/lib/utils";
import { seedFinalsScore } from "@/lib/clutch";
import type { CareerState, FinalsContext } from "@/types/game";

export type KeyGameKind = "rival" | "ranking" | "showcase";

/** Build 3 key games for the season — streamer-friendly beats. */
export function buildKeyGames(
  career: CareerState,
  ovr: number,
): FinalsContext[] {
  const rival = career.rivalClubName ?? "Rival";
  const kinds: KeyGameKind[] = ["rival", "ranking", "showcase"];
  const franchise = 78;

  return kinds.map((kind) => {
    const oppStrength =
      kind === "rival"
        ? clamp(franchise + rand(2, 10), 70, 96)
        : kind === "ranking"
          ? clamp(franchise + rand(-4, 8), 68, 94)
          : clamp(70 + (ovr - 60) * 0.4 + rand(-3, 6), 66, 92);

    const edge = clamp((ovr + 8 - oppStrength) / 40, -0.2, 0.35);
    const winChance = clamp(0.42 + edge, 0.28, 0.72);
    const scores = seedFinalsScore(winChance);

    const titleKey =
      kind === "rival"
        ? "key.rival"
        : kind === "ranking"
          ? "key.ranking"
          : "key.showcase";

    const opponentName =
      kind === "rival"
        ? rival
        : kind === "ranking"
          ? pick(["key.opp.table", "key.opp.playoff", "key.opp.hot"])
          : pick(["key.opp.tv", "key.opp.spotlight", "key.opp.scout"]);

    return {
      competition: "key_game" as const,
      leagueId: career.leagueId,
      titleKey,
      opponentName,
      opponentStrength: Math.round(oppStrength),
      playerScore: scores.playerScore,
      opponentScore: scores.opponentScore,
      deficit: scores.deficit,
      winChanceOnSkip: winChance,
      franchiseStrength: franchise,
      keyKind: kind,
    };
  });
}

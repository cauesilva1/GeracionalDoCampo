# Lenda da Quadra

[Português](README.md) · **English** · [Español](README.es.md)

A browser basketball career simulator. Steal attributes from NBA legends in the draft, grow in your home league, and fight your way to EuroLeague and the NBA — with weighty decisions and playable crunch moments.

**Play:** [/play](https://github.com/cauesilva1/LendaDaQuadra) · locales: PT / EN / ES

---

## What you do

1. **Attribute draft** — pick legend stats (your career ceiling)
2. **How-to** — short pre-draft card explaining the loop
3. **Season** — 3 playable key games (Crunch Time style) + dilemma + quick sim
4. **Off-season** — train, clinic, or streetball (injury risk tied to draft ATH)
5. **National team** — World Cup and Olympics call-ups
6. **Goal** — national team → Euro → NBA, starting at **age 16 in 2016**

Progression, standings, and the scout bar are tuned so you are not stuck at low OVR or eternally last in the table.

---

## Stack

- **Next.js** (App Router) · **React** · **TypeScript**
- **Tailwind CSS** · **Framer Motion** · **Lucide**
- Persistence via `localStorage` (save key `lenda-da-quadra-v7`)

---

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Career: `/play` (or `/en/play`, `/es`).

```bash
npm run build   # production build
npm start       # serve the build
```

---

## Structure (overview)

| Area | Where |
|------|--------|
| Career UI | `src/components/play/` |
| State / simulation | `src/hooks/useGameSimulation.tsx` |
| Calendar / national team | `src/lib/calendar.ts` |
| Key games | `src/lib/keyGames.ts`, `src/lib/seasonFlow.ts` |
| Injury (ATH) | `src/lib/injury.ts` |
| Copy / i18n | `src/lib/i18n/dictionary.ts` |

---

## License

Personal / portfolio use — see the repository for details.

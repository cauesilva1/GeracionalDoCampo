import type { Locale } from "@/types/game";

type PageBlock = { title: string; body: string[] };

const SOBRE: Record<Locale, PageBlock> = {
  pt: {
    title: "Sobre",
    body: [
      "Geracional Rebuild é um manager de futebol no navegador: você assume um clube real, monta elenco, tática e mercado — com orçamento e teto salarial.",
      "O objetivo é reconstruir o time sob a pressão da diretoria, rodada a rodada.",
      "Projeto de fã. Nomes de clubes e jogadores são só para identificação; valores e resultados são aproximados/simulados. Sem afiliação com federações ou ligas.",
    ],
  },
  en: {
    title: "About",
    body: [
      "Geracional Rebuild is a browser football manager: take a real club, set lineup and tactics, and operate the market under a transfer budget and wage cap.",
      "Rebuild the squad under board pressure, matchday by matchday.",
      "Fan project. Club and player names are for identification only; values and results are approximate/simulated. No affiliation with leagues or federations.",
    ],
  },
  es: {
    title: "Sobre",
    body: [
      "Geracional Rebuild es un manager de fútbol en el navegador: asumís un club real, armás plantel y táctica, y operás el mercado con caja y tope salarial.",
      "Reconstruí el equipo bajo presión de la dirigencia, fecha a fecha.",
      "Proyecto de fan. Nombres de clubes y jugadores solo para identificación; valores y resultados son aproximados/simulados. Sin afiliación con ligas o federaciones.",
    ],
  },
};

const DOCS: Record<
  Locale,
  { title: string; sections: { h: string; p: string[] }[] }
> = {
  pt: {
    title: "Como o jogo funciona",
    sections: [
      {
        h: "Carreira de técnico",
        p: [
          "Escolha origem (ex-jogador, auxiliar, analista ou base) e filosofia de jogo.",
          "Comece na 2ª divisão, ganhe vitórias e títulos para subir o OVR do técnico e receber propostas maiores.",
        ],
      },
      {
        h: "Escolha o clube",
        p: [
          "Vários países com 1ª e 2ª divisão. Cada clube tem elenco real, verba de transferências e teto salarial.",
        ],
      },
      {
        h: "Hub do técnico",
        p: [
          "Escale o 11, defina formação/estilo, compre e venda na janela (máx. 3 contratações), simule a rodada.",
          "Elenco entre 18 e 25 jogadores. Taxas altas podem ser bloqueadas se a confiança da diretoria estiver baixa.",
        ],
      },
      {
        h: "Temporada",
        p: [
          "22 rodadas. Cumprir o objetivo (sobreviver, meio de tabela, top 4 ou título) mantém o emprego.",
        ],
      },
    ],
  },
  en: {
    title: "How the game works",
    sections: [
      {
        h: "Manager career",
        p: [
          "Pick your origin (ex-player, assistant, analyst or youth) and coaching philosophy.",
          "Start in the second tier, win matches and titles to raise your coach OVR and unlock bigger job offers.",
        ],
      },
      {
        h: "Pick a club",
        p: [
          "Several countries with 1st and 2nd divisions. Real squads, transfer cash and a wage cap.",
        ],
      },
      {
        h: "Manager hub",
        p: [
          "Set the XI, tactics, buy/sell in the window (max 3 signings), simulate matchdays.",
          "Squad size 18–25. Huge fees can be blocked if board confidence is low.",
        ],
      },
      {
        h: "Season",
        p: [
          "22 matchdays. Hit the board objective to keep the job.",
        ],
      },
    ],
  },
  es: {
    title: "Cómo funciona el juego",
    sections: [
      {
        h: "Carrera de DT",
        p: [
          "Elegí origen (exjugador, ayudante, analista o inferiores) y filosofía de juego.",
          "Empezá en 2ª, ganá partidos y títulos para subir el OVR del DT y desbloquear ofertas más grandes.",
        ],
      },
      {
        h: "Elegí el club",
        p: [
          "Varios países con 1ª y 2ª división. Planteles reales, caja de fichajes y tope salarial.",
        ],
      },
      {
        h: "Hub del DT",
        p: [
          "Armá el 11, táctica, comprá/vendé en la ventana (máx. 3 fichajes) y simulá fechas.",
          "Plantel 18–25. Montos altos pueden bloquearse si hay poca confianza.",
        ],
      },
      {
        h: "Temporada",
        p: [
          "22 fechas. Cumplir el objetivo de la dirigencia mantiene el cargo.",
        ],
      },
    ],
  },
};

const PRIVACY: Record<Locale, PageBlock> = {
  pt: {
    title: "Privacidade",
    body: [
      "O progresso fica salvo no navegador (localStorage). Não pedimos conta.",
      "Não usamos cookies de rastreamento de anúncios.",
    ],
  },
  en: {
    title: "Privacy",
    body: [
      "Progress is stored in your browser (localStorage). No account; saves are not uploaded.",
      "No ad-tracking cookies.",
    ],
  },
  es: {
    title: "Privacidad",
    body: [
      "El progreso se guarda en el navegador (localStorage). Sin cuenta; no subimos saves.",
      "Sin cookies de tracking publicitario.",
    ],
  },
};

export function getSobre(locale: Locale): PageBlock {
  return SOBRE[locale] ?? SOBRE.pt;
}

export function getDocs(locale: Locale) {
  return DOCS[locale] ?? DOCS.pt;
}

export function getPrivacy(locale: Locale): PageBlock {
  return PRIVACY[locale] ?? PRIVACY.pt;
}

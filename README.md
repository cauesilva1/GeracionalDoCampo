# Lenda da Quadra

**Português** · [English](README.en.md) · [Español](README.es.md)

Simulador de carreira de basquete no navegador. Você rouba atributos de lendas da NBA no draft, cresce na liga do seu país e luta para chegar à EuroLeague e à NBA — com decisões que pesam e momentos jogáveis.

**Jogar:** [/play](https://github.com/cauesilva1/LendaDaQuadra) · idiomas: PT / EN / ES

---

## O que você faz

1. **Draft de atributos** — escolhe stats de lendas (seu teto de carreira)
2. **How-to** — card rápido antes do draft explicando o loop
3. **Temporada** — 3 jogos-chave jogáveis (estilo Crunch Time) + dilema + simulação
4. **Off-season** — treino, clínica ou streetball (risco de lesão ligado ao ATL do draft)
5. **Seleção** — convocações para Copa do Mundo e Olimpíadas
6. **Meta** — seleção → Euro → NBA, começando com **16 anos em 2016**

Progressão, classificação e scout bar pensados para não ficar preso em OVR baixo nem sempre em último na tabela.

---

## Stack

- **Next.js** (App Router) · **React** · **TypeScript**
- **Tailwind CSS** · **Framer Motion** · **Lucide**
- Persistência em `localStorage` (save `lenda-da-quadra-v7`)

---

## Rodar local

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Carreira: `/play` (ou `/en/play`, `/es`).

```bash
npm run build   # build de produção
npm start       # servir o build
```

---

## Estrutura (resumo)

| Área | Onde |
|------|------|
| UI da carreira | `src/components/play/` |
| Estado / simulação | `src/hooks/useGameSimulation.tsx` |
| Calendário / seleção | `src/lib/calendar.ts` |
| Jogos-chave | `src/lib/keyGames.ts`, `src/lib/seasonFlow.ts` |
| Lesão (ATL) | `src/lib/injury.ts` |
| Textos / i18n | `src/lib/i18n/dictionary.ts` |

---

## Licença

Uso pessoal / portfólio — veja o repositório para detalhes.

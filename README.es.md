# Lenda da Quadra

[Português](README.md) · [English](README.en.md) · **Español**

Simulador de carrera de baloncesto en el navegador. Robas atributos de leyendas de la NBA en el draft, creces en la liga de tu país y luchas por llegar a la EuroLeague y la NBA — con decisiones con peso y momentos jugables.

**Jugar:** [/play](https://github.com/cauesilva1/LendaDaQuadra) · idiomas: PT / EN / ES

---

## Qué haces

1. **Draft de atributos** — eliges stats de leyendas (tu techo de carrera)
2. **How-to** — tarjeta rápida antes del draft que explica el loop
3. **Temporada** — 3 partidos clave jugables (estilo Crunch Time) + dilema + simulación
4. **Off-season** — entreno, clínica o streetball (riesgo de lesión ligado al ATL del draft)
5. **Selección** — convocatorias a Mundial y Juegos Olímpicos
6. **Meta** — selección → Euro → NBA, empezando con **16 años en 2016**

Progresión, clasificación y barra de scouts pensadas para no quedarte en OVR bajo ni siempre último en la tabla.

---

## Stack

- **Next.js** (App Router) · **React** · **TypeScript**
- **Tailwind CSS** · **Framer Motion** · **Lucide**
- Persistencia en `localStorage` (save `lenda-da-quadra-v7`)

---

## Correr en local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Carrera: `/play` (o `/en/play`, `/es`).

```bash
npm run build   # build de producción
npm start       # servir el build
```

---

## Estructura (resumen)

| Área | Dónde |
|------|--------|
| UI de carrera | `src/components/play/` |
| Estado / simulación | `src/hooks/useGameSimulation.tsx` |
| Calendario / selección | `src/lib/calendar.ts` |
| Partidos clave | `src/lib/keyGames.ts`, `src/lib/seasonFlow.ts` |
| Lesión (ATL) | `src/lib/injury.ts` |
| Textos / i18n | `src/lib/i18n/dictionary.ts` |

---

## Licencia

Uso personal / portafolio — consulta el repositorio para más detalles.

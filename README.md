# Germany – Vietnam Shipper Game

A shipper role-play web game that runs entirely in the browser: no database, no API calls.
Each player's progress is kept in `localStorage` on their own device. Designed for phones.

## How it plays

1. **Home screen** (hand-drawn poster theme): the game title, then a **START** button.
2. START reveals a **shaking bell**. Tapping it drops in a notification: *"10 orders need handling"*.
3. Tapping the notification opens the **order list**. Every player has one order, with the status
   *"Dispatching shipper [name]"*. Players find the order with their name, or use **Random draw**.
4. Inside an order: where it goes from and to, and an **Accept order** button. Accepting starts the animated
   map from the start point to the end point, with the status *"Delivering"* and a **Confirm delivered** button.
5. Confirming opens the **Congratulations!** pop-up.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3100
npm run build    # typecheck + production build into dist/
```

## Editing content

All content lives in `src/config/game.ts`:

- `GAME.title`: game name (currently a placeholder). `GAME.banner`: text on the blue banner. `GAME.subtitle`: the yellow line.
- `PLAYERS`: names of the people in the group. **Number of orders = number of names**. Add or remove a name and the
  order count follows.
- `ORDER_POOL`: items, start/end points, distance, shipping fee. Orders are dealt from this pool in turn, so it can be
  shorter than the player list.

## Deploying to GitHub Pages

Repository: https://github.com/LeDoanTrung/germany_vietnam_game

1. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds the site and publishes it to the `gh-pages` branch.
2. First time only: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / root**.
3. The game is live at https://ledoantrung.github.io/germany_vietnam_game/

## Technical notes

- Vue 3 + Vite + TypeScript, animations with GSAP.
- The home screen uses the hand-drawn poster theme (self-drawn SVG illustrations with a crayon texture filter); the
  in-game "shipper app" screens use a hologram style.
- Sounds are synthesised with the Web Audio API, so no audio files ship with the app.
- Fonts (bundled via `@fontsource`): Baloo 2, Mali, Be Vietnam Pro, Space Mono. All include Vietnamese diacritics,
  so accented player names render correctly.
- Honours the operating system's *reduce motion* setting (`prefers-reduced-motion`).

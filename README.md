# PhD Workshop 2026 – Shipper Role-Play Game

A shipper role-play web game for the KLU PhD Workshop (Saigon, 25–30 October 2026). Designed for phones, hosted on
GitHub Pages. The only backend is Firebase, which keeps the order list in sync so nobody takes an order twice.

## How it plays

1. **Home screen** (hand-drawn poster theme, KLU and Learn Logistics logos): type your name, tap **START**.
2. A notification drops in: *"12 orders need handling"*. Tap it to open the **order list**.
3. Pick an order (or use **Random draw**) and tap **Accept order**. Once someone takes an order it is locked for
   everyone else, and each player can only take one. The order then shows where to wait: **Gate 1, 2 or 3** of
   HCMC University of Technology, with the status *"Dispatching shipper [name]"*.
4. Ride to the destination. The **live map** shows the route and, if location is allowed, the player's position and
   the distance left. GPS is just for fun: it never blocks the game.
5. Tap **Confirm delivered** → **Congratulations!**

## Run locally

```bash
npm install
npm run dev          # http://localhost:3100
npm run build        # typecheck + production build into dist/
npm run test:rules   # check firestore.rules on the Firestore emulator (needs Java)
```

## Editing content

- `src/config/game.ts`: title, banner, subtitle, number of orders (`ORDER_COUNT`), gates and parcels.
- `src/config/route-waypoints.json`: start, destination and optional `via` stops of the ride, as
  `[latitude, longitude]` (Google Maps: long-press a spot to copy). After editing, run `npm run route` to regenerate
  `src/config/route-path.json`. The street path is precomputed, so the game never calls a routing API.

## Firebase setup (one time)

Until this is done the game runs in **local mode**: everything works, but each phone only knows about its own order.

1. Go to https://console.firebase.google.com → **Add project** (Google Analytics not needed). The free Spark plan is enough.
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**
3. **Build → Firestore Database → Create database** → pick a location close to Vietnam (e.g. `asia-southeast1`) → start in
   production mode.
4. **Firestore Database → Rules**: paste the contents of `firestore.rules`, then **Publish**.
5. **Project settings → Your apps → Web (`</>`)** → register an app → copy `apiKey`, `authDomain`, `projectId` and `appId`
   into `src/config/firebase.ts`. These values are public by design; the rules control access.
6. **Authentication → Settings → Authorized domains** → add `ledoantrung.github.io`.
7. Commit and push.

**Resetting for a new group:** delete the `rounds` collection in the Firestore console, or change `ROUND_ID` in
`src/config/firebase.ts` and redeploy.

## Deploying to GitHub Pages

Repository: https://github.com/LeDoanTrung/germany_vietnam_game

Push to `main`: the workflow builds the site and publishes it to `gh-pages`. The game is live at
https://ledoantrung.github.io/germany_vietnam_game/

## Technical notes

- Vue 3 + Vite + TypeScript, animations with GSAP.
- Live map: Leaflet with OpenStreetMap tiles (© OpenStreetMap contributors). Location stays on the phone; it is never sent.
  While the map is open the screen is kept awake, because phones pause GPS for web pages when the screen locks.
- Taking an order is a Firestore transaction, and `firestore.rules` enforces one order per order and one order per player
  on the server, so it holds even if two players tap at the same moment.
- Firebase and Leaflet are loaded on demand, so the home screen stays light on phones.
- Sounds are synthesised with the Web Audio API, so no audio files ship with the app.
- Honours the operating system's *reduce motion* setting (`prefers-reduced-motion`).

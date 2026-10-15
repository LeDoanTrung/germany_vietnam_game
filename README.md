# PhD Workshop 2026 – Shipper Role-Play Game

A shipper role-play web game for the KLU PhD Workshop (Saigon, 25–30 October 2026). Designed for phones, hosted on
GitHub Pages. The only backend is Firebase, which keeps the order list in sync so nobody takes an order twice.

## How it plays

1. **Home screen** (hand-drawn poster theme, KLU and Learn Logistics logos): type your name, tap **START**. If the name
   is already on someone's order, the player is asked to add an initial. Before taking an order they can still change it.
2. A notification drops in: *"14 orders need handling"*. Tap it to open the **order list**. Orders other players
   already took are locked (🔒).
3. Pick an order (or use **Random draw**) and tap **Accept order**. Each player takes one order, and nobody else can
   take it afterwards. The order shows where to wait (**Gate 1, 2 or 3** of HCMC University of Technology) and a
   one-time safety sheet. Picked the wrong one? **Release** it within 10 minutes.
4. Ride to the destination. The **live map** shows the suggested route, the player's real trail and the distance left.
5. **Confirm delivered** unlocks within 100 m of the destination (plus the phone's own GPS accuracy, capped at 50 m).
   If GPS can't help, the organiser reads out the **unlock code**. Then → **Congratulations!**

Always available: the red **SOS** button opens the group's WhatsApp chat and can copy the player's location as a Google
Maps link. Banners warn when the game is opened inside Messenger/Zalo (location often blocked there) or the phone is offline.

## Organiser page

Open the game URL with `#organiser`:
https://ledoantrung.github.io/germany_vietnam_game/#organiser

- Live table of every order: who took it, status, taken and delivered times. Names used on more than one order are
  highlighted (two people with one name, or one person on two browsers).
- **Release** an order (wrong pick, or a player whose phone died, so they can take it again on the new phone) or
  **Mark delivered** for them.
- **Codes**: the unlock code for players whose GPS won't work, and an optional event code required before START
  (leave empty = off). Saved in Firebase, so they're never in the public repo and players get changes instantly.
- **Reset round**: frees every order, e.g. to clear test data before the event.

### Organiser account (one time)

1. Firebase console → **Authentication → Sign-in method → Add new provider → Email/Password → Enable**.
2. **Authentication → Users → Add user**: enter the organiser's email and a password. Copy the **User UID** shown in the list.
3. **Firestore → Data → Start collection** `admins` → Document ID = that UID → add any field (e.g. `note` = `organiser`) → Save.
4. Open the organiser page and sign in. Set an **unlock code** first.

Organiser rights are checked by `firestore.rules`, so they can't be granted from the app.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3100
npm run build        # typecheck + production build into dist/
npm run test:rules   # check firestore.rules on the Firestore emulator (needs Java)
npm run test:firebase  # race two anonymous "phones" on the real project (smoke-test round)
VITE_FORCE_LOCAL=1 npm run dev   # play locally without taking real orders (unlock code: LOCAL)
```

## Editing content

- `src/config/game.ts`: title, banner, subtitle, number of orders (`ORDER_COUNT`), parcels, the SOS WhatsApp link,
  the delivery radius, and `GATE_INFO`: **how to find each gate** (a one-line hint and coordinates for a map pin).
  Gate details are still to be confirmed by the client; empty values are simply not shown.
- `src/config/route-waypoints.json`: start, destination and optional `via` stops of the suggested route, as
  `[latitude, longitude]` (Google Maps: long-press a spot to copy). After editing, run `npm run route` to regenerate
  `src/config/route-path.json`. The street path is precomputed, so the game never calls a routing API.

## Firebase setup (one time)

1. Go to https://console.firebase.google.com → **Add project** (Google Analytics not needed). The free Spark plan is enough.
2. **Authentication → Sign-in method → Anonymous → Enable.**
3. **Firestore Database → Create database** → location `asia-southeast1` → production mode.
4. **Firestore Database → Rules**: paste the contents of `firestore.rules`, then **Publish**. Do this again whenever
   `firestore.rules` changes.
5. **Settings → General → Your apps → Web (`</>`)** → register an app → copy `apiKey`, `authDomain`, `projectId` and
   `appId` into `src/config/firebase.ts`. These values are public by design; the rules control access.
6. **Authentication → Settings → Authorized domains** → add `ledoantrung.github.io`.
7. Google Cloud console → **APIs & Services → Credentials** → the Firebase browser key → **Websites** restriction with
   the game's domain, so the key only works from the game.

## Deploying to GitHub Pages

Repository: https://github.com/LeDoanTrung/germany_vietnam_game

Push to `main`: the workflow builds the site and publishes it to `gh-pages`. The game is live at
https://ledoantrung.github.io/germany_vietnam_game/

## Technical notes

- Vue 3 + Vite + TypeScript, animations with GSAP.
- Live map: Leaflet with OpenStreetMap tiles (© OpenStreetMap contributors). Location stays on the phone; it is never sent.
  While the map is open the screen is kept awake, because phones pause GPS for web pages when the screen locks.
- Taking an order is a Firestore transaction, and `firestore.rules` enforces one player per order and one order per
  player on the server, so it holds even if two players tap at the same moment.
- Confirming a delivery offline shows success straight away; Firestore sends it once the phone is back online.
- The unlock code is client-checked: it deters casual skipping, not a determined player (GPS can be faked anyway).
- Firebase, Leaflet and the organiser page are loaded on demand, so the home screen stays light on phones.
- Sounds are synthesised with the Web Audio API, so no audio files ship with the app.
- Honours the operating system's *reduce motion* setting (`prefers-reduced-motion`).

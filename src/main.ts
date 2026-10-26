import { createApp } from "vue";
// Be Vietnam Pro also covers Vietnamese diacritics, so player names with
// accents (the group is German–Vietnamese) render in the same face.
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/be-vietnam-pro/900.css";
// Poster theme on the home screen: chunky rounded titles + a handwritten face.
import "@fontsource/baloo-2/800.css";
import "@fontsource/mali/600.css";
import "@fontsource/mali/700.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "./styles/main.scss";
import App from "./App.vue";

// After a deploy, a page opened earlier asks for code files under their old
// names, which are gone, so e.g. the live map silently never appears. Reload
// once to pick up the new version (at most once a minute, to avoid a loop).
window.addEventListener("vite:preloadError", (event) => {
  try {
    const last = Number(sessionStorage.getItem("shipper-game:reloaded-at") ?? 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem("shipper-game:reloaded-at", String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

createApp(App).mount("#app");
// Tells the fallback in index.html that the game started (no "didn't load" screen).
(window as Window & { __gameStarted?: boolean }).__gameStarted = true;
document.getElementById("boot-fail")?.remove();

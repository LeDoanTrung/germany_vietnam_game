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

createApp(App).mount("#app");

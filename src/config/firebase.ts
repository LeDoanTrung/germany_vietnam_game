// Firebase lets every phone see which orders are taken, so two players can't
// take the same one. Paste the web app config from the Firebase console here
// (Project settings → Your apps → SDK setup and configuration → Config).
// These values are public by design; access is controlled by firestore.rules.
//
// While the config is empty the game runs in local mode: everything works,
// but each phone only knows about its own order.

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB8b7M30vQgBSRbz7FFyN5jfL-kz9YQCgc",
  authDomain: "phd-workshop-shipper-gam-61da5.firebaseapp.com",
  projectId: "phd-workshop-shipper-gam-61da5",
  appId: "1:1015545115194:web:7f06bae0ee7f77294dfb03",
};

/**
 * Orders are stored under this round. To reset the game for a new group,
 * change it (and redeploy) or delete the round in the Firebase console.
 * VITE_ROUND_ID points a test build at a throwaway round instead.
 */
export const ROUND_ID = import.meta.env.VITE_ROUND_ID || "phd-workshop-2026";

/**
 * `VITE_FORCE_LOCAL=1 npm run dev` runs the game in local mode even though
 * Firebase is configured, so testing on a laptop doesn't take real orders.
 */
export const firebaseEnabled =
  Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId) && import.meta.env.VITE_FORCE_LOCAL !== "1";

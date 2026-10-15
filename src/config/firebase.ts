// Firebase lets every phone see which orders are taken, so two players can't
// take the same one. Paste the web app config from the Firebase console here
// (Project settings → Your apps → SDK setup and configuration → Config).
// These values are public by design; access is controlled by firestore.rules.
//
// While the config is empty the game runs in local mode: everything works,
// but each phone only knows about its own order.

export const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: "",
};

/**
 * Orders are stored under this round. To reset the game for a new group,
 * change it (and redeploy) or delete the round in the Firebase console.
 */
export const ROUND_ID = "phd-workshop-2026";

export const firebaseEnabled = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

import { FIREBASE_CONFIG, ROUND_ID } from "../config/firebase";
import type { GameSettings } from "./claims";

// Firebase access for the organiser page. A separately named app instance, so
// an organiser signing in with email on a phone that is also playing never
// replaces that phone's anonymous player session.
//
// Organiser rights are checked by firestore.rules (a document in /admins/{uid}),
// never by this page.

export type OrganiserOrder = {
  id: string;
  status: "delivering" | "delivered";
  shipper: string;
  uid: string;
  claimedAt: number | null;
  deliveredAt: number | null;
};

export type OrganiserSnapshot = {
  orders: OrganiserOrder[];
  settings: GameSettings;
};

const load = async () => {
  const [{ initializeApp, getApps }, auth, firestore] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  const app = getApps().find((existing) => existing.name === "organiser") ?? initializeApp(FIREBASE_CONFIG, "organiser");
  return { auth, firestore, appAuth: auth.getAuth(app), db: firestore.getFirestore(app) };
};

let loaded: ReturnType<typeof load> | null = null;
const sdk = () => (loaded ??= load());

export const organiser = {
  async onUserChange(callback: (user: { uid: string; email: string | null } | null) => void) {
    const { auth, appAuth } = await sdk();
    return auth.onAuthStateChanged(appAuth, (user) =>
      callback(user && !user.isAnonymous ? { uid: user.uid, email: user.email } : null),
    );
  },

  /** Rejects with code "timeout" if Firebase doesn't answer, instead of hanging forever. */
  async signIn(email: string, password: string) {
    const { auth, appAuth } = await sdk();
    await Promise.race([
      auth.signInWithEmailAndPassword(appAuth, email.trim(), password),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "timeout" })), 15000),
      ),
    ]);
  },

  async signOut() {
    const { auth, appAuth } = await sdk();
    await auth.signOut(appAuth);
  },

  /** Rules only let a user read their own /admins doc, so this is a safe check. */
  async isAdmin(uid: string) {
    const { firestore, db } = await sdk();
    try {
      return (await firestore.getDoc(firestore.doc(db, "admins", uid))).exists();
    } catch {
      return false;
    }
  },

  async subscribe(onChange: (snapshot: OrganiserSnapshot) => void) {
    const { firestore, db } = await sdk();
    const { collection, doc, onSnapshot } = firestore;
    const current: OrganiserSnapshot = { orders: [], settings: { unlockCode: "", joinCode: "" } };

    const stopOrders = onSnapshot(collection(db, "rounds", ROUND_ID, "orders"), (snapshot) => {
      current.orders = snapshot.docs.map((entry) => {
        const data = entry.data({ serverTimestamps: "estimate" });
        return {
          id: entry.id,
          status: data.status,
          shipper: data.shipper,
          uid: data.uid,
          claimedAt: data.claimedAt?.toMillis() ?? null,
          deliveredAt: data.deliveredAt?.toMillis() ?? null,
        } as OrganiserOrder;
      });
      onChange({ ...current });
    });

    const stopSettings = onSnapshot(doc(db, "rounds", ROUND_ID, "settings", "main"), (snapshot) => {
      const data = snapshot.data() as Partial<GameSettings> | undefined;
      current.settings = { unlockCode: data?.unlockCode ?? "", joinCode: data?.joinCode ?? "" };
      onChange({ ...current });
    });

    return () => {
      stopOrders();
      stopSettings();
    };
  },

  /** Frees the order (and the player's record), so anyone can take it again. */
  async release(order: OrganiserOrder) {
    const { firestore, db } = await sdk();
    const batch = firestore.writeBatch(db);
    batch.delete(firestore.doc(db, "rounds", ROUND_ID, "orders", order.id));
    batch.delete(firestore.doc(db, "rounds", ROUND_ID, "players", order.uid));
    await batch.commit();
  },

  async markDelivered(order: OrganiserOrder) {
    const { firestore, db } = await sdk();
    await firestore.updateDoc(firestore.doc(db, "rounds", ROUND_ID, "orders", order.id), {
      status: "delivered",
      deliveredAt: firestore.serverTimestamp(),
    });
  },

  /** Clears every order and player record of the round. Codes are kept. */
  async resetRound() {
    const { firestore, db } = await sdk();
    const { collection, getDocs, writeBatch } = firestore;
    const [orders, players] = await Promise.all([
      getDocs(collection(db, "rounds", ROUND_ID, "orders")),
      getDocs(collection(db, "rounds", ROUND_ID, "players")),
    ]);
    const batch = writeBatch(db);
    [...orders.docs, ...players.docs].forEach((entry) => batch.delete(entry.ref));
    await batch.commit();
  },

  async saveSettings(settings: GameSettings) {
    const { firestore, db } = await sdk();
    await firestore.setDoc(firestore.doc(db, "rounds", ROUND_ID, "settings", "main"), {
      unlockCode: settings.unlockCode.trim().toUpperCase(),
      joinCode: settings.joinCode.trim().toUpperCase(),
    });
  },
};

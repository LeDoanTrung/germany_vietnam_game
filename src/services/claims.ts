import { FIREBASE_CONFIG, ROUND_ID, firebaseEnabled } from "../config/firebase";

// Who has taken which order, plus the organiser-set codes. Two implementations
// behind one interface:
//   online — Firebase, shared by every phone; taking an order is atomic, so
//            two players tapping at once can't both get it.
//   local  — localStorage on this phone only; used when Firebase isn't set up
//            or VITE_FORCE_LOCAL=1.

export type ClaimStatus = "delivering" | "delivered";

export type Claim = {
  status: ClaimStatus;
  shipper: string;
  /** Taken by the player on this device. */
  mine: boolean;
  /** When the order was taken (ms). Drives the 10-minute release window. */
  claimedAt: number;
};

/** Codes the organiser sets on the organiser page. Empty string = off. */
export type GameSettings = { unlockCode: string; joinCode: string };

export type ClaimResult =
  | { ok: true }
  | { ok: false; reason: "taken" }
  | { ok: false; reason: "already-has-order"; orderId: string }
  | { ok: false; reason: "offline" };

export interface ClaimsBackend {
  mode: "online" | "local";
  /** Calls `onChange` with the full claim map now and on every change. */
  subscribe(onChange: (claims: Record<string, Claim>) => void): () => void;
  subscribeSettings(onChange: (settings: GameSettings) => void): () => void;
  claim(orderId: string, shipper: string): Promise<ClaimResult>;
  /**
   * Marks the order delivered. Resolves once the server has it — which never
   * happens while offline, so callers must not wait on it to update the UI.
   */
  deliver(orderId: string): Promise<void>;
  /** Gives the order back (allowed for 10 minutes after taking it). */
  release(orderId: string): Promise<void>;
  /** Local mode only — online rounds are reset by the organiser. */
  reset?(): void;
}

/** Players can give an order back for this long after taking it. Matches firestore.rules. */
export const RELEASE_WINDOW_MS = 10 * 60 * 1000;

/** Rejects with an "offline" error if `promise` hasn't settled in time. */
const withTimeout = <T>(promise: Promise<T>, ms: number) =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "timeout" })), ms)),
  ]);

// ---------------------------------------------------------------- local ----

const LOCAL_KEY = "shipper-game:claims:v2";
/** Local mode has no organiser page, so the unlock code is fixed for testing. */
export const LOCAL_SETTINGS: GameSettings = { unlockCode: "LOCAL", joinCode: "" };

type StoredClaim = { status: ClaimStatus; shipper: string; claimedAt: number };

const readLocal = (): Record<string, StoredClaim> => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}") as Record<string, StoredClaim>;
  } catch {
    return {};
  }
};

const writeLocal = (claims: Record<string, StoredClaim>) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(claims));
  } catch {
    // Storage blocked — progress just won't survive a reload.
  }
};

const createLocalBackend = (): ClaimsBackend => {
  const listeners = new Set<(claims: Record<string, Claim>) => void>();
  let claims = readLocal();

  // On one phone every claim is the player's own.
  const view = () => Object.fromEntries(Object.entries(claims).map(([id, claim]) => [id, { ...claim, mine: true }]));
  const emit = () => listeners.forEach((listener) => listener(view()));

  const save = (next: Record<string, StoredClaim>) => {
    claims = next;
    writeLocal(claims);
    emit();
  };

  return {
    mode: "local",
    subscribe(onChange) {
      listeners.add(onChange);
      onChange(view());
      return () => listeners.delete(onChange);
    },
    subscribeSettings(onChange) {
      onChange(LOCAL_SETTINGS);
      return () => {};
    },
    async claim(orderId, shipper) {
      if (claims[orderId]) return { ok: false, reason: "taken" };
      const existing = Object.keys(claims)[0];
      if (existing) return { ok: false, reason: "already-has-order", orderId: existing };
      save({ ...claims, [orderId]: { status: "delivering", shipper, claimedAt: Date.now() } });
      return { ok: true };
    },
    async deliver(orderId) {
      const claim = claims[orderId];
      if (claim) save({ ...claims, [orderId]: { ...claim, status: "delivered" } });
    },
    async release(orderId) {
      const next = { ...claims };
      delete next[orderId];
      save(next);
    },
    reset() {
      save({});
    },
  };
};

// --------------------------------------------------------------- online ----

const createFirebaseBackend = async (): Promise<ClaimsBackend> => {
  // Loaded on demand so the home screen doesn't wait for the Firebase SDK.
  const [{ initializeApp, getApps }, { getAuth, signInAnonymously }, firestore] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  const { getFirestore, collection, doc, onSnapshot, runTransaction, serverTimestamp, updateDoc, writeBatch } = firestore;

  // The organiser page uses a separately named app, so its email sign-in never
  // replaces this phone's anonymous player session.
  const app = getApps().find((existing) => existing.name === "[DEFAULT]") ?? initializeApp(FIREBASE_CONFIG);
  const db = getFirestore(app);
  // Anonymous sign-in gives each phone a stable id without asking for an account.
  // Wait for the saved session first: after a reload (or a dead battery and a
  // recharge) the phone keeps the same uid, so its order is still "mine".
  const auth = getAuth(app);
  await auth.authStateReady();
  const user = auth.currentUser ?? (await withTimeout(signInAnonymously(auth), 15000)).user;
  const uid = user.uid;

  const ordersRef = collection(db, "rounds", ROUND_ID, "orders");
  const orderRef = (orderId: string) => doc(db, "rounds", ROUND_ID, "orders", orderId);
  const playerRef = doc(db, "rounds", ROUND_ID, "players", uid);
  const settingsRef = doc(db, "rounds", ROUND_ID, "settings", "main");

  return {
    mode: "online",
    subscribe(onChange) {
      return onSnapshot(ordersRef, (snapshot) => {
        const claims: Record<string, Claim> = {};
        snapshot.forEach((entry) => {
          const data = entry.data({ serverTimestamps: "estimate" }) as {
            status: ClaimStatus;
            shipper: string;
            uid: string;
            claimedAt?: { toMillis(): number } | null;
          };
          claims[entry.id] = {
            status: data.status,
            shipper: data.shipper,
            mine: data.uid === uid,
            claimedAt: data.claimedAt?.toMillis() ?? Date.now(),
          };
        });
        onChange(claims);
      });
    },
    subscribeSettings(onChange) {
      return onSnapshot(
        settingsRef,
        (snapshot) => {
          const data = snapshot.data() as Partial<GameSettings> | undefined;
          onChange({ unlockCode: data?.unlockCode ?? "", joinCode: data?.joinCode ?? "" });
        },
        () => onChange({ unlockCode: "", joinCode: "" }),
      );
    },
    async claim(orderId, shipper) {
      try {
        // The transaction re-reads both documents on the server, so if two
        // players tap the same order at once only the first write wins.
        // Transactions need a connection; the timeout turns a hang into a message.
        return await withTimeout(
          runTransaction(db, async (transaction): Promise<ClaimResult> => {
            const [order, player] = await Promise.all([transaction.get(orderRef(orderId)), transaction.get(playerRef)]);
            if (order.exists()) return { ok: false, reason: "taken" };
            if (player.exists()) {
              return { ok: false, reason: "already-has-order", orderId: String(player.data().orderId) };
            }
            transaction.set(orderRef(orderId), { status: "delivering", shipper, uid, claimedAt: serverTimestamp() });
            transaction.set(playerRef, { name: shipper, orderId, claimedAt: serverTimestamp() });
            return { ok: true };
          }),
          12000,
        );
      } catch (error) {
        // A rules rejection means someone beat us to it; anything else is connectivity.
        const code = (error as { code?: string }).code;
        return code === "permission-denied" ? { ok: false, reason: "taken" } : { ok: false, reason: "offline" };
      }
    },
    deliver(orderId) {
      // Firestore applies this locally straight away (the order list updates
      // even offline) and sends it when the connection is back.
      return updateDoc(orderRef(orderId), { status: "delivered", deliveredAt: serverTimestamp() });
    },
    async release(orderId) {
      const batch = writeBatch(db);
      batch.delete(orderRef(orderId));
      batch.delete(playerRef);
      await withTimeout(batch.commit(), 12000);
    },
  };
};

/**
 * Firebase when it's configured, otherwise local mode. If Firebase is
 * configured but unreachable this throws rather than quietly going local —
 * a silent fallback would let two players take the same order unnoticed.
 */
export const createClaimsBackend = async (): Promise<ClaimsBackend> => {
  if (!firebaseEnabled) return createLocalBackend();
  return createFirebaseBackend();
};

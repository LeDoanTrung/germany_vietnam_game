import { FIREBASE_CONFIG, ROUND_ID, firebaseEnabled } from "../config/firebase";

// Who has taken which order. Two implementations behind one interface:
//   online — Firebase, shared by every phone; taking an order is atomic, so
//            two players tapping at once can't both get it.
//   local  — localStorage on this phone only; used until Firebase is set up.

export type ClaimStatus = "delivering" | "delivered";

export type Claim = {
  status: ClaimStatus;
  shipper: string;
  /** Taken by the player on this device. */
  mine: boolean;
};

export type ClaimResult =
  | { ok: true }
  | { ok: false; reason: "taken" }
  | { ok: false; reason: "already-has-order"; orderId: string }
  | { ok: false; reason: "offline" };

export interface ClaimsBackend {
  mode: "online" | "local";
  /** Calls `onChange` with the full claim map now and on every change. */
  subscribe(onChange: (claims: Record<string, Claim>) => void): () => void;
  claim(orderId: string, shipper: string): Promise<ClaimResult>;
  deliver(orderId: string): Promise<void>;
  /** Local mode only — online rounds are reset by the organiser. */
  reset?(): void;
}

// ---------------------------------------------------------------- local ----

const LOCAL_KEY = "shipper-game:claims:v1";

type StoredClaim = { status: ClaimStatus; shipper: string };

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
  const emit = () => {
    const view = Object.fromEntries(Object.entries(claims).map(([id, claim]) => [id, { ...claim, mine: true }]));
    listeners.forEach((listener) => listener(view));
  };

  const save = (next: Record<string, StoredClaim>) => {
    claims = next;
    writeLocal(claims);
    emit();
  };

  return {
    mode: "local",
    subscribe(onChange) {
      listeners.add(onChange);
      onChange(Object.fromEntries(Object.entries(claims).map(([id, claim]) => [id, { ...claim, mine: true }])));
      return () => listeners.delete(onChange);
    },
    async claim(orderId, shipper) {
      if (claims[orderId]) return { ok: false, reason: "taken" };
      const existing = Object.keys(claims)[0];
      if (existing) return { ok: false, reason: "already-has-order", orderId: existing };
      save({ ...claims, [orderId]: { status: "delivering", shipper } });
      return { ok: true };
    },
    async deliver(orderId) {
      const claim = claims[orderId];
      if (claim) save({ ...claims, [orderId]: { ...claim, status: "delivered" } });
    },
    reset() {
      save({});
    },
  };
};

// --------------------------------------------------------------- online ----

const createFirebaseBackend = async (): Promise<ClaimsBackend> => {
  // Loaded on demand so the home screen doesn't wait for the Firebase SDK.
  const [{ initializeApp }, { getAuth, signInAnonymously }, firestore] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  const { getFirestore, collection, doc, onSnapshot, runTransaction, serverTimestamp, updateDoc } = firestore;

  const app = initializeApp(FIREBASE_CONFIG);
  const db = getFirestore(app);
  // Anonymous sign-in gives each phone a stable id without asking for an account.
  const { user } = await signInAnonymously(getAuth(app));
  const uid = user.uid;

  const ordersRef = collection(db, "rounds", ROUND_ID, "orders");
  const orderRef = (orderId: string) => doc(db, "rounds", ROUND_ID, "orders", orderId);
  const playerRef = doc(db, "rounds", ROUND_ID, "players", uid);

  return {
    mode: "online",
    subscribe(onChange) {
      return onSnapshot(ordersRef, (snapshot) => {
        const claims: Record<string, Claim> = {};
        snapshot.forEach((entry) => {
          const data = entry.data() as { status: ClaimStatus; shipper: string; uid: string };
          claims[entry.id] = { status: data.status, shipper: data.shipper, mine: data.uid === uid };
        });
        onChange(claims);
      });
    },
    async claim(orderId, shipper) {
      try {
        // The transaction re-reads both documents on the server, so if two
        // players tap the same order at once only the first write wins.
        return await runTransaction(db, async (transaction): Promise<ClaimResult> => {
          const [order, player] = await Promise.all([transaction.get(orderRef(orderId)), transaction.get(playerRef)]);
          if (order.exists()) return { ok: false, reason: "taken" };
          if (player.exists()) {
            return { ok: false, reason: "already-has-order", orderId: String(player.data().orderId) };
          }
          transaction.set(orderRef(orderId), { status: "delivering", shipper, uid, claimedAt: serverTimestamp() });
          transaction.set(playerRef, { name: shipper, orderId, claimedAt: serverTimestamp() });
          return { ok: true };
        });
      } catch (error) {
        // A rules rejection means someone beat us to it; anything else is connectivity.
        const code = (error as { code?: string }).code;
        return code === "permission-denied" ? { ok: false, reason: "taken" } : { ok: false, reason: "offline" };
      }
    },
    async deliver(orderId) {
      await updateDoc(orderRef(orderId), { status: "delivered", deliveredAt: serverTimestamp() });
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

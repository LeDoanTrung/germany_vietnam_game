// Smoke test against the real Firebase project (not the emulator):
//   node scripts/smoke-firebase.mjs
// Two "phones" sign in anonymously and race for the same order, exactly the way
// the app does. Writes go to a separate "smoke-test-…" round so the real game
// round is untouched; delete those rounds in the console afterwards if you like.

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { doc, getDoc, getFirestore, runTransaction, serverTimestamp, terminate, updateDoc } from "firebase/firestore";

const config = {
  apiKey: "AIzaSyB8b7M30vQgBSRbz7FFyN5jfL-kz9YQCgc",
  authDomain: "phd-workshop-shipper-gam-61da5.firebaseapp.com",
  projectId: "phd-workshop-shipper-gam-61da5",
  appId: "1:1015545115194:web:7f06bae0ee7f77294dfb03",
};
const ROUND = `smoke-test-${Date.now()}`;

const phone = async (name) => {
  const app = initializeApp(config, name);
  const { user } = await signInAnonymously(getAuth(app));
  return { name, uid: user.uid, db: getFirestore(app) };
};

const claim = ({ db, uid, name }, orderId) =>
  runTransaction(db, async (tx) => {
    const orderRef = doc(db, "rounds", ROUND, "orders", orderId);
    const playerRef = doc(db, "rounds", ROUND, "players", uid);
    const [order, player] = await Promise.all([tx.get(orderRef), tx.get(playerRef)]);
    if (order.exists()) return "taken";
    if (player.exists()) return "already-has-order";
    tx.set(orderRef, { status: "delivering", shipper: name, uid, claimedAt: serverTimestamp() });
    tx.set(playerRef, { name, orderId, claimedAt: serverTimestamp() });
    return "ok";
  }).catch((error) => `error: ${error.code ?? error.message}`);

const check = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) process.exitCode = 1;
};

const alex = await phone("Alex");
const ben = await phone("Ben");
check("anonymous sign-in works (two different users)", alex.uid !== ben.uid);

const [a, b] = await Promise.all([claim(alex, "o1"), claim(ben, "o1")]);
console.log(`      race for o1 → Alex: ${a}, Ben: ${b}`);
check("exactly one phone wins a simultaneous claim", [a, b].filter((r) => r === "ok").length === 1);

const winner = a === "ok" ? alex : ben;
const loser = a === "ok" ? ben : alex;
check("the other phone is told the order is taken", (a === "ok" ? b : a) === "taken");
check("the loser can still take a different order", (await claim(loser, "o2")) === "ok");
check("the winner cannot take a second order", (await claim(winner, "o3")) === "already-has-order");

// o2 belongs to the loser now.
const otherOrder = doc(winner.db, "rounds", ROUND, "orders", "o2");
const blocked = await updateDoc(otherOrder, { status: "delivered", deliveredAt: serverTimestamp() }).then(
  () => false,
  () => true,
);
check("rules stop marking someone else's order delivered", blocked);

await updateDoc(doc(winner.db, "rounds", ROUND, "orders", "o1"), { status: "delivered", deliveredAt: serverTimestamp() });
const saved = (await getDoc(doc(alex.db, "rounds", ROUND, "orders", "o1"))).data();
check("the winner can confirm delivery, and others see it", saved?.status === "delivered" && saved?.uid === winner.uid);

console.log(`      test data written under rounds/${ROUND}`);
await Promise.all([terminate(alex.db), terminate(ben.db)]);
process.exit();

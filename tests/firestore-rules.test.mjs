// Checks firestore.rules against the real Firestore emulator:
//   npm run test:rules
// Each "phone" is a separately signed-in user, writing exactly the way the
// app does (a transaction that creates the order and the player docs together).

import { readFile } from "node:fs/promises";
import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
  Timestamp,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

const ROUND = "test-round";

// Top-level await rather than a before() hook: Node 20's runner doesn't wait
// for a root-level async before() ahead of beforeEach().
const env = await initializeTestEnvironment({
  projectId: "shipper-game-test",
  firestore: { rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8085 },
});

beforeEach(() => env.clearFirestore());
after(() => env.cleanup());

const phone = (uid) => env.authenticatedContext(uid).firestore();
const orderRef = (db, id) => doc(db, "rounds", ROUND, "orders", id);
const playerRef = (db, uid) => doc(db, "rounds", ROUND, "players", uid);

// The same transaction the app runs in src/services/claims.ts.
const claim = (db, uid, orderId, shipper) =>
  runTransaction(db, async (tx) => {
    const [order, player] = await Promise.all([tx.get(orderRef(db, orderId)), tx.get(playerRef(db, uid))]);
    if (order.exists()) return "taken";
    if (player.exists()) return "already-has-order";
    tx.set(orderRef(db, orderId), { status: "delivering", shipper, uid, claimedAt: serverTimestamp() });
    tx.set(playerRef(db, uid), { name: shipper, orderId, claimedAt: serverTimestamp() });
    return "ok";
  });

test("a player can take a free order", async () => {
  assert.equal(await claim(phone("alex"), "alex", "o1", "Alex"), "ok");
});

test("a second player cannot take an order that is already taken", async () => {
  await claim(phone("alex"), "alex", "o1", "Alex");
  assert.equal(await claim(phone("ben"), "ben", "o1", "Ben"), "taken");
});

test("two players tapping the same order at once: exactly one gets it", async () => {
  const results = await Promise.allSettled(
    ["alex", "ben", "chloe", "dan", "emma"].map((uid) => claim(phone(uid), uid, "o1", uid)),
  );
  const winners = results.filter((result) => result.status === "fulfilled" && result.value === "ok");
  assert.equal(winners.length, 1, `expected one winner, got ${JSON.stringify(results)}`);

  // withSecurityRulesDisabled doesn't return the callback's value, so read into a variable.
  let saved;
  await env.withSecurityRulesDisabled(async (ctx) => {
    saved = (await getDoc(orderRef(ctx.firestore(), "o1"))).data();
  });
  assert.equal(saved.status, "delivering");
  // The stored shipper is the one whose transaction reported success.
  const winner = ["alex", "ben", "chloe", "dan", "emma"][results.findIndex((r) => r.status === "fulfilled" && r.value === "ok")];
  assert.equal(saved.uid, winner);
});

test("a player can only take one order", async () => {
  await claim(phone("alex"), "alex", "o1", "Alex");
  assert.equal(await claim(phone("alex"), "alex", "o2", "Alex"), "already-has-order");
});

test("rules block taking a second order even without the app's check", async () => {
  const db = phone("alex");
  await claim(db, "alex", "o1", "Alex");
  // A tampered client skipping the transaction's own check.
  await assertFails(
    setDoc(orderRef(db, "o2"), { status: "delivering", shipper: "Alex", uid: "alex", claimedAt: serverTimestamp() }),
  );
});

test("rules block overwriting someone else's order", async () => {
  await claim(phone("alex"), "alex", "o1", "Alex");
  await assertFails(
    setDoc(orderRef(phone("ben"), "o1"), { status: "delivering", shipper: "Ben", uid: "ben", claimedAt: serverTimestamp() }),
  );
});

test("rules block pretending to be another player", async () => {
  const db = phone("ben");
  await assertFails(
    runTransaction(db, async (tx) => {
      tx.set(orderRef(db, "o1"), { status: "delivering", shipper: "Alex", uid: "alex", claimedAt: serverTimestamp() });
      tx.set(playerRef(db, "ben"), { name: "Ben", orderId: "o1", claimedAt: serverTimestamp() });
    }),
  );
});

test("only the shipper can mark their order delivered", async () => {
  await claim(phone("alex"), "alex", "o1", "Alex");
  await assertFails(updateDoc(orderRef(phone("ben"), "o1"), { status: "delivered", deliveredAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(orderRef(phone("alex"), "o1"), { status: "delivered", deliveredAt: serverTimestamp() }));
});

test("an order cannot be deleted on its own (only released together with the player record)", async () => {
  await claim(phone("alex"), "alex", "o1", "Alex");
  await assertFails(deleteDoc(orderRef(phone("alex"), "o1")));
});

test("signed-out visitors cannot read or write", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(orderRef(db, "o1")));
  await assertFails(
    setDoc(orderRef(db, "o1"), { status: "delivering", shipper: "X", uid: "x", claimedAt: serverTimestamp() }),
  );
});

test("names longer than 24 characters are rejected", async () => {
  const db = phone("alex");
  await assertFails(claim(db, "alex", "o1", "A".repeat(25)));
});

// ---- Releasing an order --------------------------------------------------

// The same batch the app sends from "Release order".
const release = (db, uid, orderId) => {
  const batch = writeBatch(db);
  batch.delete(orderRef(db, orderId));
  batch.delete(playerRef(db, uid));
  return batch.commit();
};

test("a player can release their own order right after taking it, then take another", async () => {
  const db = phone("alex");
  await claim(db, "alex", "o1", "Alex");
  await assertSucceeds(release(db, "alex", "o1"));
  assert.equal(await claim(db, "alex", "o2", "Alex"), "ok");
  // and o1 is free again for someone else
  assert.equal(await claim(phone("ben"), "ben", "o1", "Ben"), "ok");
});

test("a player cannot release an order after 10 minutes", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const old = Timestamp.fromMillis(Date.now() - 11 * 60 * 1000);
    await setDoc(orderRef(db, "o1"), { status: "delivering", shipper: "Alex", uid: "alex", claimedAt: old });
    await setDoc(playerRef(db, "alex"), { name: "Alex", orderId: "o1", claimedAt: old });
  });
  await assertFails(release(phone("alex"), "alex", "o1"));
});

test("a player cannot release someone else's order", async () => {
  await claim(phone("alex"), "alex", "o1", "Alex");
  await assertFails(release(phone("ben"), "alex", "o1"));
  await assertFails(deleteDoc(orderRef(phone("ben"), "o1")));
});

test("a player cannot release an order that is already delivered", async () => {
  const db = phone("alex");
  await claim(db, "alex", "o1", "Alex");
  await updateDoc(orderRef(db, "o1"), { status: "delivered", deliveredAt: serverTimestamp() });
  await assertFails(release(db, "alex", "o1"));
});

test("deleting only the player record (to grab a second order) is blocked", async () => {
  const db = phone("alex");
  await claim(db, "alex", "o1", "Alex");
  await assertFails(deleteDoc(playerRef(db, "alex")));
});

test("claimedAt must be the server time (no faking a later release deadline)", async () => {
  const db = phone("alex");
  const future = Timestamp.fromMillis(Date.now() + 60 * 60 * 1000);
  await assertFails(
    runTransaction(db, async (tx) => {
      tx.set(orderRef(db, "o1"), { status: "delivering", shipper: "Alex", uid: "alex", claimedAt: future });
      tx.set(playerRef(db, "alex"), { name: "Alex", orderId: "o1", claimedAt: serverTimestamp() });
    }),
  );
});

// ---- Organisers ------------------------------------------------------------

const makeAdmin = (uid) =>
  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), "admins", uid), { note: "organiser" }));
const settingsRef = (db) => doc(db, "rounds", ROUND, "settings", "main");

test("an organiser can release anyone's order, even after 10 minutes", async () => {
  await makeAdmin("boss");
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const old = Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
    await setDoc(orderRef(db, "o1"), { status: "delivering", shipper: "Alex", uid: "alex", claimedAt: old });
    await setDoc(playerRef(db, "alex"), { name: "Alex", orderId: "o1", claimedAt: old });
  });
  await assertSucceeds(release(phone("boss"), "alex", "o1"));
});

test("an organiser can mark someone's order delivered", async () => {
  await makeAdmin("boss");
  await claim(phone("alex"), "alex", "o1", "Alex");
  await assertSucceeds(updateDoc(orderRef(phone("boss"), "o1"), { status: "delivered", deliveredAt: serverTimestamp() }));
});

test("an organiser can reset the round", async () => {
  await makeAdmin("boss");
  await claim(phone("alex"), "alex", "o1", "Alex");
  await claim(phone("ben"), "ben", "o2", "Ben");
  const db = phone("boss");
  const batch = writeBatch(db);
  for (const [uid, id] of [["alex", "o1"], ["ben", "o2"]]) {
    batch.delete(orderRef(db, id));
    batch.delete(playerRef(db, uid));
  }
  await assertSucceeds(batch.commit());
});

test("only organisers can set the codes; everyone signed in can read them", async () => {
  await makeAdmin("boss");
  await assertSucceeds(setDoc(settingsRef(phone("boss")), { unlockCode: "ABC123", joinCode: "" }));
  await assertFails(setDoc(settingsRef(phone("alex")), { unlockCode: "HACKED", joinCode: "" }));
  const read = await assertSucceeds(getDoc(settingsRef(phone("alex"))));
  assert.equal(read.data().unlockCode, "ABC123");
});

test("nobody can make themselves an organiser", async () => {
  await assertFails(setDoc(doc(phone("alex"), "admins", "alex"), { note: "me" }));
});

test("a player can see whether they are an organiser, but not who else is", async () => {
  await makeAdmin("boss");
  await assertSucceeds(getDoc(doc(phone("boss"), "admins", "boss")));
  await assertFails(getDoc(doc(phone("alex"), "admins", "boss")));
});

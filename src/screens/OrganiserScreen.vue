<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ORDERS } from "../config/game";
import { firebaseEnabled } from "../config/firebase";
import { organiser, type OrganiserOrder, type OrganiserSnapshot } from "../services/organiser";

// Organiser page (open the game URL with #organiser). Signs in with an email
// account that has a document in /admins/{uid}; firestore.rules enforce it.
// Shows every order live, and lets the organiser fix problems on the day:
// release a mistaken or stuck order, mark one delivered, reset the round, and
// set the unlock / join codes.

type Phase = "loading" | "signed-out" | "not-admin" | "ready";

const phase = ref<Phase>("loading");
const user = ref<{ uid: string; email: string | null } | null>(null);
const data = ref<OrganiserSnapshot>({ orders: [], settings: { unlockCode: "", joinCode: "" } });
const message = ref("");
const busy = ref(false);

let stopUser: (() => void) | null = null;
let stopData: (() => void) | null = null;

const flash = (text: string) => {
  message.value = text;
  window.setTimeout(() => {
    if (message.value === text) message.value = "";
  }, 4000);
};

onMounted(async () => {
  if (!firebaseEnabled) return;
  stopUser = await organiser.onUserChange(async (next) => {
    user.value = next;
    stopData?.();
    stopData = null;
    if (!next) {
      phase.value = "signed-out";
      return;
    }
    phase.value = "loading";
    if (!(await organiser.isAdmin(next.uid))) {
      phase.value = "not-admin";
      return;
    }
    stopData = await organiser.subscribe((snapshot) => (data.value = snapshot));
    phase.value = "ready";
  });
});

onBeforeUnmount(() => {
  stopUser?.();
  stopData?.();
});

// ---- Sign in ----

const email = ref("");
const password = ref("");
const showPassword = ref(false);

const SIGN_IN_ERRORS: Record<string, string> = {
  "auth/invalid-credential": "Wrong email or password.",
  "auth/invalid-login-credentials": "Wrong email or password.",
  "auth/wrong-password": "Wrong email or password.",
  "auth/user-not-found": "Wrong email or password.",
  "auth/invalid-email": "That doesn't look like an email address.",
  "auth/user-disabled": "This account has been disabled in Firebase.",
  "auth/too-many-requests": "Too many attempts — wait a minute and try again.",
  "auth/network-request-failed": "No connection to Firebase — check your internet, or switch off a VPN such as 1.1.1.1/WARP.",
  timeout: "Firebase didn't answer — check your internet, or switch off a VPN such as 1.1.1.1/WARP, then try again.",
};

const handleSignIn = async () => {
  busy.value = true;
  try {
    await organiser.signIn(email.value, password.value);
    password.value = "";
  } catch (error) {
    const code = (error as { code?: string }).code ?? "";
    flash(SIGN_IN_ERRORS[code] ?? `Couldn't sign in (${code || "unknown error"}).`);
  } finally {
    busy.value = false;
  }
};

// ---- Orders table ----

const ordersById = computed(() => new Map(data.value.orders.map((order) => [order.id, order])));

const rows = computed(() =>
  ORDERS.map((order) => ({ order, claim: ordersById.value.get(order.id) ?? null })),
);

const counts = computed(() => ({
  delivered: data.value.orders.filter((order) => order.status === "delivered").length,
  delivering: data.value.orders.filter((order) => order.status === "delivering").length,
  available: ORDERS.length - data.value.orders.length,
}));

/** The same name on several orders: two people sharing a name, or one person on two browsers. */
const duplicateNames = computed(() => {
  const seen = new Map<string, number>();
  data.value.orders.forEach((order) => {
    const key = order.shipper.trim().toLocaleLowerCase();
    seen.set(key, (seen.get(key) ?? 0) + 1);
  });
  return new Set([...seen].filter(([, count]) => count > 1).map(([name]) => name));
});
const isDuplicate = (claim: OrganiserOrder | null) =>
  !!claim && duplicateNames.value.has(claim.shipper.trim().toLocaleLowerCase());

const time = (ms: number | null) =>
  ms ? new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";

// Row actions need a second tap, so a mis-tap can't undo someone's game.
const pending = ref<string | null>(null);
let pendingTimer = 0;

const act = async (key: string, run: () => Promise<void>, done: string) => {
  if (pending.value !== key) {
    pending.value = key;
    window.clearTimeout(pendingTimer);
    pendingTimer = window.setTimeout(() => (pending.value = null), 4000);
    return;
  }
  pending.value = null;
  busy.value = true;
  try {
    await run();
    flash(done);
  } catch {
    flash("That didn't work — check your connection and try again.");
  } finally {
    busy.value = false;
  }
};

const release = (claim: OrganiserOrder, number: number) =>
  act(`release:${claim.id}`, () => organiser.release(claim), `Order ${number} is free again.`);
const deliver = (claim: OrganiserOrder, number: number) =>
  act(`deliver:${claim.id}`, () => organiser.markDelivered(claim), `Order ${number} marked delivered.`);

// ---- Codes ----

const unlockCode = ref("");
const joinCode = ref("");
// Fill the form from the saved values whenever they change elsewhere.
watch(
  () => data.value.settings,
  (settings) => {
    unlockCode.value = settings.unlockCode;
    joinCode.value = settings.joinCode;
  },
  { immediate: true },
);

const codesChanged = computed(
  () =>
    unlockCode.value.trim().toUpperCase() !== data.value.settings.unlockCode ||
    joinCode.value.trim().toUpperCase() !== data.value.settings.joinCode,
);

const saveCodes = async () => {
  busy.value = true;
  try {
    await organiser.saveSettings({ unlockCode: unlockCode.value, joinCode: joinCode.value });
    flash("Codes saved — players get them straight away.");
  } catch {
    flash("Couldn't save the codes — check your connection.");
  } finally {
    busy.value = false;
  }
};

// ---- Reset ----

const resetConfirm = ref("");

const resetRound = async () => {
  if (resetConfirm.value.trim().toUpperCase() !== "RESET") return;
  busy.value = true;
  try {
    await organiser.resetRound();
    resetConfirm.value = "";
    flash("Round reset — every order is available again.");
  } catch {
    flash("Couldn't reset the round — check your connection.");
  } finally {
    busy.value = false;
  }
};

const gameUrl = computed(() => location.href.replace(/#.*$/, ""));
</script>

<template>
  <div class="org">
    <header class="org-head">
      <div>
        <p class="org-kicker">PhD Workshop 2026 · Shipper game</p>
        <h1 class="org-title">Organiser</h1>
      </div>
      <div v-if="user" class="org-user">
        <span>{{ user.email }}</span>
        <button type="button" class="org-link" @click="organiser.signOut()">Sign out</button>
      </div>
    </header>

    <p v-if="message" class="org-flash" role="status">{{ message }}</p>

    <section v-if="!firebaseEnabled" class="org-card">
      <p>Firebase isn't configured for this build, so there's nothing to manage.</p>
    </section>

    <section v-else-if="phase === 'loading'" class="org-card">
      <p>Loading…</p>
    </section>

    <form v-else-if="phase === 'signed-out'" class="org-card org-login" @submit.prevent="handleSignIn">
      <h2>Sign in</h2>
      <label>
        Email
        <input v-model="email" type="email" autocomplete="username" required />
      </label>
      <label>
        Password
        <span class="org-password">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            required
          />
          <button
            type="button"
            class="org-password-toggle"
            :aria-pressed="showPassword"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? "Hide" : "Show" }}
          </button>
        </span>
      </label>
      <button type="submit" class="org-button" :disabled="busy">{{ busy ? "Signing in…" : "Sign in" }}</button>
    </form>

    <section v-else-if="phase === 'not-admin'" class="org-card">
      <h2>This account isn't an organiser yet</h2>
      <p>
        In the Firebase console → Firestore → Data, create a collection <code>admins</code> with a document whose ID is:
      </p>
      <p><code class="org-uid">{{ user?.uid }}</code></p>
      <p>Then reload this page.</p>
    </section>

    <template v-else>
      <section class="org-stats" aria-label="Round summary">
        <div><b>{{ counts.delivered }}</b><span>Delivered</span></div>
        <div><b>{{ counts.delivering }}</b><span>On the way</span></div>
        <div><b>{{ counts.available }}</b><span>Available</span></div>
      </section>

      <p v-if="duplicateNames.size" class="org-warn">
        ⚠️ The same name is on more than one order (highlighted). Either two people share a name, or one person is
        playing on two browsers.
      </p>

      <section class="org-card">
        <h2>Orders</h2>
        <div class="org-table-wrap">
          <table class="org-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Shipper</th>
                <th scope="col">Status</th>
                <th scope="col">Gate</th>
                <th scope="col">Taken</th>
                <th scope="col">Delivered</th>
                <th scope="col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="{ order, claim } in rows" :key="order.id" :class="{ 'org-row-dup': isDuplicate(claim) }">
                <td>{{ order.number }}</td>
                <td>{{ claim?.shipper ?? "—" }}</td>
                <td>
                  <span :class="['org-status', `org-status-${claim?.status ?? 'available'}`]">
                    {{ claim ? (claim.status === "delivered" ? "Delivered" : "On the way") : "Available" }}
                  </span>
                </td>
                <td>{{ order.gate }}</td>
                <td>{{ time(claim?.claimedAt ?? null) }}</td>
                <td>{{ time(claim?.deliveredAt ?? null) }}</td>
                <td class="org-actions">
                  <template v-if="claim">
                    <button
                      v-if="claim.status === 'delivering'"
                      type="button"
                      class="org-small"
                      :disabled="busy"
                      @click="deliver(claim, order.number)"
                    >
                      {{ pending === `deliver:${claim.id}` ? "Tap to confirm" : "Mark delivered" }}
                    </button>
                    <button type="button" class="org-small org-small-danger" :disabled="busy" @click="release(claim, order.number)">
                      {{ pending === `release:${claim.id}` ? "Tap to confirm" : "Release" }}
                    </button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="org-help">
          <b>Release</b> frees an order so anyone can take it — use it for a wrong pick, or a player whose phone died
          (they can take it again on the new phone). <b>Mark delivered</b> finishes it for them.
        </p>
      </section>

      <form class="org-card" @submit.prevent="saveCodes">
        <h2>Codes</h2>
        <label>
          Unlock code
          <input v-model="unlockCode" type="text" maxlength="16" autocomplete="off" placeholder="e.g. BIA2026" />
          <small>
            Read it out to a player whose GPS won't work, so they can confirm their delivery.
            <b v-if="!data.settings.unlockCode">No code set yet — players with GPS problems can't finish.</b>
          </small>
        </label>
        <label>
          <span>Event code <em>(optional)</em></span>
          <input v-model="joinCode" type="text" maxlength="16" autocomplete="off" placeholder="Leave empty = off" />
          <small>When set, players must type it before START. Only switch it on once everyone has been told the code.</small>
        </label>
        <button type="submit" class="org-button" :disabled="busy || !codesChanged">Save codes</button>
      </form>

      <form class="org-card org-danger" @submit.prevent="resetRound">
        <h2>Reset the round</h2>
        <p>Frees every order — use it to clear test data before the event. Codes are kept. This can't be undone.</p>
        <label>
          <span>Type <b>RESET</b> to confirm</span>
          <input v-model="resetConfirm" type="text" autocomplete="off" />
        </label>
        <button type="submit" class="org-button org-button-danger" :disabled="busy || resetConfirm.trim().toUpperCase() !== 'RESET'">
          Reset round
        </button>
      </form>

      <p class="org-help">Players use the game at <a :href="gameUrl">{{ gameUrl }}</a></p>
    </template>
  </div>
</template>

<style scoped lang="scss">
.org {
  min-height: 100vh; // fallback: iOS < 15.4 has no dvh
  min-height: 100dvh;
  max-width: 920px;
  margin: 0 auto;
  padding: var(--space-lg) var(--space-md) var(--space-xl);
  color: var(--color-text-100);

  h2 {
    margin-bottom: var(--space-sm);
    font-size: 18px;
    font-weight: 900;
  }

  p {
    margin-bottom: var(--space-xs);
  }

  code {
    font-family: var(--font-mono);
    color: var(--color-amber-300);
  }

  &-head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
  }

  &-kicker {
    font-size: 13px;
    color: var(--color-text-300);
  }

  &-title {
    font-size: 30px;
    font-weight: 900;
  }

  &-user {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: 14px;
    color: var(--color-text-300);
  }

  &-link {
    border: none;
    background: none;
    color: var(--color-cyan-300);
    text-decoration: underline;
    cursor: pointer;
  }

  &-flash {
    position: sticky;
    top: var(--space-sm);
    z-index: 5;
    padding: 10px 14px;
    border: 1px solid var(--color-amber-400);
    border-radius: var(--radius-md);
    background: rgba(10, 30, 66, 0.96);
    font-weight: 700;
  }

  &-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
    padding: var(--space-md);
    border: 1px solid rgba(52, 191, 255, 0.35);
    border-radius: var(--radius-md);
    background: rgba(7, 29, 69, 0.7);

    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-weight: 700;
      font-size: 14px;
    }

    input {
      min-height: 46px;
      padding: 8px 12px;
      border: 1px solid rgba(52, 191, 255, 0.5);
      border-radius: var(--radius-sm);
      background: rgba(2, 10, 28, 0.85);
      color: var(--color-text-100);
      font: inherit;
      font-size: 16px;
      font-weight: 400;
    }

    small {
      font-weight: 400;
      font-size: 13px;
      color: var(--color-text-300);

      b {
        display: block;
        color: var(--color-amber-300);
      }
    }
  }

  &-login {
    max-width: 380px;
  }

  // Password field with a Show/Hide button inside it.
  &-password {
    position: relative;
    display: flex;

    input {
      flex: 1;
      min-width: 0;
      padding-right: 70px;
    }

    &-toggle {
      position: absolute;
      top: 50%;
      right: 6px;
      transform: translateY(-50%);
      min-width: 56px;
      min-height: 34px;
      border: 1px solid rgba(52, 191, 255, 0.4);
      border-radius: var(--radius-pill);
      background: rgba(52, 191, 255, 0.12);
      color: var(--color-cyan-100);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
  }

  &-uid {
    display: inline-block;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    background: rgba(2, 10, 28, 0.85);
    user-select: all;
    word-break: break-all;
  }

  &-button {
    align-self: flex-start;
    min-height: 46px;
    padding: 10px 20px;
    border: none;
    border-radius: var(--radius-pill);
    background: var(--color-amber-400);
    color: #1d1200;
    font-weight: 900;
    cursor: pointer;

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    &-danger {
      background: var(--color-red-400);
      color: #fff;
    }
  }

  &-danger {
    border-color: rgba(255, 93, 108, 0.5);
  }

  &-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-sm);
    margin-bottom: var(--space-md);

    div {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--space-sm);
      border: 1px solid rgba(52, 191, 255, 0.35);
      border-radius: var(--radius-md);
      background: rgba(7, 29, 69, 0.7);
    }

    b {
      font-size: 28px;
      font-weight: 900;
    }

    span {
      font-size: 13px;
      color: var(--color-text-300);
    }
  }

  &-warn {
    padding: 10px 14px;
    border-left: 3px solid var(--color-amber-400);
    border-radius: var(--radius-sm);
    background: rgba(255, 176, 32, 0.12);
    font-size: 14px;
  }

  // Wide table scrolls on its own on a phone, not the whole page.
  &-table-wrap {
    overflow-x: auto;
  }

  &-table {
    width: 100%;
    min-width: 620px;
    border-collapse: collapse;
    font-size: 14px;

    th,
    td {
      padding: 8px 6px;
      border-bottom: 1px solid rgba(52, 191, 255, 0.15);
      text-align: left;
      white-space: nowrap;
    }

    th {
      font-size: 12px;
      color: var(--color-text-300);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
  }

  &-row-dup td {
    background: rgba(255, 176, 32, 0.12);
  }

  &-status {
    padding: 2px 8px;
    border-radius: var(--radius-pill);
    font-size: 12px;
    font-weight: 700;

    &-available {
      color: var(--color-cyan-300);
      border: 1px solid rgba(52, 191, 255, 0.5);
    }

    &-delivering {
      color: var(--color-amber-300);
      border: 1px solid rgba(255, 176, 32, 0.6);
    }

    &-delivered {
      color: var(--color-green-400);
      border: 1px solid rgba(62, 224, 143, 0.6);
    }
  }

  &-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  }

  &-small {
    min-height: 34px;
    padding: 4px 10px;
    border: 1px solid rgba(52, 191, 255, 0.5);
    border-radius: var(--radius-pill);
    background: rgba(52, 191, 255, 0.12);
    color: var(--color-text-100);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;

    &-danger {
      border-color: rgba(255, 93, 108, 0.6);
      background: rgba(255, 93, 108, 0.12);
    }

    &:disabled {
      opacity: 0.5;
    }
  }

  &-help {
    font-size: 13px;
    color: var(--color-text-300);

    a {
      color: var(--color-cyan-300);
      word-break: break-all;
    }
  }
}
</style>

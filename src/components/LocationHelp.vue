<script setup lang="ts">
import { isAndroid, isIOS, iosBrowserApp } from "../utils/device";

// Step-by-step help to switch location back on, for the phone and browser
// the player actually has (iPhone + Chrome differs from iPhone + Safari).
</script>

<template>
  <details class="location-help" open>
    <summary>How do I turn location on?</summary>

    <!-- iPhone, Chrome/Firefox/Edge: the app itself needs permission in iOS Settings -->
    <ol v-if="isIOS && iosBrowserApp">
      <li>Open <b>Settings → Privacy &amp; Security → Location Services</b> and make sure it's <b>on</b>.</li>
      <li>Scroll down the list of apps and tap <b>{{ iosBrowserApp }}</b>.</li>
      <li>Choose <b>While Using the App</b>, and switch <b>Precise Location</b> on.</li>
      <li>Come back to {{ iosBrowserApp }} and tap <b>Try again</b> below. If {{ iosBrowserApp }} asks, tap <b>Allow</b>.</li>
    </ol>

    <!-- iPhone, Safari -->
    <ol v-else-if="isIOS">
      <li>Open <b>Settings → Privacy &amp; Security → Location Services</b> and make sure it's <b>on</b>.</li>
      <li>In the same list, tap <b>Safari Websites</b> → <b>While Using the App</b>, and switch <b>Precise Location</b> on.</li>
      <li>Back in Safari, tap <b>aA</b> in the address bar → <b>Website Settings → Location → Allow</b>.</li>
      <li>Tap <b>Try again</b> below.</li>
    </ol>

    <ol v-else-if="isAndroid">
      <li>Swipe down from the top of the screen and switch <b>Location</b> on.</li>
      <li>In Chrome, tap the icon left of the address → <b>Permissions → Location → Allow</b>.</li>
      <li>Tap <b>Try again</b> below.</li>
    </ol>

    <ol v-else>
      <li>Turn location on in your phone's settings.</li>
      <li>Allow location for this website in your browser's site settings.</li>
      <li>Tap <b>Try again</b> below.</li>
    </ol>
  </details>
</template>

<style scoped lang="scss">
.location-help {
  font-size: 13px;
  color: var(--color-text-300);

  summary {
    min-height: 36px;
    display: flex;
    align-items: center;
    color: var(--color-cyan-300);
    font-weight: 700;
    cursor: pointer;
  }

  ol {
    display: grid;
    gap: 4px;
    margin: 4px 0 0;
    padding-left: 18px;
    list-style: decimal;
  }

  b {
    color: var(--color-text-100);
  }
}
</style>

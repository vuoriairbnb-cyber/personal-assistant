(() => {
  const helpers = globalThis.KideChromePoc;
  const WATCH_KEY = "kideAutoReservationWatch";
  const ACTION_BUTTON = /add to cart|reserve|add ticket|lisää ostoskoriin|varaa|lisää lippu/i;
  const SOLD_OUT = /sold out|loppuunmyyty|unavailable|ei saatavilla/i;
  const RESERVATION_UI = /active cart|reservation|reserved|cart|basket|ostoskori|varattu|varaus|minuuttia jäljellä|minutes? remaining/i;
  let armedTarget = null; let observer = null; let wakeTimer = null; let reloadTimer = null; let attemptLock = false;

  function visible(element) { const style = window.getComputedStyle(element); return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0; }
  function visibleText(element) { return visible(element) ? helpers.normalizeWhitespace(element.innerText || element.textContent) : ""; }
  function findExactVariantElement(target) { for (const element of document.body.querySelectorAll("body *")) if (helpers.exactVariantMatch(visibleText(element), target)) return element; return null; }
  function localContainers(variantElement) { const containers = []; let current = variantElement; for (let depth = 0; current && depth < 8; depth += 1, current = current.parentElement) if (current.matches("article, li, section, [role='listitem'], [role='group']") || current.querySelector("button, [role='button']")) containers.push(current); return containers; }
  function findReservationButtonForVariant(variantElement) {
    const reservationItem = variantElement.closest('o-item[ng-click*="onCreateEditOrCancelReservation"], o-item[data-ng-click*="onCreateEditOrCancelReservation"]');
    if (reservationItem && visible(reservationItem) && helpers.isKideReservationControl(reservationItem.tagName, reservationItem.getAttribute("ng-click"), reservationItem.getAttribute("data-ng-click")) && !SOLD_OUT.test(visibleText(reservationItem)) && !reservationItem.matches("[disabled], [aria-disabled='true']")) return reservationItem;
    for (const container of localContainers(variantElement)) for (const button of container.querySelectorAll("button, [role='button']")) { const label = helpers.normalizeWhitespace(button.innerText || button.getAttribute("aria-label") || ""); if (visible(button) && ACTION_BUTTON.test(label) && !SOLD_OUT.test(label) && !button.matches("[disabled], [aria-disabled='true']")) return button; }
    return null;
  }
  function reservationSignal() { for (const element of document.body.querySelectorAll("body *")) { const text = visibleText(element); if (text && RESERVATION_UI.test(text) && text.length < 500) return text; } return null; }
  function waitFor(check, timeoutMs = 25_000) { return new Promise((resolve) => { const initial = check(); if (initial) return resolve(initial); const watch = new MutationObserver(() => { const value = check(); if (value) { watch.disconnect(); clearTimeout(timeout); resolve(value); } }); const timeout = window.setTimeout(() => { watch.disconnect(); resolve(null); }, timeoutMs); watch.observe(document.body, { childList: true, subtree: true, characterData: true }); }); }
  function verificationRequired() { return helpers.pageHasChallenge(document.body.innerText || ""); }
  function clearWatchRuntime() { observer?.disconnect(); observer = null; clearTimeout(wakeTimer); clearTimeout(reloadTimer); wakeTimer = null; reloadTimer = null; }
  async function readWatch() { return (await chrome.storage.local.get(WATCH_KEY))[WATCH_KEY] ?? null; }
  async function writeWatch(watch) { await chrome.storage.local.set({ [WATCH_KEY]: watch }); return watch; }
  async function terminal(watch, terminalResult, message) { clearWatchRuntime(); return writeWatch({ ...watch, armed: false, terminalResult, status: terminalResult, message, completedAt: Date.now() }); }
  function showIndicator(watch, status) { let badge = document.querySelector("#kide-auto-reserve-indicator"); if (!watch.armed) return badge?.remove(); if (!badge) { badge = document.createElement("div"); badge.id = "kide-auto-reserve-indicator"; badge.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:2147483647;padding:8px 10px;border-radius:6px;background:#3f2c88;color:#fff;font:12px system-ui;box-shadow:0 2px 10px #0004;pointer-events:none"; document.body.append(badge); } badge.textContent = `KIDE AUTO RESERVE ARMED · ${watch.variantName} · ${status}`; }

  async function locateTarget({ eventId, variantName }) {
    if (helpers.pageEventId(location.href) !== eventId) return { state: "EVENT_NOT_FOUND", message: "Open the selected Kide event and try again." };
    if (verificationRequired()) return { state: "VERIFICATION_REQUIRED", message: "Complete Kide's normal verification manually. The extension will not bypass it." };
    const variantElement = await waitFor(() => findExactVariantElement(variantName));
    if (!variantElement) return { state: "VARIANT_NOT_FOUND", message: `Exact variant not found: ${variantName}` };
    const button = findReservationButtonForVariant(variantElement);
    if (!button) return { state: "VARIANT_NOT_AVAILABLE", message: "No enabled reservation control was found within this variant's local DOM block." };
    return { state: "FOUND", eventName: helpers.normalizeWhitespace(document.querySelector("h1")?.innerText || document.title), variantName: helpers.normalizeWhitespace(variantName) };
  }

  async function markAttempted(watch) {
    const latest = await readWatch();
    if (!latest?.armed || latest.reservationAttempted || Date.now() >= latest.expiresAt || latest.eventId !== watch.eventId || attemptLock) return null;
    attemptLock = true;
    return writeWatch({ ...latest, reservationAttempted: true, status: "ATTEMPTING_RESERVATION", attemptedAt: Date.now() });
  }

  async function inspectAutoWatch() {
    const watch = await readWatch();
    if (!watch?.armed) return clearWatchRuntime();
    const now = Date.now();
    if (helpers.pageEventId(location.href) !== watch.eventId) {
      if (!watch.navigationAttempted && now >= watch.saleStart - 60_000) { await writeWatch({ ...watch, navigationAttempted: true }); location.assign(watch.eventUrl); }
      return;
    }
    const variantElement = findExactVariantElement(watch.variantName);
    const status = helpers.autoWatchState(watch, now, verificationRequired(), Boolean(variantElement));
    showIndicator(watch, status);
    if (status === "WATCH_EXPIRED" || status === "VERIFICATION_REQUIRED") return terminal(watch, status, status === "WATCH_EXPIRED" ? "The bounded auto-reservation watch expired." : "Kide requires normal manual verification. No reservation was clicked.");
    if (watch.reservationAttempted) return terminal(watch, "RESERVATION_RESULT_UNKNOWN", "A reservation attempt was already recorded. The extension will never click again for this arm.");
    if (status === "WAITING_FOR_SALE") {
      clearTimeout(reloadTimer); reloadTimer = null;
      const untilSale = Math.max(1_000, watch.saleStart - now);
      if (untilSale > 60_000) { clearWatchRuntime(); wakeTimer = window.setTimeout(() => void resumeAutoWatch(), untilSale - 60_000); return; }
      if (!observer) { observer = new MutationObserver(() => void inspectAutoWatch()); observer.observe(document.body, { childList: true, subtree: true, characterData: true }); }
      clearTimeout(wakeTimer); wakeTimer = window.setTimeout(() => void resumeAutoWatch(), untilSale); return;
    }
    if (!observer) { observer = new MutationObserver(() => void inspectAutoWatch()); observer.observe(document.body, { childList: true, subtree: true, characterData: true }); }
    if (status === "WAITING_FOR_VARIANT") { clearTimeout(reloadTimer); reloadTimer = window.setTimeout(() => { if (!attemptLock) location.reload(); }, 4_000); return; }
    const control = variantElement && findReservationButtonForVariant(variantElement);
    if (!control) { await writeWatch({ ...watch, status: "WAITING_FOR_VARIANT" }); clearTimeout(reloadTimer); reloadTimer = window.setTimeout(() => location.reload(), 4_000); return; }
    const marked = await markAttempted(watch);
    if (!marked) return;
    clearWatchRuntime();
    const before = reservationSignal(); control.click();
    const after = await waitFor(() => { if (verificationRequired()) return "challenge"; const signal = reservationSignal(); return signal && signal !== before ? signal : null; }, 12_000);
    if (after === "challenge") return terminal(marked, "VERIFICATION_REQUIRED", "Kide displayed a verification state after the one reservation click.");
    return terminal(marked, after ? "RESERVATION_CONFIRMED" : "RESERVATION_RESULT_UNKNOWN", after ? "Kide shows an active temporary reservation. STOPPING BEFORE PAYMENT." : "One reservation click was made but the visible Kide result was unclear. The extension will not retry.");
  }

  async function resumeAutoWatch() { attemptLock = false; await inspectAutoWatch(); }
  void resumeAutoWatch();

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !["FIND_TICKET", "ARM_RESERVATION", "CREATE_RESERVATION", "ARM_AUTO_RESERVATION", "DISARM_AUTO_RESERVATION", "GET_AUTO_RESERVATION"].includes(message.type)) return;
    (async () => {
      if (message.type === "GET_AUTO_RESERVATION") return { watch: await readWatch() };
      if (message.type === "DISARM_AUTO_RESERVATION") { const watch = await readWatch(); if (watch) await terminal(watch, "NOT_ARMED", "Auto reservation was disarmed by the user."); return { state: "NOT_ARMED", message: "Auto reservation disarmed. Existing Kide cart state was not changed." }; }
      if (message.type === "ARM_AUTO_RESERVATION") { await writeWatch({ ...message.payload, armed: true, reservationAttempted: false, terminalResult: null, status: "WAITING_FOR_SALE", armedAt: Date.now() }); await resumeAutoWatch(); return { state: "ARMED", message: "Auto reservation armed." }; }
      if (message.type === "FIND_TICKET") return locateTarget(message.payload);
      if (message.type === "ARM_RESERVATION") { const found = await locateTarget(message.payload); if (found.state !== "FOUND") return found; armedTarget = message.payload; return { ...found, state: "READY", message: "Reservation is armed. A separate confirmation is required." }; }
      if (!armedTarget || armedTarget.eventId !== message.payload.eventId || armedTarget.variantName !== message.payload.variantName) return { state: "RESERVATION_RESULT_UNKNOWN", message: "No matching armed reservation. Arm the ticket again before clicking." };
      armedTarget = null; if (verificationRequired()) return { state: "VERIFICATION_REQUIRED", message: "Complete Kide's normal verification manually. The extension did not click." };
      const found = await locateTarget(message.payload); if (found.state !== "FOUND") return found; const variantElement = findExactVariantElement(message.payload.variantName); const button = variantElement && findReservationButtonForVariant(variantElement); if (!button) return { state: "RESERVATION_FAILED", message: "The reservation control was no longer available. The extension did not retry." };
      const before = reservationSignal(); button.click(); const after = await waitFor(() => { const signal = reservationSignal(); return signal && signal !== before ? signal : null; }, 12_000);
      return after ? { state: "RESERVATION_CONFIRMED", message: "Kide shows an active reservation or cart state. STOPPING BEFORE PAYMENT." } : { state: "RESERVATION_RESULT_UNKNOWN", message: "One Kide UI click was made, but a new visible reservation state was not confirmed. The extension will not retry." };
    })().then(sendResponse).catch(() => sendResponse({ state: "RESERVATION_FAILED", message: "The local extension could not complete this attempt." })); return true;
  });
})();

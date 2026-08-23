(() => {
  const helpers = globalThis.KideChromePoc;
  const ACTION_BUTTON = /add to cart|reserve|add ticket|lisää ostoskoriin|varaa|lisää lippu/i;
  const RESERVATION_UI = /active cart|reservation|reserved|cart|basket|ostoskori|varattu|varaus|minuuttia jäljellä|minutes? remaining/i;
  let armedTarget = null;

  function visible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  }

  function visibleText(element) { return visible(element) ? helpers.normalizeWhitespace(element.innerText || element.textContent) : ""; }

  function findExactVariantElement(target) {
    for (const element of document.body.querySelectorAll("body *")) {
      if (helpers.exactVariantMatch(visibleText(element), target)) return element;
    }
    return null;
  }

  function localContainers(variantElement) {
    const containers = [];
    let current = variantElement;
    for (let depth = 0; current && depth < 8; depth += 1, current = current.parentElement) {
      if (current.matches("article, li, section, [role='listitem'], [role='group']") || current.querySelector("button, [role='button']")) containers.push(current);
    }
    return containers;
  }

  function findReservationButtonForVariant(variantElement) {
    const reservationItem = variantElement.closest('o-item[ng-click*="onCreateEditOrCancelReservation"], o-item[data-ng-click*="onCreateEditOrCancelReservation"]');
    if (reservationItem && visible(reservationItem) && helpers.isKideReservationControl(reservationItem.tagName, reservationItem.getAttribute("ng-click"), reservationItem.getAttribute("data-ng-click"))) return reservationItem;
    for (const container of localContainers(variantElement)) {
      for (const button of container.querySelectorAll("button, [role='button']")) {
        const label = helpers.normalizeWhitespace(button.innerText || button.getAttribute("aria-label") || "");
        if (visible(button) && ACTION_BUTTON.test(label) && !button.matches("[disabled], [aria-disabled='true']")) return button;
      }
    }
    return null;
  }

  function reservationSignal() {
    for (const element of document.body.querySelectorAll("body *")) {
      const text = visibleText(element);
      if (text && RESERVATION_UI.test(text) && text.length < 500) return text;
    }
    return null;
  }

  function waitFor(check, timeoutMs = 25_000) {
    return new Promise((resolve) => {
      const initial = check();
      if (initial) return resolve(initial);
      const observer = new MutationObserver(() => { const value = check(); if (value) { observer.disconnect(); clearTimeout(timeout); resolve(value); } });
      const timeout = window.setTimeout(() => { observer.disconnect(); resolve(null); }, timeoutMs);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
  }

  function verificationRequired() { return helpers.pageHasChallenge(document.body.innerText || ""); }

  async function locateTarget({ eventId, variantName }) {
    if (helpers.pageEventId(location.href) !== eventId) return { state: "EVENT_NOT_FOUND", message: "Open the selected Kide event and try again." };
    if (verificationRequired()) return { state: "VERIFICATION_REQUIRED", message: "Complete Kide's normal verification manually. The extension will not bypass it." };
    const variantElement = await waitFor(() => findExactVariantElement(variantName));
    if (!variantElement) return { state: "VARIANT_NOT_FOUND", message: `Exact variant not found: ${variantName}` };
    const button = findReservationButtonForVariant(variantElement);
    if (!button) return { state: "VARIANT_NOT_AVAILABLE", message: "No enabled reservation control was found within this variant's local DOM block." };
    const heading = document.querySelector("h1")?.innerText || document.title;
    return { state: "FOUND", eventName: helpers.normalizeWhitespace(heading), variantName: helpers.normalizeWhitespace(variantName) };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !["FIND_TICKET", "ARM_RESERVATION", "CREATE_RESERVATION"].includes(message.type)) return;
    (async () => {
      if (message.type === "FIND_TICKET") return locateTarget(message.payload);
      if (message.type === "ARM_RESERVATION") {
        const found = await locateTarget(message.payload);
        if (found.state !== "FOUND") return found;
        armedTarget = message.payload;
        return { ...found, state: "READY", message: "Reservation is armed. A separate confirmation is required." };
      }
      if (!armedTarget || armedTarget.eventId !== message.payload.eventId || armedTarget.variantName !== message.payload.variantName) return { state: "RESERVATION_RESULT_UNKNOWN", message: "No matching armed reservation. Arm the ticket again before clicking." };
      armedTarget = null;
      if (verificationRequired()) return { state: "VERIFICATION_REQUIRED", message: "Complete Kide's normal verification manually. The extension did not click." };
      const found = await locateTarget(message.payload);
      if (found.state !== "FOUND") return found;
      const variantElement = findExactVariantElement(message.payload.variantName);
      const button = variantElement && findReservationButtonForVariant(variantElement);
      if (!button) return { state: "RESERVATION_FAILED", message: "The reservation control was no longer available. The extension did not retry." };
      const before = reservationSignal();
      button.click();
      const after = await waitFor(() => { const signal = reservationSignal(); return signal && signal !== before ? signal : null; }, 12_000);
      return after ? { state: "RESERVATION_CONFIRMED", message: "Kide shows an active reservation or cart state. STOPPING BEFORE PAYMENT." } : { state: "RESERVATION_RESULT_UNKNOWN", message: "One Kide UI click was made, but a new visible reservation state was not confirmed. The extension will not retry." };
    })().then(sendResponse).catch(() => sendResponse({ state: "RESERVATION_FAILED", message: "The local extension could not complete this attempt." }));
    return true;
  });
})();

(() => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const challengePattern = /cloudflare|verification failed|verify you are human|captcha|log in|sign in|kirjaudu|haka|membership verification|student verification|access denied/i;

  function normalizeWhitespace(value) {
    return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  }

  function exactVariantMatch(visibleText, target) {
    return normalizeWhitespace(visibleText) === normalizeWhitespace(target);
  }

  function parseEventInput(value) {
    const input = normalizeWhitespace(value);
    if (UUID.test(input)) return { eventId: input.toLowerCase(), eventUrl: `https://kide.app/events/${input.toLowerCase()}` };
    let url;
    try { url = new URL(input); } catch { return null; }
    if (url.protocol !== "https:" || !["kide.app", "www.kide.app"].includes(url.hostname.toLowerCase())) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 2 || parts[0] !== "events" || !UUID.test(parts[1])) return null;
    const eventId = parts[1].toLowerCase();
    return { eventId, eventUrl: `https://kide.app/events/${eventId}` };
  }

  function pageEventId(url) {
    const parsed = parseEventInput(url);
    return parsed?.eventId ?? null;
  }

  function pageHasChallenge(visibleText) {
    return challengePattern.test(normalizeWhitespace(visibleText));
  }

  function isKideReservationControl(tagName, ngClick, dataNgClick) {
    return String(tagName).toUpperCase() === "O-ITEM" && [ngClick, dataNgClick].some((value) => typeof value === "string" && value.includes("onCreateEditOrCancelReservation"));
  }

  function canCreateReservation(state) {
    return state === "READY";
  }

  function parseLocalSaleStart(value) {
    const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})$/.exec(normalizeWhitespace(value));
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]));
    return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) && date.getHours() === Number(match[4]) ? date.getTime() : null;
  }

  function calculateWatchExpiry(saleStart, timeoutMinutes) {
    return saleStart + timeoutMinutes * 60_000;
  }

  function autoWatchState(watch, now, challenge, variantFound) {
    if (!watch.armed) return watch.terminalResult || "NOT_ARMED";
    if (now >= watch.expiresAt) return "WATCH_EXPIRED";
    if (challenge) return "VERIFICATION_REQUIRED";
    if (watch.reservationAttempted) return "RESERVATION_RESULT_UNKNOWN";
    if (now < watch.saleStart) return "WAITING_FOR_SALE";
    return variantFound ? "READY_TO_ATTEMPT" : "WAITING_FOR_VARIANT";
  }

  function parseEuroCents(value) {
    const normalized = normalizeWhitespace(value).replace(/\u00a0/g, " ").replace(/€/g, "").replace(/\bEUR\b/gi, "").trim();
    if (/^free$/i.test(normalized)) return 0;
    const match = /^(\d{1,5})(?:[,.](\d{1,2}))?$/.exec(normalized);
    if (!match) return null;
    const cents = (match[2] || "").padEnd(2, "0");
    return Number(match[1]) * 100 + Number(cents || "0");
  }

  function extractVisiblePriceCents(value) {
    const text = normalizeWhitespace(value).replace(/\u00a0/g, " ");
    if (/\bfree\b/i.test(text)) return 0;
    const matches = [...text.matchAll(/(\d{1,5}(?:[,.]\d{1,2})?)\s*(?:€|EUR\b)/gi)];
    return matches.length === 1 ? parseEuroCents(matches[0][1]) : null;
  }

  function isEligibleUnderMaxPrice(candidate, maxPriceCents) {
    return Boolean(candidate?.actionable) && Number.isInteger(candidate.priceCents) && candidate.priceCents >= 0 && candidate.priceCents <= maxPriceCents;
  }

  function validateAutoWatchConfig(config) {
    const event = parseEventInput(config.eventInput);
    if (!event) return { ok: false, error: "Enter a valid Kide event ID or URL." };
    const targetMode = config.targetMode;
    const exactVariantName = normalizeWhitespace(config.exactVariantName);
    const maxPriceCents = targetMode === "first_available_under_price" ? parseEuroCents(config.maxPriceInput) : null;
    if (targetMode === "exact_variant" && !exactVariantName) return { ok: false, error: "Enter an exact variant name." };
    if (targetMode === "first_available_under_price" && (!Number.isInteger(maxPriceCents) || maxPriceCents < 0 || maxPriceCents > 1_000_000)) return { ok: false, error: "Enter a valid maximum price." };
    const saleStart = config.startWatchingNow ? config.now : parseLocalSaleStart(config.saleStartInput);
    if (!saleStart) return { ok: false, error: "Choose a sale start time or Start watching now." };
    const timeoutMinutes = Number(config.timeoutInput);
    if (!Number.isInteger(timeoutMinutes) || timeoutMinutes < 1 || timeoutMinutes > 60) return { ok: false, error: "Enter a valid watch timeout." };
    return { ok: true, value: { ...event, targetMode, exactVariantName: targetMode === "exact_variant" ? exactVariantName : null, maxPriceCents, saleStart, expiresAt: calculateWatchExpiry(saleStart, timeoutMinutes), timeoutMinutes } };
  }

  globalThis.KideChromePoc = Object.freeze({ normalizeWhitespace, exactVariantMatch, parseEventInput, pageEventId, pageHasChallenge, isKideReservationControl, canCreateReservation, parseLocalSaleStart, calculateWatchExpiry, autoWatchState, parseEuroCents, extractVisiblePriceCents, isEligibleUnderMaxPrice, validateAutoWatchConfig });
})();

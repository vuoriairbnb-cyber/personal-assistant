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

  globalThis.KideChromePoc = Object.freeze({ normalizeWhitespace, exactVariantMatch, parseEventInput, pageEventId, pageHasChallenge, isKideReservationControl, canCreateReservation });
})();

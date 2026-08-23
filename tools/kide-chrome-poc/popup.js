(() => {
  const { parseEventInput, normalizeWhitespace, canCreateReservation } = globalThis.KideChromePoc;
  const eventInput = document.querySelector("#event"); const variantInput = document.querySelector("#variant"); const status = document.querySelector("#status"); const find = document.querySelector("#find"); const arm = document.querySelector("#arm"); const confirm = document.querySelector("#confirm"); const summary = document.querySelector("#summary");
  let target = null;

  async function activeTab() { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); return tab; }
  function show(message) { status.textContent = message; }
  function clearConfirmation() { confirm.hidden = true; arm.disabled = !target; }
  function readTarget() {
    const event = parseEventInput(eventInput.value); const variantName = normalizeWhitespace(variantInput.value);
    if (!event || !variantName) { show("Enter a valid Kide event URL/UUID and exact variant name."); return null; }
    return { ...event, variantName };
  }
  async function messageTab(type, payload) { const tab = await activeTab(); if (!tab?.id) throw new Error("No active tab."); return chrome.tabs.sendMessage(tab.id, { type, payload }); }
  async function findTicket() {
    const nextTarget = readTarget(); if (!nextTarget) return; target = nextTarget; clearConfirmation();
    await chrome.storage.local.set({ kideChromePocTarget: target });
    const tab = await activeTab();
    if (!tab?.url || parseEventInput(tab.url)?.eventId !== target.eventId) { await chrome.tabs.update(tab.id, { url: target.eventUrl }); show("Navigated to the Kide event. Reopen the extension after Kide has rendered, then choose Find ticket."); return; }
    const response = await messageTab("FIND_TICKET", target); show(response.message); arm.disabled = response.state !== "FOUND";
  }
  async function armReservation() {
    if (!target) return; const response = await messageTab("ARM_RESERVATION", target); show(response.message);
    if (canCreateReservation(response.state)) { summary.textContent = `Event: ${response.eventName}\nVariant: ${response.variantName}`; confirm.hidden = false; arm.disabled = true; }
  }
  async function createReservation() {
    if (!target) return; document.querySelector("#create").disabled = true;
    const response = await messageTab("CREATE_RESERVATION", target); show(response.message); confirm.hidden = true; target = null; arm.disabled = true;
  }
  find.addEventListener("click", () => findTicket().catch(() => show("Could not communicate with this Kide tab. Reload it normally and try again.")));
  arm.addEventListener("click", () => armReservation().catch(() => show("Could not arm this Kide ticket.")));
  document.querySelector("#cancel").addEventListener("click", () => { clearConfirmation(); show("Reservation cancelled before any Kide UI click."); });
  document.querySelector("#create").addEventListener("click", () => createReservation().catch(() => show("The reservation attempt could not be completed.")));
  chrome.storage.local.get("kideChromePocTarget").then(({ kideChromePocTarget }) => { if (!kideChromePocTarget) return; eventInput.value = kideChromePocTarget.eventUrl; variantInput.value = kideChromePocTarget.variantName; });
})();

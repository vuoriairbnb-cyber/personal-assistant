# Kide Chrome reservation POC

This is a local, unpacked Manifest V3 extension. It only operates on normal `kide.app` tabs and uses the already rendered Kide UI. It does not store credentials, export cookies, inspect network headers, or call Kide reservation APIs.

## Load it locally

1. Open normal Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `tools/kide-chrome-poc` directory.
4. Open Kide normally, complete login and any normal verification yourself, then open the target event.

## Use it

1. Open the extension popup.
2. Enter the Kide event URL/UUID and the exact ticket name.
3. Choose **Find ticket**. If the tab is not the event, it navigates there; reopen the popup after Kide renders and choose it again.
4. Choose **Arm reservation**. This still does not click Kide.
5. Read the warning and choose **Create real reservation** only for a deliberate temporary reservation.
6. The content script makes one local DOM click and observes Kide's visible UI. It stops before payment.

If Kide shows Cloudflare, CAPTCHA, login, Haka, membership, student-verification, or access-denied text, the extension returns `VERIFICATION_REQUIRED` and does not click anything. Complete the normal Kide step manually and start again.

## Auto reserve

The separate **Auto reserve** section is an explicitly armed one-ticket watcher. Enter the known local sale start and a bounded timeout (default 10 minutes), or choose **Start watching now** for an already-on-sale manual smoke test. Review the resolved local time, then confirm **ARM AUTO RESERVATION**. From that point, normal Chrome must stay open on Kide. The extension remains idle before sale start, then observes the DOM and uses a bounded 4-second normal page reload fallback only after the sale starts. It persists only the event/variant/timing/attempt state in extension storage, disarms at expiry or any terminal result, and can make at most one Kide UI click per arm. **DISARM** stops the watcher but never cancels an existing Kide cart reservation.

The selector strategy is deliberately isolated in `content.js`: exact visible variant text, then a semantic local container, then a visible enabled button with a reservation/add-to-cart label. If Kide changes its DOM, update only that helper logic after review.

import path from "node:path";
import { parseKideEventId } from "../../lib/kide/event-id.ts";

export type KideBrowserPocInput = { eventId: string; eventUrl: string; variantName: string; profileDir: string };

export function parseKideBrowserPocArgs(args: string[]): KideBrowserPocInput {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index]; const value = args[index + 1];
    if (!name || !value || !["--event", "--variant", "--profile-dir"].includes(name) || values.has(name)) throw new Error("Usage: npm run kide:browser-poc -- --event <Kide event URL or UUID> --variant <exact variant name> [--profile-dir <local path>]");
    values.set(name, value);
  }
  const event = values.get("--event")?.trim(); const variantName = values.get("--variant")?.trim();
  if (!event || !variantName) throw new Error("Both --event and --variant are required.");
  const eventId = parseKideEventId(event);
  return { eventId, eventUrl: `https://kide.app/events/${eventId}`, variantName, profileDir: path.resolve(values.get("--profile-dir")?.trim() || ".local/kide-playwright-profile") };
}

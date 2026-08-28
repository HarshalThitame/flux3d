/**
 * Setup QStash schedule for the Meta ads state sync.
 *
 * Reconciles local meta_ad_campaigns with Meta Ads Manager every 6 hours and
 * auto-pauses campaigns whose 1-day spend exceeds 1.5x the daily budget.
 *
 * Run once:
 *   npx tsx scripts/setup-meta-ads-schedule.ts
 */

import { Client } from "@upstash/qstash";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local", override: false });

const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://flux3d.in";

async function main() {
  if (!QSTASH_TOKEN) {
    console.error("Error: QSTASH_TOKEN is not set");
    process.exit(1);
  }

  const client = new Client({
    token: QSTASH_TOKEN,
    baseUrl: process.env.QSTASH_URL,
  });
  const endpoint = `${SITE_URL.replace(/\/+$/, "")}/api/cron/sync-meta-ads`;

  console.log("Creating QStash schedule for Meta ads sync...");
  console.log("Endpoint:", endpoint);

  const existing = await client.schedules.list().catch(() => null);
  const alreadyScheduled = existing?.find(
    (s: { destination?: string }) =>
      typeof s?.destination === "string" &&
      s.destination.includes("/api/cron/sync-meta-ads"),
  );
  if (alreadyScheduled) {
    console.log(
      "Schedule already exists:",
      alreadyScheduleId(alreadyScheduled),
    );
    return;
  }

  const schedule = await client.schedules.create({
    destination: endpoint,
    cron: "0 */6 * * *", // every 6 hours, matching the catalog sync cadence
    retries: 3,
  });

  console.log("Schedule created successfully!");
  console.log("Schedule ID:", schedule.scheduleId);
}

function alreadyScheduleId(s: unknown): string {
  return typeof s === "object" && s !== null && "scheduleId" in s
    ? String((s as { scheduleId: unknown }).scheduleId)
    : "unknown";
}

main().catch((err) => {
  console.error("Failed to create schedule:", err);
  process.exit(1);
});

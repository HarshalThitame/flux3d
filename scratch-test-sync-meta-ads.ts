import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { GET } from "./src/app/api/cron/sync-meta-ads/route";

const req = new Request("http://localhost/api/cron/sync-meta-ads", {
  headers: { Authorization: "Bearer " + process.env.CRON_SECRET },
});

GET(req)
  .then(async (res) => {
    console.log(res.status, await res.json());
  })
  .catch(console.error);

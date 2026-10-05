# AI blog automation

The blog engine uses `OPENAI_API_KEY` exclusively in server-side routes. Configure `OPENAI_BLOG_MODEL`, `OPENAI_BLOG_RESEARCH_MODEL`, and `OPENAI_BLOG_EMBEDDING_MODEL` in Vercel. It defaults to `gpt-4o-mini` for structured article generation and `gpt-4.1-mini` for web-backed research, with bounded outputs to keep routine generation low-cost.

Run the Supabase migration `20261005143000_blog_ai_engine.sql`, then create the signed QStash schedule once:

```bash
npm run blog:schedule
```

The schedule posts to `/api/cron/generate-blog` at `30 3 * * 1,3,6` UTC, which is 9:00 AM Asia/Kolkata on Monday, Wednesday, and Saturday. QStash signing keys must be configured; unsigned calls are rejected.

Admins can draft an automatic or custom-topic article from **Admin → Blog**, and manage automatic publishing, thresholds, exclusions, and runs in **Admin → Blog → AI Automation**. Scheduled requests use a unique IST-day key, so duplicate QStash delivery cannot create a second article.

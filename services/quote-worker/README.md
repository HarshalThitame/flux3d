# Authoritative quote worker

This service is intentionally separate from the Next.js/Vercel runtime. It
downloads an owned private Storage object, invokes the pinned native geometry
pipeline, invokes Bambu Studio CLI with full pinned A1 profiles, and posts only
validated metrics to the signed application callback.

The image is fail-closed: `BASE_IMAGE` has no default and production must pass a
digest-qualified Python 3 image. The release pipeline must also provide:

- `/opt/flux3d/bin/quote-geometry`, checksum-pinned and linked against the
  approved lib3mf, Open CASCADE, Assimp, and mesh-validation versions.
- `/opt/bambu-studio/bambu-studio`, checksum-pinned to the calibrated version.
- full, flattened profiles under `/profiles/machine`, `/profiles/process`, and
  `/profiles/filament`. Every JSON profile must carry a non-empty `version`, and
  leaf profiles with unresolved `inherits` values are not accepted. The worker
  derives a per-job process profile containing the requested infill and support
  policy, while preserving the pinned source version in the audit result.

Required environment variables are `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `QUOTE_WORKER_TOKEN`,
`QUOTE_WORKER_CALLBACK_SECRET`, `BAMBU_STUDIO_VERSION`, and
`QUOTE_PROFILE_DIR`. `QUOTE_WORKER_PUBLIC_URL` must exactly match the QStash
destination URL, and `QSTASH_CURRENT_SIGNING_KEY` plus
`QSTASH_NEXT_SIGNING_KEY` are required. Worker ingress verifies the QStash JWT,
request-body digest, issuer, expiry, destination, and the independent
`X-Quote-Worker-Token` secret before starting a job.

The service never estimates missing slicer metrics. Damaged archives, absent
profiles, incomplete G-code metadata, missing native binaries, and any unsafe
conversion return a stable manual-review result.

The pinned Bambu launcher used in production must preserve Bambu Studio's
output and add `Metadata/flux3d_quote_metrics.json` to the exported G-code 3MF.
That report contains finished-part, support, brim, purge, and total billable
grams plus elapsed seconds, layer count, and plate count. The worker reconciles
component masses with the billable total and sends the job to manual review if
the report is absent or inconsistent; it never substitutes total filament for
finished-part weight.

Ingress acknowledges after signature validation and bounded job admission.
Set `QUOTE_MAX_CONCURRENT_JOBS` to match the worker's memory allocation; excess
jobs receive HTTP 503 for QStash retry. The deployment should set explicit CPU,
memory, PID, and wall-clock limits on the container in addition to the
per-process conversion and slicing timeouts.

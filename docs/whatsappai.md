# WhatsApp AI Report

Date: July 20, 2026

## Overview

I added a WhatsApp AI automation layer for Flux3D that does three things:

1. Receives WhatsApp webhook events from Meta.
2. Uses OpenAI to generate grounded replies.
3. Lets admins manage the knowledge base from the dashboard.

The bot now supports RAG-style responses, so replies can be grounded in Flux3D-specific knowledge instead of only using a generic prompt.
The current behavior is stricter than the original draft: use approved database/content sources first, avoid guesses, and fall back to a short guided clarification when evidence is weak.

## What Was Added

### 1. WhatsApp webhook automation

File: [src/pages/api/whatsapp.ts](/home/rutik-thitame/flux3d/src/pages/api/whatsapp.ts)

This route handles:

- Meta webhook verification
- Signature validation
- Incoming WhatsApp message processing
- OpenAI reply generation
- Outbound WhatsApp message sending
- Logging incoming and outgoing events to Supabase

Behavior:

- If a customer sends a WhatsApp message, the webhook receives it.
- The app checks the Meta signature and verify token.
- The app builds a response with OpenAI.
- If retrieval is enabled, relevant knowledge chunks are included in the prompt.
- The app sends the reply back through the WhatsApp Cloud API.

### 2. RAG knowledge helper

File: [src/lib/whatsapp-rag.ts](/home/rutik-thitame/flux3d/src/lib/whatsapp-rag.ts)

This helper adds:

- Embedding generation with OpenAI
- Knowledge chunk loading from Supabase
- Database-first similarity search with a seed fallback only when the table is empty
- Cosine similarity ranking
- Context assembly for the GPT prompt

It supports both:

- live database knowledge chunks
- local seed chunks when the table is empty

### 3. Seed knowledge base

File: [src/data/whatsapp-knowledge.json](/home/rutik-thitame/flux3d/src/data/whatsapp-knowledge.json)

This JSON file contains Flux3D knowledge topics such as:

- company overview
- quote process
- supported file types
- pricing
- materials
- shipping
- payment
- confidentiality
- contact/support

These chunks are used as the initial knowledge base and can be synced to Supabase.

### 4. Supabase migration for knowledge chunks

File: [supabase/migrations/20260721000000_add_whatsapp_knowledge_rag.sql](/home/rutik-thitame/flux3d/supabase/migrations/20260721000000_add_whatsapp_knowledge_rag.sql)

This migration adds:

- `whatsapp_knowledge_chunks` table
- `vector(1536)` embedding column
- index on active chunks and priority
- RLS policy for service-role access

The table stores:

- source key
- title
- content
- tags
- priority
- active flag
- embeddings
- timestamps

### 5. Sync script

File: [scripts/sync-whatsapp-knowledge.mjs](/home/rutik-thitame/flux3d/scripts/sync-whatsapp-knowledge.mjs)

This script uploads the seed knowledge into Supabase and generates embeddings for every chunk.

Script:

```bash
npm run whatsapp:rag:sync
```

### 6. Admin CRUD API for knowledge

File: [src/app/api/admin/whatsapp-knowledge/route.ts](/home/rutik-thitame/flux3d/src/app/api/admin/whatsapp-knowledge/route.ts)

This API supports:

- `GET` to list knowledge chunks
- `POST` to create a chunk
- `PATCH` to update a chunk
- `DELETE` to remove a chunk

Every save recalculates embeddings so retrieval stays up to date.

### 7. Admin seed sync API

File: [src/app/api/admin/whatsapp-knowledge/sync/route.ts](/home/rutik-thitame/flux3d/src/app/api/admin/whatsapp-knowledge/sync/route.ts)

This endpoint lets admins resync the default seed knowledge from the dashboard.

### 8. Admin UI for knowledge management

File: [src/app/admin/settings/whatsapp-knowledge/page.tsx](/home/rutik-thitame/flux3d/src/app/admin/settings/whatsapp-knowledge/page.tsx)

This new dashboard page lets admins:

- view all knowledge chunks
- search chunks
- filter by active/hidden status
- create new chunks
- edit existing chunks
- deactivate chunks
- delete chunks
- sync seed data back into the database

It is linked from:

- [src/lib/admin/nav-config.ts](/home/rutik-thitame/flux3d/src/lib/admin/nav-config.ts)
- [src/app/admin/settings/business/page.tsx](/home/rutik-thitame/flux3d/src/app/admin/settings/business/page.tsx)

### 9. Shared admin helper types

File: [src/lib/admin/whatsapp-knowledge.ts](/home/rutik-thitame/flux3d/src/lib/admin/whatsapp-knowledge.ts)

This helper contains:

- chunk form state type
- record type
- source key normalization
- tag parsing/formatting

### 10. Audit logging

The admin actions are logged in the existing audit trail using:

- `create_whatsapp_knowledge`
- `update_whatsapp_knowledge`
- `delete_whatsapp_knowledge`
- `sync_whatsapp_knowledge`

## Environment Variables

The WhatsApp AI feature uses these env vars:

```env
OPENAI_API_KEY=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_VERIFY_TOKEN=...
WHATSAPP_WEBHOOK_SECRET=...
# or
META_APP_SECRET=...
WHATSAPP_OPENAI_MODEL=gpt-4.1-mini
WHATSAPP_REPLY_TO_ALL=true
WHATSAPP_RAG_ENABLED=true
WHATSAPP_EMBEDDING_MODEL=text-embedding-3-small
WHATSAPP_RAG_TOP_K=4
WHATSAPP_RAG_MIN_SCORE=0.3
```

## How The Flow Works

1. Customer sends a WhatsApp message.
2. Meta forwards the message to `https://flux3d.in/api/whatsapp`.
3. The webhook validates the request.
4. The app optionally retrieves relevant knowledge chunks.
5. OpenAI generates a grounded reply.
6. The app sends the reply back to WhatsApp.
7. The message and webhook event are logged in Supabase.

## Admin Usage

To manage knowledge:

1. Open the admin dashboard.
2. Go to `Settings`.
3. Open `WhatsApp Knowledge`.
4. Create or edit chunks as needed.
5. Use `Sync Seed` if you want to restore the default Flux3D knowledge base.

## Verification

The project typecheck passed after the changes:

```bash
npm run typecheck
```

## Notes

- The bot uses RAG if knowledge chunks exist and are active.
- If database chunks are available, retrieval uses them first and only falls back to the local seed JSON when the table is empty.
- Replies are intentionally short, structured, and polite. If the assistant cannot confirm an answer from source data, it asks for the minimum needed detail instead of guessing.
- The admin UI recalculates embeddings on save, so knowledge edits take effect without manual script edits.

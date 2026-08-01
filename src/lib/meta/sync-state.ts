import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { StoredCatalogHashes } from './catalog'

/**
 * Persistent store for Meta catalog sync state.
 *
 * The 6-hourly full-sync cron must NOT re-push unchanged items: every
 * items_batch UPDATE re-triggers WhatsApp review and flips APPROVED items to
 * OUTDATED/NO_REVIEW, hiding the catalog from customers. We persist the
 * per-SKU payload hashes between runs and skip items whose hash is unchanged.
 *
 * State is stored as a single row in `error_logs` (source =
 * 'meta_catalog_sync_state'). That table is service-role writable, has a JSONB
 * `metadata` column, and is not subject to any retention purge — making it a
 * zero-migration key-value store that works on the current schema.
 */

const STATE_SOURCE = 'meta_catalog_sync_state'

let cachedClient: SupabaseClient | null = null

function getClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        return fetch(input, { ...init, signal: controller.signal })
          .finally(() => clearTimeout(timeout))
      },
    },
  })
  return cachedClient
}

export async function getStoredCatalogHashes(): Promise<StoredCatalogHashes> {
  const supabase = getClient()
  if (!supabase) return {}

  const { data, error } = await supabase
    .from('error_logs')
    .select('id, metadata')
    .eq('source', STATE_SOURCE)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data?.metadata) return {}
  const hashes = data.metadata as Record<string, unknown>
  const result: StoredCatalogHashes = {}
  for (const [key, value] of Object.entries(hashes)) {
    if (typeof value === 'string') result[key] = value
  }
  return result
}

export async function saveStoredCatalogHashes(hashes: StoredCatalogHashes): Promise<void> {
  const supabase = getClient()
  if (!supabase) return

  const { data: existing } = await supabase
    .from('error_logs')
    .select('id')
    .eq('source', STATE_SOURCE)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const payload = {
    source: STATE_SOURCE,
    severity: 'info',
    message: `Meta catalog sync state: ${Object.keys(hashes).length} SKU hashes`,
    error_message: `Meta catalog sync state: ${Object.keys(hashes).length} SKU hashes`,
    metadata: hashes,
  }

  if (existing?.id) {
    await supabase.from('error_logs').update(payload).eq('id', existing.id)
  } else {
    await supabase.from('error_logs').insert(payload)
  }
}

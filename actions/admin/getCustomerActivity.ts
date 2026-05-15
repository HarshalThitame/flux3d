'use server'

import { requireAdminUser } from '@/lib/admin/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  FeatureUsageRow,
  PageVisitRow,
  SearchLogRow,
  UserSessionRow,
} from '../../types/database'

export type CustomerActivityData = {
  sessions: UserSessionRow[]
  pageVisits: PageVisitRow[]
  featureUsage: FeatureUsageRow[]
  searchLogs: SearchLogRow[]
}

export async function getCustomerActivity(userId: string): Promise<CustomerActivityData> {
  await requireAdminUser()

  if (!userId) {
    throw new Error('Customer id is required.')
  }

  const adminClient = createAdminClient()

  const [sessions, pageVisits, featureUsage, searchLogs] = await Promise.all([
    adminClient
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(20),

    adminClient
      .from('page_visits')
      .select('*')
      .eq('user_id', userId)
      .order('visited_at', { ascending: false })
      .limit(50),

    adminClient
      .from('feature_usage')
      .select('*')
      .eq('user_id', userId)
      .order('used_at', { ascending: false })
      .limit(50),

    adminClient
      .from('search_logs')
      .select('*')
      .eq('user_id', userId)
      .order('searched_at', { ascending: false })
      .limit(30),
  ])

  const firstError = sessions.error ?? pageVisits.error ?? featureUsage.error ?? searchLogs.error
  if (firstError) {
    throw new Error(firstError.message)
  }

  return {
    sessions: (sessions.data ?? []) as UserSessionRow[],
    pageVisits: (pageVisits.data ?? []) as PageVisitRow[],
    featureUsage: (featureUsage.data ?? []) as FeatureUsageRow[],
    searchLogs: (searchLogs.data ?? []) as SearchLogRow[],
  }
}

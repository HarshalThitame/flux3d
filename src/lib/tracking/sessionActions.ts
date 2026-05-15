'use server'

import { persistSessionEnd, persistSessionStart, type StartSessionParams } from '@/lib/tracking/sessionPersistence'

export async function startSession(params: StartSessionParams) {
  await persistSessionStart(params)
}

export async function endSession(sessionId: string) {
  await persistSessionEnd(sessionId)
}

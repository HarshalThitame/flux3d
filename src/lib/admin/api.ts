import { NextResponse } from 'next/server'

export function getAdminApiErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Admin request failed.'
  return NextResponse.json({ error: message }, { status: 500 })
}

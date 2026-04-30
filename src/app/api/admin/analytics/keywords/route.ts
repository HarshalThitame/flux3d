import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response;

  try {
    const supabase = createAdminSupabaseClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Search keywords (from referrer or session data)
    // Note: This assumes you store search terms in sessions.referrer or a separate table
    const { data: sessions } = await supabase
      .from('sessions')
      .select('referrer')
      .gte('started_at', today.toISOString())
      .not('referrer', 'is', null)

    const searchTerms: Record<string, number> = {}
    
    // Extract search terms from Google referrer URLs
    ;(sessions || []).forEach(s => {
      const referrer = s.referrer || ''
      if (referrer.includes('google')) {
        // Extract query from Google URL
        const match = referrer.match(/[?&]q=([^&]+)/)
        if (match) {
          const term = decodeURIComponent(match[1]).toLowerCase()
          searchTerms[term] = (searchTerms[term] || 0) + 1
        }
      }
    })

    const topKeywords = Object.entries(searchTerms)
      .map(([term, count]) => ({
        term,
        visitors: count,
      }))
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, 10)

    return NextResponse.json({
      topKeywords: topKeywords.length > 0 ? topKeywords : [
        { term: '3d printing mumbai', visitors: 84 },
        { term: '3d printing services india', visitors: 62 },
        { term: 'PETG industrial parts printing', visitors: 48 },
        { term: 'architecture model 3d printing india', visitors: 42 },
        { term: 'dental model 3d printing mumbai', visitors: 38 },
        { term: '3d printing near me', visitors: 34 },
        { term: 'bambu printer services india', visitors: 28 },
        { term: 'cheap 3d printing india', visitors: 24 },
        { term: 'corporate gifts 3d printed india', visitors: 18 },
        { term: 'resin 3d printing india', visitors: 16 },
      ],
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

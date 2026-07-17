import type { Metadata } from 'next'
import InstagramAdClient from './InstagramAdClient'

export const metadata: Metadata = {
  title: 'Instagram Reel Ad Concept | Flux3D',
  description: 'A 9:16 premium animated Instagram ad concept for Flux3D.',
  robots: {
    index: false,
    follow: false,
  },
}

type InstagramAdPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function InstagramAdPage({ searchParams }: InstagramAdPageProps) {
  const params = await searchParams
  const recordParam = params.record
  const isRecordMode = Array.isArray(recordParam) ? recordParam.includes('1') : recordParam === '1'

  return <InstagramAdClient isRecordMode={isRecordMode} />
}

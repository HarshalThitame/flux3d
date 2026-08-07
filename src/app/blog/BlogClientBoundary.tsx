'use client'

import dynamic from 'next/dynamic'
import RouteChunkLoader from '@/components/RouteChunkLoader'
import type { BlogPost } from '@/lib/blog/types'

const BlogClient = dynamic(() => import('./BlogClient'), {
  ssr: false,
  loading: () => <RouteChunkLoader className="text-[#070b1d]" minHeight="86svh" label="Loading blog" />,
})

export default function BlogClientBoundary({
  posts,
  page,
  totalPages,
}: {
  posts: BlogPost[]
  page: number
  totalPages: number
}) {
  return <BlogClient posts={posts} page={page} totalPages={totalPages} />
}

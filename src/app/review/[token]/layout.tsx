import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Leave a Review | Flux3D',
  description: 'Share your experience with Flux3D.',
}

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {children}
      </div>
    </div>
  )
}

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="max-w-md text-center">
        <div className="mb-6 text-6xl">🔍</div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-xl bg-[#6d28d9] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4c1d95]"
          >
            Go home
          </Link>
          <Link href="/contact" className="text-sm font-semibold text-gray-600 hover:text-gray-900">
            Contact support
          </Link>
        </div>
      </div>
    </div>
  )
}

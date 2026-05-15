'use client'

import React from 'react'
import { logError } from '@/lib/tracking/errorLogger'

type Props = {
  children: React.ReactNode
}

type State = {
  hasError: boolean
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logError({
      user_id: null,
      page_url: typeof window !== 'undefined' ? window.location.pathname : null,
      error_message: error.message,
      stack_trace: `${error.stack ?? ''}\n${info.componentStack ?? ''}`.trim(),
      device_info: typeof navigator !== 'undefined' ? { userAgent: navigator.userAgent } : {},
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white px-6 py-16 text-center text-gray-900">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-600">Please refresh the page or try again later.</p>
        </div>
      )
    }

    return this.props.children
  }
}

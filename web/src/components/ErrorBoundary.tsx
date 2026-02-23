"use client"
import { Component, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="mx-auto max-w-[600px] py-12 text-center">
          <h2 className="font-display text-xl mb-3">Something went wrong</h2>
          <p className="text-sm text-[var(--gh-text-muted)] mb-4">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="rounded-[10px] px-4 py-2 text-sm border border-[var(--gh-border)] hover:text-[var(--gh-cyan)]"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

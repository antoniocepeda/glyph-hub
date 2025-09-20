"use client"

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getAnalytics } from '@/lib/firebase'
import { logEvent } from 'firebase/analytics'

function useUrl(): string {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams?.toString()
  return query ? `${pathname}?${query}` : pathname || '/'
}

export function AnalyticsBoot() {
  const url = useUrl()
  const lastUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (lastUrlRef.current === url) return
    lastUrlRef.current = url
    getAnalytics().then((analytics) => {
      if (!analytics) return
      try {
        logEvent(analytics, 'page_view', {
          page_location: window.location.href,
          page_path: url,
          page_title: document.title,
        })
      } catch {
        // no-op
      }
    })
  }, [url])

  return null
}

export default AnalyticsBoot



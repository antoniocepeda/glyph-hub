"use client"
export const dynamic = 'force-dynamic'
import nextDynamic from 'next/dynamic'
import { Suspense } from 'react'

const ChatClient = nextDynamic(() => import('../_chat_disabled/page'), { ssr: false })

export default function ChatPage() {
  return (
    <Suspense fallback={<div />}> 
      <ChatClient />
    </Suspense>
  )
}



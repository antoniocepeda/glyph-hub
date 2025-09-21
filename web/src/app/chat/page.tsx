export const dynamic = 'force-dynamic'
import dyn from 'next/dynamic'
import { Suspense } from 'react'

const ChatClient = dyn(() => import('../_chat_disabled/page'), { ssr: false })

export default function ChatPage() {
  return (
    <Suspense fallback={<div />}> 
      <ChatClient />
    </Suspense>
  )
}



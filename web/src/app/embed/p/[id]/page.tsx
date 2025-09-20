"use client"
import { useEffect, useState } from 'react'
import { getDb } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useParams } from 'next/navigation'

type PromptData = { id: string; title: string; body: string }

export default function PromptEmbed() {
  const params = useParams() as { id: string }
  const [data, setData] = useState<PromptData | null>(null)

  useEffect(() => {
    async function load() {
      const db = getDb()
      if (!db) return
      const snap = await getDoc(doc(db, 'prompts', params.id))
      if (snap.exists()) {
        const d = snap.data() as { title?: string; body?: string }
        setData({ id: snap.id, title: d.title || '', body: d.body || '' })
      }
    }
    load()
  }, [params.id])

  if (!data) return <div style={{fontFamily:'system-ui',fontSize:12,color:'#999',padding:12}}>Not found or private</div>

  return (
    <div style={{fontFamily:'system-ui',background:'transparent',color:'inherit',padding:12,borderRadius:12,border:'1px solid rgba(255,255,255,0.08)'}}>
      <div style={{fontWeight:600,marginBottom:6}}>{data.title}</div>
      <pre style={{whiteSpace:'pre-wrap',fontSize:12,margin:0}}>{data.body}</pre>
    </div>
  )
}


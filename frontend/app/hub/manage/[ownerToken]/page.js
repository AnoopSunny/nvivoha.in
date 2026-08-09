'use client'

/**
 * /hub/manage/[ownerToken] — Owner Wedding Hub.
 *
 * The ownerToken itself is high-entropy (192 bits) and only ever sent over the
 * couple's private WhatsApp link. No PIN gate. Loading the hub directly fetches
 * the data and renders.
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { NoIndexMeta } from '@/components/PreviewBadge'
import HubView from '@/components/HubView'

export default function OwnerHubPage() {
  const { ownerToken } = useParams()
  const router = useRouter()
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      try {
        const res = await fetch(`/api/hub/owner/${ownerToken}`, { cache: 'no-store' })
        const d = await res.json()
        if (cancelled) return
        if (!res.ok) { setError(d.error || 'This is a private wedding page'); return }
        setData(d.status)
      } catch (e) {
        if (cancelled) return
        setError('We could not load your hub')
      }
    }
    load()
    const id = setInterval(load, 20000)
    return () => { cancelled = true; clearInterval(id) }
  }, [ownerToken])

  if (error) return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#3A3226]" data-testid="owner-hub-error">
      <NoIndexMeta />
      <div className="max-w-md mx-auto py-24 px-4 text-center">
        <h1 className="font-serif text-3xl text-[#3A3226]">This is a private wedding page</h1>
        <p className="mt-3 text-[#3A3226]/70 text-sm">{error}</p>
        <button
          onClick={() => router.push('/hub/login')}
          className="mt-6 underline text-[#8B7355]"
          data-testid="owner-hub-relogin"
        >
          Find my hub again
        </button>
      </div>
    </main>
  )

  if (!data) return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#3A3226] flex items-center justify-center">
      <NoIndexMeta />
      <Loader2 className="animate-spin text-[#8B7355]" />
    </main>
  )

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#3A3226]" data-testid="owner-hub-page">
      <NoIndexMeta />
      <HubView data={data} ownerMode={true} ownerToken={ownerToken} />
    </main>
  )
}

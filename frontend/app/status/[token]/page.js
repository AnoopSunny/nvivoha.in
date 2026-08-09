'use client'

/**
 * /status/[token] — Deprecated.
 *
 * The legacy status page has been retired. Everything the couple needs lives
 * inside their PIN-gated Wedding Hub now. This page just bounces the user to
 * /hub/login (or shows a graceful fallback) so any pre-existing share links
 * keep working.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldCheck } from 'lucide-react'
import { NoIndexMeta } from '@/components/PreviewBadge'

export default function StatusRedirect() {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => router.replace('/hub/login'), 1200)
    return () => clearTimeout(t)
  }, [router])

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#3A3226] flex items-center justify-center px-4" data-testid="status-redirect">
      <NoIndexMeta />
      <div className="max-w-md text-center">
        <div className="text-[#8B7355] tracking-[0.3em] text-[10px] uppercase mb-2 inline-flex items-center gap-1.5 justify-center">
          <ShieldCheck size={11} /> Wedding Hub
        </div>
        <h1 className="font-serif font-light text-3xl text-[#3A3226]">Taking you to your hub…</h1>
        <p className="mt-3 text-sm text-[#3A3226]/70 leading-relaxed">
          Your project now lives inside a single, secure Wedding Hub. We&apos;ll sign you in
          with your WhatsApp + 4-digit publish code in a moment.
        </p>
        <Loader2 className="animate-spin mx-auto mt-6 text-[#8B7355]" />
        <a
          href="/hub/login"
          className="mt-6 inline-block underline text-[#8B7355]"
          data-testid="status-redirect-manual"
        >
          Go now
        </a>
      </div>
    </main>
  )
}

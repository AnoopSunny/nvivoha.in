'use client'

/**
 * Legacy `/c/[token]` Client Dashboard — deprecated in favour of the unified
 * Wedding Hub (`/hub/manage/<ownerToken>`).
 *
 * Anyone who still has the old dashboard link is gently redirected to the new
 * Hub login flow (WhatsApp + 4-digit publish code), with a friendly note
 * explaining what changed and why. We keep this page (instead of 404-ing it)
 * so old WhatsApp messages from the studio don't dead-end.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ShieldCheck, ChevronRight, Loader2 } from 'lucide-react'
import { NoIndexMeta } from '@/components/PreviewBadge'

export default function LegacyDashboardRedirect() {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => router.push('/hub/login'), 3200)
    return () => clearTimeout(t)
  }, [router])

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#3A3226] flex items-center justify-center px-4 py-14" data-testid="legacy-dashboard-redirect">
      <NoIndexMeta />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full text-center"
      >
        <div className="text-[#8B7355] tracking-[0.3em] text-[10px] uppercase mb-3 inline-flex items-center gap-2">
          <ShieldCheck size={12} /> A small upgrade
        </div>
        <h1 className="font-serif font-light text-3xl md:text-4xl leading-tight">
          We&apos;ve moved your dashboard into your
          <em className="italic text-[#8B7355]"> Wedding Hub</em>.
        </h1>
        <p className="mt-4 text-sm md:text-base text-[#3A3226]/70 leading-relaxed">
          Same RSVPs, same memories — now alongside your invite, status and share tools.
          Sign in once with your WhatsApp number and your 4-digit publish code.
        </p>

        <div className="mt-9 inline-flex items-center gap-2 text-[#8B7355] text-[11px] tracking-[0.25em] uppercase">
          <Loader2 size={12} className="animate-spin" /> Taking you there
        </div>

        <div className="mt-6">
          <a
            href="/hub/login"
            data-testid="legacy-dashboard-cta"
            className="inline-flex items-center gap-2 bg-[#3A3226] hover:bg-[#1F1A14] text-[#FDFBF7] px-7 py-4 tracking-[0.25em] text-[11px] uppercase transition"
          >
            Sign in to my Hub <ChevronRight size={12} />
          </a>
        </div>
      </motion.div>
    </main>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, ShieldCheck, ChevronRight, ChevronLeft, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { NoIndexMeta } from '@/components/PreviewBadge'

/**
 * /hub/login — couple recovers their private Wedding Hub link by entering
 * the WhatsApp number they registered with. No PIN. We look the wedding up
 * and redirect them to /hub/manage/<ownerToken>.
 */
export default function HubLoginPage() {
  const router = useRouter()
  const [whatsapp, setWhatsapp] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e?.preventDefault()
    const waDigits = whatsapp.replace(/\D+/g, '')
    if (!waDigits || waDigits.length < 10) {
      toast.error('Please enter the WhatsApp number you used to set this up'); return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/owner/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp: waDigits }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "We couldn't find a wedding with that number")
      router.push(`/hub/manage/${data.ownerToken}`)
    } catch (e) {
      toast.error(e.message)
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#3A3226] flex items-start md:items-center justify-center px-4 py-14" data-testid="hub-login-page">
      <NoIndexMeta />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-md"
      >
        <button
          onClick={() => router.push('/')}
          className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355] hover:text-[#3A3226] mb-4 inline-flex items-center gap-1"
          data-testid="hub-login-back"
        >
          <ChevronLeft size={11} /> Vivoha
        </button>

        <div className="text-[#8B7355] tracking-[0.3em] text-[10px] uppercase mb-3 flex items-center gap-2">
          <ShieldCheck size={12} /> Find your Wedding Hub
        </div>
        <h1 className="font-serif font-light text-4xl md:text-5xl text-[#3A3226] leading-tight">
          Open <em className="italic text-[#8B7355]">your</em> hub.
        </h1>
        <p className="mt-3 text-sm text-[#3A3226]/70 leading-relaxed">
          We sent your private hub link on WhatsApp. Lost it? Enter your number and we&apos;ll resurface it for you.
        </p>

        <form onSubmit={handleSubmit} className="mt-9 space-y-5 border border-[#C9B896] bg-white/40 p-6 md:p-8">
          <div>
            <Label className="text-[10px] tracking-[0.25em] uppercase text-[#8B7355] flex items-center gap-1.5">
              <MessageCircle size={11} /> WhatsApp number
            </Label>
            <Input
              type="tel"
              inputMode="numeric"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="9876543210"
              maxLength={15}
              autoFocus
              data-testid="hub-login-whatsapp"
              className="rounded-none border-[#C9B896] bg-white py-5 mt-1.5"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            data-testid="hub-login-submit"
            className="w-full bg-[#3A3226] hover:bg-[#1F1A14] text-[#FDFBF7] rounded-none py-6 tracking-[0.25em] text-[11px] uppercase font-medium disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <>Open my Wedding Hub <ChevronRight size={13} className="ml-1.5" /></>}
          </Button>
        </form>

        <div className="text-center text-[10px] tracking-[0.3em] uppercase text-[#8B7355] mt-6">
          No passwords · No OTPs · Just your WhatsApp number
        </div>
      </motion.div>
    </main>
  )
}

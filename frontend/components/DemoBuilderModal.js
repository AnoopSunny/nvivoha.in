'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Heart, Loader2, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

/**
 * DemoBuilderModal — Collects bride / groom / wedding date / WhatsApp, then
 * routes to the personalized demo for the selected template.
 *
 * Lead capture is kept intentionally light:
 *  - WhatsApp is the only contact field (no email gate).
 *  - A single consent checkbox covers Terms, Refund policy, and Privacy.
 *    It's ticked by default so a happy-path visitor never has to click it,
 *    but they can untick it (and we then block the submit) which gives us
 *    a clean audit trail of consent.
 */
export default function DemoBuilderModal({ open, onClose, template }) {
  const router = useRouter()
  const [bride, setBride] = useState('')
  const [groom, setGroom] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [agreed, setAgreed] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    try {
      const cached = JSON.parse(localStorage.getItem('vivoha_demo_seed') || '{}')
      if (cached.bride) setBride(cached.bride)
      if (cached.groom) setGroom(cached.groom)
      if (cached.weddingDate) setWeddingDate(cached.weddingDate)
      if (cached.whatsapp) setWhatsapp(cached.whatsapp)
    } catch {}
  }, [open])

  function close() {
    if (submitting) return
    onClose?.()
  }

  async function handleSubmit(e) {
    e?.preventDefault()
    const b = bride.trim()
    const g = groom.trim()
    const wa = whatsapp.trim()
    if (!b || !g) { toast.error('Bride and Groom names are required'); return }
    // Accept 10-digit Indian mobile or +91 / 91-prefixed numbers (10-13 digits).
    const waDigits = wa.replace(/\D+/g, '')
    if (!waDigits || waDigits.length < 10 || waDigits.length > 13) {
      toast.error('Please enter a valid WhatsApp number'); return
    }
    if (!agreed) { toast.error('Please agree to Terms, Refund & Privacy to continue'); return }
    setSubmitting(true)
    try {
      localStorage.setItem('vivoha_demo_seed', JSON.stringify({ bride: b, groom: g, weddingDate, whatsapp: waDigits, template: template?.name }))
    } catch {}
    // Lightweight lead capture — non-blocking
    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${b} & ${g}`,
        phone: waDigits,
        weddingDate,
        templateInterest: template?.name || '',
        message: 'Viewed personalized demo · consented to T&C, refund & privacy',
        source: 'demo-builder',
      }),
    }).catch(() => {})
    const params = new URLSearchParams({ bride: b, groom: g, date: weddingDate || '', whatsapp: waDigits })
    router.push(`/demo/${template.slug}?${params.toString()}`)
  }

  return (
    <AnimatePresence>
      {open && template && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
          className="fixed inset-0 z-[100] bg-[#1a1410]/80 backdrop-blur-sm flex items-center justify-center p-4"
          data-testid="demo-builder-modal"
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.35 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-[#FDFBF7] border border-[#C9B896] shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={close}
              data-testid="demo-modal-close"
              aria-label="close"
              className="absolute top-4 right-4 text-[#3A3226]/60 hover:text-[#3A3226] p-1 z-10"
            >
              <X size={18} />
            </button>

            {/* Visual hint — tiny gradient strip from the chosen template */}
            <div className="h-2 w-full" style={{ background: template.coverBg }} />

            <div className="p-8 md:p-10">
              <div className="text-[#8B7355] tracking-[0.3em] text-[10px] uppercase mb-3 flex items-center gap-2">
                <Heart size={12} /> Try it on
              </div>
              <h2
                className="font-serif font-light text-3xl md:text-4xl text-[#3A3226] leading-tight mb-3"
                data-testid="demo-modal-title"
              >
                See <em className="italic" style={{ color: template.coverAccent || '#8B7355' }}>{template.name}</em> with your names.
              </h2>
              <p className="text-sm text-[#3A3226]/70 leading-relaxed mb-6">
                We&apos;ll instantly show you this template with your details — countdown, hero, and all.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] tracking-widest uppercase text-[#8B7355]">Bride *</Label>
                    <Input
                      value={bride}
                      onChange={(e) => setBride(e.target.value)}
                      data-testid="demo-bride-input"
                      placeholder="Anaya"
                      maxLength={40}
                      className="rounded-none border-[#C9B896] bg-white/40 py-5 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] tracking-widest uppercase text-[#8B7355]">Groom *</Label>
                    <Input
                      value={groom}
                      onChange={(e) => setGroom(e.target.value)}
                      data-testid="demo-groom-input"
                      placeholder="Vihaan"
                      maxLength={40}
                      className="rounded-none border-[#C9B896] bg-white/40 py-5 mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] tracking-widest uppercase text-[#8B7355]">Wedding date</Label>
                  <Input
                    type="date"
                    value={weddingDate}
                    onChange={(e) => setWeddingDate(e.target.value)}
                    data-testid="demo-date-input"
                    className="rounded-none border-[#C9B896] bg-white/40 py-5 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[10px] tracking-widest uppercase text-[#8B7355]">WhatsApp number *</Label>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    data-testid="demo-whatsapp-input"
                    placeholder="9876543210"
                    maxLength={15}
                    className="rounded-none border-[#C9B896] bg-white/40 py-5 mt-1"
                  />
                  <p className="text-[10px] text-[#3A3226]/55 mt-1.5 leading-relaxed">
                    We&apos;ll use this to manage your invite. No spam — pinky promise.
                  </p>
                </div>

                {/* Consent — single combined checkbox, ticked by default. */}
                <label
                  className={`flex items-start gap-3 mt-2 cursor-pointer select-none p-3 border transition ${
                    agreed ? 'border-[#C9B896] bg-[#C9B896]/15' : 'border-red-300 bg-red-50/30'
                  }`}
                  data-testid="demo-consent-label"
                >
                  <span
                    className={`flex-shrink-0 w-5 h-5 mt-0.5 border-2 flex items-center justify-center transition ${
                      agreed ? 'bg-[#3A3226] border-[#3A3226] text-[#C9B896]' : 'bg-white border-[#3A3226]'
                    }`}
                    aria-hidden
                  >
                    {agreed && <Check size={13} strokeWidth={3} />}
                  </span>
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    data-testid="demo-consent-checkbox"
                    className="sr-only"
                  />
                  <span className="text-[11px] text-[#3A3226]/85 leading-relaxed">
                    I agree to the{' '}
                    <a href="/terms" target="_blank" rel="noreferrer" className="underline hover:text-[#3A3226]" data-testid="demo-consent-terms" onClick={(e) => e.stopPropagation()}>Terms &amp; Conditions</a>,{' '}
                    <a href="/refund-policy" target="_blank" rel="noreferrer" className="underline hover:text-[#3A3226]" data-testid="demo-consent-refund" onClick={(e) => e.stopPropagation()}>Refund Policy</a>{' '}
                    and{' '}
                    <a href="/privacy" target="_blank" rel="noreferrer" className="underline hover:text-[#3A3226]" data-testid="demo-consent-privacy" onClick={(e) => e.stopPropagation()}>Privacy Policy</a>.
                  </span>
                </label>

                <Button
                  type="submit"
                  disabled={submitting}
                  data-testid="demo-submit-btn"
                  className="w-full bg-[#3A3226] hover:bg-[#1F1A14] text-[#FDFBF7] rounded-none py-6 tracking-widest text-xs uppercase mt-4"
                >
                  {submitting ? (
                    <><Loader2 size={14} className="animate-spin mr-2" /> Preparing</>
                  ) : (
                    <>See My Demo <ChevronRight size={14} className="ml-1" /></>
                  )}
                </Button>
                <p className="text-[10px] text-center text-[#3A3226]/55 leading-relaxed pt-1">
                  No signup. No charge. We&apos;ll only WhatsApp you if you want to publish later.
                </p>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

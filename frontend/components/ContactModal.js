'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Phone, Mail, MessageCircle, Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

// Update these in one place. Used by every CTA.
export const WHATSAPP_NUMBER = '919876543210' // +91 98765 43210 — REPLACE with real number
export const WHATSAPP_GREETING =
  "Hi Vivoha! I'd love to create a wedding website with you. Can we talk?"

export function whatsappUrl(msg = WHATSAPP_GREETING) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`
}

export default function ContactModal({ open, onClose, source = 'landing', templateInterest = '' }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', partnerName: '',
    weddingDate: '', city: '', budget: '', message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Please enter your name'); return }
    if (!form.phone.trim() && !form.email.trim()) {
      toast.error('Please share a phone or email so we can reach you'); return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source, templateInterest }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not submit')
      setDone(true)
      toast.success('Thank you! We will reach out on WhatsApp within a few hours.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function close() {
    onClose?.()
    setTimeout(() => {
      setDone(false)
      setForm({ name: '', phone: '', email: '', partnerName: '', weddingDate: '', city: '', budget: '', message: '' })
    }, 300)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1F1A14]/75 backdrop-blur-sm p-3 sm:p-4 md:p-6 overflow-y-auto"
          onClick={close}
          data-testid="contact-modal"
        >
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl bg-[#FDFBF7] grid md:grid-cols-[1fr_1.2fr] max-h-[95vh] overflow-hidden shadow-2xl my-auto"
          >
            <button
              onClick={close}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-[#FDFBF7]/90 hover:bg-[#3A3226] hover:text-[#FDFBF7] text-[#3A3226] transition rounded-full shadow"
              aria-label="Close"
              data-testid="contact-modal-close"
            >
              <X size={18} />
            </button>

            {/* LEFT — copy + WhatsApp (collapses to compact band on mobile) */}
            <div className="bg-[#3A3226] text-[#FDFBF7] p-6 sm:p-8 md:p-10 lg:p-12 flex flex-col relative overflow-hidden">
              {/* soft gold flourish */}
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#C9B896]/15 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-[#8B7355]/15 blur-3xl pointer-events-none" />

              <div className="relative">
                <div className="text-[#C9B896] tracking-[0.3em] text-[10px] uppercase mb-4 flex items-center gap-2">
                  <Sparkles size={11} /> Begin Your Vivoha
                </div>
                <h2 className="font-serif font-light text-[1.85rem] sm:text-3xl md:text-4xl lg:text-5xl leading-[1.05] mb-4">
                  Tell us about <em className="italic text-[#C9B896]">your day</em>.
                </h2>
                <p className="text-[#FDFBF7]/75 leading-relaxed mb-6 text-sm md:text-[15px] max-w-sm">
                  Share a few details and our studio will reach you on WhatsApp within hours — a personal walk-through of templates, pricing, and timelines.
                </p>

                <a
                  href={whatsappUrl()}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="contact-modal-whatsapp"
                  className="inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1ebe57] text-white rounded-none py-3.5 px-5 tracking-widest text-[11px] uppercase mb-5 transition w-full sm:w-auto"
                >
                  <MessageCircle size={15} /> Chat on WhatsApp instead
                </a>

                {/* Trust strip */}
                <div className="hidden md:block mt-auto pt-10 space-y-3 text-sm text-[#FDFBF7]/75">
                  <div className="flex items-center gap-3"><Phone size={14} className="text-[#C9B896]" /> +91 98765 43210</div>
                  <div className="flex items-center gap-3"><Mail size={14} className="text-[#C9B896]" /> hello@vivoha.in</div>
                  <div className="text-[10px] tracking-[0.25em] uppercase text-[#C9B896]/70 pt-3">200+ couples · Free demos · Live in hours</div>
                </div>
              </div>
            </div>

            {/* RIGHT — form */}
            <div className="p-5 sm:p-7 md:p-10 overflow-y-auto bg-[#FDFBF7]">
              {done ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12" data-testid="contact-success">
                  <div className="w-16 h-16 rounded-full bg-[#C9B896]/30 flex items-center justify-center mb-6">
                    <Check size={28} className="text-[#3A3226]" />
                  </div>
                  <h3 className="font-serif text-3xl text-[#3A3226] mb-3">We have you</h3>
                  <p className="text-[#3A3226]/70 max-w-sm mb-8">
                    Our studio will reach out on WhatsApp shortly. Meanwhile, you can also message us directly.
                  </p>
                  <a
                    href={whatsappUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white px-6 py-3 tracking-widest text-xs uppercase transition"
                  >
                    <MessageCircle size={14} /> Open WhatsApp
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" data-testid="contact-form">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FieldM label="Your name *">
                      <Input data-testid="contact-name" value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Anaya" className="rounded-none border-[#C9B896] bg-white/80 h-11" />
                    </FieldM>
                    <FieldM label="Partner's name">
                      <Input data-testid="contact-partner" value={form.partnerName} onChange={(e) => set('partnerName', e.target.value)} placeholder="Vihaan" className="rounded-none border-[#C9B896] bg-white/80 h-11" />
                    </FieldM>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FieldM label="WhatsApp number">
                      <Input type="tel" data-testid="contact-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" className="rounded-none border-[#C9B896] bg-white/80 h-11" />
                    </FieldM>
                    <FieldM label="Email">
                      <Input type="email" data-testid="contact-email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com" className="rounded-none border-[#C9B896] bg-white/80 h-11" />
                    </FieldM>
                  </div>
                  <p className="text-[10px] text-[#8B7355]/85 -mt-2 tracking-wide">Phone or email — either is fine. We use one to reach you.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FieldM label="Wedding date">
                      <Input type="date" data-testid="contact-date" value={form.weddingDate} onChange={(e) => set('weddingDate', e.target.value)} className="rounded-none border-[#C9B896] bg-white/80 h-11" />
                    </FieldM>
                    <FieldM label="City">
                      <Input data-testid="contact-city" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Mumbai, Delhi…" className="rounded-none border-[#C9B896] bg-white/80 h-11" />
                    </FieldM>
                  </div>

                  {templateInterest && (
                    <div className="text-[11px] sm:text-xs text-[#8B7355] tracking-wider bg-[#C9B896]/15 border-l-2 border-[#C9B896] px-3 py-2">
                      Interested in: <span className="text-[#3A3226] font-medium">{templateInterest}</span>
                    </div>
                  )}

                  <FieldM label="Anything else?">
                    <Textarea data-testid="contact-message" value={form.message} onChange={(e) => set('message', e.target.value)} rows={3} maxLength={1000} placeholder="Wedding theme, special requests…" className="rounded-none border-[#C9B896] bg-white/80 resize-none" />
                  </FieldM>

                  <Button
                    type="submit"
                    disabled={submitting}
                    data-testid="contact-submit"
                    className="w-full bg-[#3A3226] hover:bg-[#1F1A14] text-[#FDFBF7] rounded-none py-5 sm:py-6 tracking-widest text-[11px] sm:text-xs uppercase shadow-md"
                  >
                    {submitting ? 'Sending…' : (<><Send size={14} className="mr-2" /> Send to Vivoha</>)}
                  </Button>
                  <p className="text-[10px] text-[#8B7355] tracking-wider text-center leading-relaxed pt-1">
                    By submitting, you agree we&apos;ll contact you on WhatsApp / phone about your wedding website.
                  </p>

                  {/* Mobile contact band — only shows on small screens */}
                  <div className="md:hidden border-t border-[#C9B896]/40 pt-4 mt-2 flex items-center justify-around text-[11px] text-[#3A3226]/70">
                    <span className="flex items-center gap-1.5"><Phone size={12} className="text-[#8B7355]" /> +91 98765 43210</span>
                    <span className="flex items-center gap-1.5"><Mail size={12} className="text-[#8B7355]" /> hello@vivoha.in</span>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function FieldM({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] tracking-widest uppercase text-[#8B7355]">{label}</Label>
      {children}
    </div>
  )
}

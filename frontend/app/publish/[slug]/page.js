'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, Loader2, Sparkles, Globe, Wand2, Camera, ChevronRight, ChevronLeft,
  Copy, CheckCheck, Upload, ShieldCheck, MessageCircle, Instagram, QrCode,
  Clock, Heart, X,
} from 'lucide-react'
import { toast } from 'sonner'

// Single, unified Vivoha experience — no plan tiers.
const BASE = {
  id: 'vivoha',
  name: 'Vivoha Wedding Website',
  price: 799,
  perks: [
    'All templates',
    'Full RSVP + meal preferences',
    'Cinematic gallery',
    'Guest photo wall',
    'Multi-event timeline & maps',
    'Private link',
    'Lifetime hosting',
  ],
}

// Fallbacks — overridden by /api/payment-config when available.
const FALLBACK = {
  upiId: 'anoopsunny04@ybl',
  upiName: 'Vivoha',
  whatsappNumber: '917339557802',
  instagram: 'vivoha.in',
}

function fileToDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function PublishPage() {
  const { slug } = useParams()
  const sp = useSearchParams()
  const router = useRouter()
  const onboardToken = sp.get('onboardToken') || ''

  const [wedding, setWedding] = useState(null)
  const [payCfg, setPayCfg] = useState(FALLBACK)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null) // { ownerToken }
  const [copied, setCopied] = useState(false)
  const [qrImgError, setQrImgError] = useState(false)

  // Confirm form
  const [whatsapp, setWhatsapp] = useState('')
  const [txnRef, setTxnRef] = useState('')
  const [screenshot, setScreenshot] = useState(null) // { dataUri, name }
  const fileRef = useRef(null)

  useEffect(() => {
    fetch('/api/payment-config').then(r => r.json()).then(d => {
      const c = d.config || {}
      setPayCfg({
        upiId: c.plans?.vivoha?.upiId || FALLBACK.upiId,
        upiName: c.upiName || FALLBACK.upiName,
        whatsappNumber: c.whatsappNumber || FALLBACK.whatsappNumber,
        instagram: c.instagram || FALLBACK.instagram,
        qrUrl: c.plans?.vivoha?.qrUrl || '',
      })
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!onboardToken) return
    fetch(`/api/onboard/wedding/${onboardToken}`).then(r => r.json()).then(d => {
      if (d.wedding) {
        setWedding(d.wedding)
        // If they already submitted / published, take them to their hub view
        if (['verification_pending', 'approved'].includes(d.wedding.paymentStatus)) {
          if (d.wedding.ownerToken) router.replace(`/hub/manage/${d.wedding.ownerToken}`)
        }
      }
    }).catch(() => {})
  }, [onboardToken, router])

  const grandTotal = BASE.price

  // Build UPI intent + QR whenever the total or upi id changes.
  const upiLink = useMemo(() => {
    const tn = `Vivoha Wedding Website${wedding ? ` - ${wedding.brideName} & ${wedding.groomName}` : ''}`.slice(0, 60)
    const params = new URLSearchParams({
      pa: payCfg.upiId, pn: payCfg.upiName, am: String(grandTotal), cu: 'INR', tn,
    })
    return `upi://pay?${params.toString()}`
  }, [payCfg.upiId, payCfg.upiName, grandTotal, wedding])

  function copyUpi() {
    navigator.clipboard?.writeText(payCfg.upiId).then(() => {
      setCopied(true)
      toast.success('UPI ID copied')
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => toast.error('Could not copy — please copy manually'))
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image screenshot'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Screenshot too large (max ~10MB)'); return }
    try {
      const dataUri = await fileToDataUri(file)
      setScreenshot({ dataUri, name: file.name })
    } catch (_) { toast.error('Could not read that file') }
  }

  const waHref = useMemo(() => {
    const num = String(payCfg.whatsappNumber || '').replace(/\D/g, '')
    const msg = `Hi Vivoha! I'd like to publish my wedding website (${slug}). Total ₹${grandTotal.toLocaleString('en-IN')}. Here's my payment screenshot 👇`
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
  }, [payCfg.whatsappNumber, slug, grandTotal])

  const igHref = `https://instagram.com/${String(payCfg.instagram || '').replace(/^@/, '')}`

  async function submitForVerification() {
    if (!onboardToken) { toast.error("Session missing — let's start again"); return }
    const num = whatsapp.replace(/\D/g, '')
    if (num.length < 10) { toast.error('Please enter your WhatsApp number so we can send your confirmation'); return }
    if (!screenshot?.dataUri) { toast.error('Please attach your payment screenshot'); return }
    setSubmitting(true)
    try {
      // 1. Save plan selection
      const sel = await fetch(`/api/onboard/select-plan/${onboardToken}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'vivoha', addons: [] }),
      })
      const selData = await sel.json()
      if (!sel.ok) throw new Error(selData.error || "Couldn't save your selection")

      // 2. Register the owner (mints ownerToken tied to their WhatsApp → Wedding Hub)
      const reg = await fetch('/api/owner/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardToken, whatsapp: num }),
      })
      const regData = await reg.json()
      if (!reg.ok) throw new Error(regData.error || "Couldn't save your contact")
      const ownerToken = regData.ownerToken

      // 3. Submit payment proof for verification
      const pay = await fetch(`/api/onboard/submit-payment/${onboardToken}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUri: screenshot.dataUri, txnRef, note: `WhatsApp: ${num}` }),
      })
      const payData = await pay.json()
      if (!pay.ok) throw new Error(payData.error || "Couldn't submit your payment")

      setSuccess({ ownerToken, statusToken: payData.statusToken })
    } catch (e) {
      toast.error(e.message || "Something went wrong — let's fix it")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return <VerificationPending
      wedding={wedding}
      ownerToken={success.ownerToken}
      waHref={waHref}
      onGoHub={() => { window.location.href = `/hub/manage/${success.ownerToken}` }}
    />
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#3A3226]" data-testid="publish-page">
      {/* Top bar */}
      <div className="border-b border-[#C9B896]/40 sticky top-0 bg-[#FDFBF7]/90 backdrop-blur z-20">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[#3A3226]/70 hover:text-[#3A3226] tracking-widest uppercase text-[10px] transition-colors"
            data-testid="publish-back"
          >
            <ChevronLeft size={12} /> Back to preview
          </button>
          <div className="font-serif text-lg">Vivoha<span className="text-[#8B7355]">·</span></div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
        {/* Heading */}
        <div className="text-[#8B7355] tracking-[0.35em] text-[10px] uppercase mb-4 flex items-center gap-2">
          <Sparkles size={12} /> One last step
        </div>
        <h1 className="font-serif font-light text-4xl md:text-5xl text-[#3A3226] leading-tight max-w-2xl mb-3" data-testid="publish-heading">
          Almost there.
        </h1>
        <p className="text-[#3A3226]/70 max-w-xl text-base leading-relaxed" data-testid="publish-subheading">
          Pay securely via UPI and share your payment screenshot. Our studio verifies and publishes your website — usually within a few hours.
        </p>

        {/* ===== Base price card ===== */}
        <section
          className="mt-10 relative bg-white/40 border border-[#C9B896]"
          data-testid="publish-base-card"
        >
          <div className="absolute -top-3 left-8 bg-[#3A3226] text-[#C9B896] text-[9px] tracking-[0.4em] uppercase px-4 py-1.5">
            ✦ Included
          </div>
          <div className="p-7 md:p-9">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
              <h2 className="font-serif text-2xl md:text-3xl text-[#3A3226] leading-tight">{BASE.name}</h2>
              <div className="font-serif text-4xl md:text-5xl text-[#1F1A14] leading-none">
                ₹{BASE.price.toLocaleString('en-IN')}
              </div>
            </div>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {BASE.perks.map((p, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-[13px] text-[#3A3226]/85">
                  <Check size={14} className="text-[#8B7355] mt-0.5 flex-shrink-0" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===== Total banner ===== */}
        <div
          className="mt-10 bg-[#1F1A14] text-[#FDFBF7] p-7 md:p-9 relative overflow-hidden"
          data-testid="publish-total-card"
        >
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 20% 30%, #C9B896 1px, transparent 1px), radial-gradient(circle at 80% 70%, #C9B896 1px, transparent 1px)',
            backgroundSize: '40px 40px, 40px 40px',
          }} />
          <div className="relative flex items-center justify-between gap-6">
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-[#C9B896] mb-1.5">Amount to pay</div>
              <div className="font-serif text-5xl md:text-6xl" data-testid="publish-grand-total">₹{grandTotal.toLocaleString('en-IN')}</div>
              <div className="text-[10px] tracking-[0.25em] uppercase text-[#C9B896]/85 mt-2">One-time · Lifetime hosting</div>
            </div>
            <Heart className="text-[#C9B896]/40 hidden sm:block" size={56} strokeWidth={1} />
          </div>
        </div>

        {/* ===== STEP 1 — Pay via UPI ===== */}
        <section
          className="mt-10"
          data-testid="pay-step-1"
        >
          <StepHeader n="1" title={`Pay ₹${grandTotal.toLocaleString('en-IN')}`} sub="Scan the QR or use the UPI ID in any UPI app (GPay, PhonePe, Paytm)" />
          <div className="mt-5 grid md:grid-cols-2 gap-5">
            {/* QR */}
            <div className="border border-[#C9B896] bg-white p-6 flex flex-col items-center justify-center text-center">
              <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355] mb-4 flex items-center gap-1.5">
                <QrCode size={12} /> Scan to pay
              </div>
              {qrImgError ? (
                <div className="w-52 h-52 flex flex-col items-center justify-center text-center text-[#8B7355] text-[11px] px-4">
                  <QrCode size={28} className="mb-2" />
                  Scan not loading — please use the UPI ID on the right.
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/upi-qr?amount=${grandTotal}&format=png`}
                  alt="UPI QR code"
                  className="w-52 h-52"
                  data-testid="upi-qr"
                  onError={() => setQrImgError(true)}
                />
              )}
              <a href={upiLink} className="mt-4 text-[11px] tracking-[0.2em] uppercase text-[#8B7355] underline md:hidden" data-testid="upi-open-app">
                Open in UPI app
              </a>
            </div>

            {/* UPI ID + contacts */}
            <div className="border border-[#C9B896] bg-white/50 p-6 flex flex-col">
              <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355] mb-2">Or pay to this UPI ID</div>
              <button
                onClick={copyUpi}
                data-testid="copy-upi-btn"
                className="group flex items-center justify-between gap-3 border border-[#3A3226]/30 hover:border-[#3A3226] bg-[#FDFBF7] px-4 py-4 transition"
              >
                <span className="font-serif text-xl text-[#1F1A14] break-all text-left">{payCfg.upiId}</span>
                <span className="flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-[#8B7355] flex-shrink-0">
                  {copied ? <><CheckCheck size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </span>
              </button>
              <div className="mt-4 text-[13px] text-[#3A3226]/70 leading-relaxed">
                Send exactly <span className="font-medium text-[#1F1A14]">₹{grandTotal.toLocaleString('en-IN')}</span> and take a screenshot of the success page.
              </div>

              <div className="mt-auto pt-5 grid grid-cols-2 gap-3">
                <a href={waHref} target="_blank" rel="noreferrer" data-testid="whatsapp-link"
                  className="flex items-center justify-center gap-2 border border-[#25D366]/50 text-[#128C3E] hover:bg-[#25D366]/10 px-3 py-3 text-[11px] tracking-[0.15em] uppercase transition">
                  <MessageCircle size={14} /> WhatsApp
                </a>
                <a href={igHref} target="_blank" rel="noreferrer" data-testid="instagram-link"
                  className="flex items-center justify-center gap-2 border border-[#C13584]/40 text-[#C13584] hover:bg-[#C13584]/10 px-3 py-3 text-[11px] tracking-[0.15em] uppercase transition">
                  <Instagram size={14} /> Instagram
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ===== STEP 2 — Confirm ===== */}
        <section
          className="mt-10"
          data-testid="pay-step-2"
        >
          <StepHeader n="2" title="Confirm your payment" sub="Upload your screenshot — we verify and publish, then message you the link." />
          <div className="mt-5 border border-[#C9B896] bg-white/50 p-6 md:p-7 space-y-5">
            {/* WhatsApp */}
            <div>
              <label className="text-[10px] tracking-[0.25em] uppercase text-[#8B7355] block mb-2">Your WhatsApp number *</label>
              <input
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="e.g. 98765 43210"
                inputMode="numeric"
                data-testid="whatsapp-input"
                className="w-full bg-[#FDFBF7] border border-[#3A3226]/25 focus:border-[#3A3226] outline-none px-4 py-3 text-[#1F1A14]"
              />
              <p className="text-[11px] text-[#3A3226]/55 mt-1.5">We'll send your live link + Wedding Hub here.</p>
            </div>

            {/* Txn ref */}
            <div>
              <label className="text-[10px] tracking-[0.25em] uppercase text-[#8B7355] block mb-2">UPI / Transaction reference <span className="normal-case tracking-normal text-[#3A3226]/40">(optional)</span></label>
              <input
                value={txnRef}
                onChange={e => setTxnRef(e.target.value)}
                placeholder="e.g. 4321XXXXXX or UTR"
                data-testid="txn-ref-input"
                className="w-full bg-[#FDFBF7] border border-[#3A3226]/25 focus:border-[#3A3226] outline-none px-4 py-3 text-[#1F1A14]"
              />
            </div>

            {/* Screenshot */}
            <div>
              <label className="text-[10px] tracking-[0.25em] uppercase text-[#8B7355] block mb-2">Payment screenshot *</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" data-testid="screenshot-file-input" />
              {screenshot ? (
                <div className="flex items-center gap-4 border border-[#3A3226]/25 bg-[#FDFBF7] p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={screenshot.dataUri} alt="payment proof" className="w-16 h-16 object-cover" />
                  <span className="text-[13px] text-[#1F1A14] truncate flex-1">{screenshot.name}</span>
                  <button onClick={() => { setScreenshot(null); if (fileRef.current) fileRef.current.value = '' }} data-testid="remove-screenshot" className="text-[#8B7355] hover:text-[#3A3226] p-1">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  data-testid="upload-screenshot-btn"
                  className="w-full border border-dashed border-[#3A3226]/40 hover:border-[#3A3226] bg-[#FDFBF7] px-4 py-8 flex flex-col items-center gap-2 text-[#8B7355] transition"
                >
                  <Upload size={20} />
                  <span className="text-[12px] tracking-[0.15em] uppercase">Tap to upload screenshot</span>
                </button>
              )}
            </div>

            <button
              onClick={submitForVerification}
              disabled={submitting}
              data-testid="submit-payment-btn"
              className="group w-full bg-[#3A3226] hover:bg-[#1F1A14] text-[#FDFBF7] px-8 py-5 tracking-[0.2em] text-[11px] uppercase transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting
                ? <><Loader2 size={14} className="animate-spin" /> Submitting…</>
                : <>Submit for verification <ChevronRight size={13} className="group-hover:translate-x-1 transition" /></>}
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] tracking-[0.25em] uppercase text-[#8B7355]">
              <ShieldCheck size={12} /> Your preview stays saved · No account needed
            </div>
          </div>
        </section>

        {/* Reassurance */}
        <div className="mt-8 flex items-center justify-center gap-2 text-center text-[12px] text-[#3A3226]/55">
          <Clock size={13} /> Most websites go live within a few hours of payment.
        </div>
      </div>
    </main>
  )
}

function StepHeader({ n, title, sub }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 flex-shrink-0 bg-[#C9B896] text-[#1F1A14] font-serif text-lg flex items-center justify-center">{n}</div>
      <div>
        <h3 className="font-serif text-2xl text-[#1F1A14] leading-tight">{title}</h3>
        <p className="text-[13px] text-[#3A3226]/65 mt-1 leading-relaxed">{sub}</p>
      </div>
    </div>
  )
}

function VerificationPending({ wedding, ownerToken, waHref, onGoHub }) {
  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#3A3226] flex items-center justify-center px-4 py-16" data-testid="verification-pending">
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}
        className="max-w-lg w-full text-center"
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 160 }}
          className="w-16 h-16 mx-auto bg-[#3A3226] text-[#C9B896] flex items-center justify-center"
        >
          <CheckCheck size={26} />
        </motion.div>
        <div className="text-[#8B7355] tracking-[0.35em] text-[10px] uppercase mt-6 mb-3 inline-flex items-center gap-2">
          <Clock size={12} /> Payment received
        </div>
        <h1 className="font-serif font-light text-3xl md:text-4xl leading-tight">
          Thank you{wedding ? `, ${wedding.brideName} & ${wedding.groomName}` : ''} ✨
        </h1>
        <p className="mt-4 text-sm md:text-base text-[#3A3226]/70 leading-relaxed">
          We&apos;ve received your payment details. Our studio is verifying it now and your website
          will go live shortly — we&apos;ll message you on WhatsApp the moment it&apos;s published.
        </p>

        <div className="mt-9 space-y-3">
          <button
            onClick={onGoHub}
            data-testid="go-to-hub-btn"
            className="w-full inline-flex items-center justify-center gap-2 bg-[#3A3226] hover:bg-[#1F1A14] text-[#FDFBF7] px-7 py-4 tracking-[0.25em] text-[11px] uppercase transition"
          >
            Open my Wedding Hub <ChevronRight size={12} />
          </button>
          <a
            href={waHref}
            target="_blank" rel="noreferrer"
            data-testid="pending-whatsapp"
            className="w-full inline-flex items-center justify-center gap-2 border border-[#25D366]/50 text-[#128C3E] hover:bg-[#25D366]/10 px-7 py-4 tracking-[0.25em] text-[11px] uppercase transition"
          >
            <MessageCircle size={14} /> Message us on WhatsApp
          </a>
        </div>

        <p className="mt-6 text-[11px] text-[#3A3226]/45 leading-relaxed">
          Bookmark your Wedding Hub — it&apos;s where your invite link, RSVPs and guest photos live.
        </p>
      </motion.div>
    </main>
  )
}

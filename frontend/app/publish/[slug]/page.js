'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Check, Loader2, Sparkles, Globe, Wand2, Camera, ChevronRight, ChevronLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import PostPaymentSuccess from '@/components/PostPaymentSuccess'

// Single, unified Vivoha experience — no plan tiers.
const BASE = {
  id: 'vivoha',
  name: 'Vivoha Wedding Website',
  price: 2999,
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

// Static add-on copy — backend is authoritative on price.
const ADDON_META = {
  'custom-domain':  { icon: Globe,  subtitle: 'yourname.com or rahul-priya.vivoha.in' },
  'concierge':      { icon: Wand2,  subtitle: 'We build your website for you — you just approve' },
  'guest-memories': { icon: Camera, subtitle: 'Unlimited guest photo uploads' },
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function PublishPage() {
  const { slug } = useParams()
  const sp = useSearchParams()
  const router = useRouter()
  const onboardToken = sp.get('onboardToken') || ''

  const [wedding, setWedding] = useState(null)
  const [addonsCatalog, setAddonsCatalog] = useState([])
  const [selectedAddons, setSelectedAddons] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null) // { hubUrl, publicUrl }

  useEffect(() => {
    fetch('/api/payment-config').then(r => r.json()).then(d => {
      if (Array.isArray(d.config?.addons)) setAddonsCatalog(d.config.addons)
    }).catch(() => {})
    loadRazorpayScript()
  }, [])

  useEffect(() => {
    if (!onboardToken) return
    fetch(`/api/onboard/wedding/${onboardToken}`).then(r => r.json()).then(d => {
      if (d.wedding) {
        setWedding(d.wedding)
        if (Array.isArray(d.wedding.paymentAddons)) setSelectedAddons(d.wedding.paymentAddons)
      }
    }).catch(() => {})
  }, [onboardToken])

  function toggleAddon(id) {
    setSelectedAddons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const addonsTotal = useMemo(() => addonsCatalog
    .filter(a => selectedAddons.includes(a.id))
    .reduce((s, a) => s + (a.price || 0), 0), [addonsCatalog, selectedAddons])
  const grandTotal = BASE.price + addonsTotal

  async function payAndPublish() {
    if (!onboardToken) { toast.error("Session missing — let's start again"); return }
    setSubmitting(true)
    try {
      const ok = await loadRazorpayScript()
      if (!ok) throw new Error("Couldn't load secure payments — please try again")

      // 1. Save plan selection
      const sel = await fetch(`/api/onboard/select-plan/${onboardToken}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'vivoha', addons: selectedAddons }),
      })
      const selData = await sel.json()
      if (!sel.ok) throw new Error(selData.error || "Couldn't save your selection")

      // 2. Create Razorpay order (server-side)
      const orderRes = await fetch('/api/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: grandTotal,
          currency: 'INR',
          receipt: `viv-${slug}`.slice(0, 40),
          notes: { slug, onboardToken },
        }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) throw new Error(orderData.error || "Couldn't create your order")

      const coupleName = `${wedding?.brideName || ''} ${wedding?.groomName || ''}`.trim() || 'Vivoha couple'
      const whatsappNumber = wedding?.ownerWhatsapp || ''

      // 3. Open Razorpay checkout
      const rzp = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Vivoha',
        description: 'Your Wedding Website',
        image: '/vivoha-logo.png',
        order_id: orderData.orderId,
        prefill: { name: coupleName, contact: whatsappNumber },
        theme: { color: '#1a1a1a' },
        modal: {
          ondismiss: function () {
            setSubmitting(false)
            toast('Payment cancelled. Your website preview is still saved.')
          },
        },
        handler: async function (response) {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                onboardToken,
              }),
            })
            const v = await verifyRes.json()
            if (!verifyRes.ok || !v.success) throw new Error(v.error || "Payment couldn't be verified")
            setSuccess({
              publicUrl: v.websiteUrl,
              hubUrl: v.hubUrl,
              brideName: wedding?.brideName || '',
              groomName: wedding?.groomName || '',
            })
            // Auto-redirect after success screen
            setTimeout(() => { window.location.href = v.hubUrl }, 3000)
          } catch (e) {
            toast.error(e.message || "Something went wrong — let's fix it")
            setSubmitting(false)
          }
        },
      })
      rzp.on('payment.failed', function () {
        toast.error("Payment didn't go through — try once more")
        setSubmitting(false)
      })
      rzp.open()
    } catch (e) {
      toast.error(e.message)
      setSubmitting(false)
    }
  }

  if (success) {
    return <PostPaymentSuccess
      brideName={success.brideName}
      groomName={success.groomName}
      publicUrl={success.publicUrl}
      hubUrl={success.hubUrl}
    />
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#3A3226]" data-testid="publish-page">
      {/* Top bar */}
      <div className="border-b border-[#C9B896]/40">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[#3A3226]/70 hover:text-[#3A3226] tracking-widest uppercase text-[10px]"
            data-testid="publish-back"
          >
            <ChevronLeft size={12} /> Back to preview
          </button>
          <div className="font-serif text-lg">Vivoha<span className="text-[#8B7355]">·</span></div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-14 md:py-20 max-w-3xl">
        {/* Heading */}
        <div className="text-[#8B7355] tracking-[0.35em] text-[10px] uppercase mb-4 flex items-center gap-2">
          <Sparkles size={12} /> Almost there
        </div>
        <h1 className="font-serif font-light text-4xl md:text-5xl text-[#3A3226] leading-tight max-w-2xl mb-3" data-testid="publish-heading">
          Almost there.
        </h1>
        <p className="text-[#3A3226]/70 max-w-xl text-base leading-relaxed" data-testid="publish-subheading">
          Your Vivoha website includes everything. Add anything extra below.
        </p>

        {/* ===== Base price card ===== */}
        <motion.section
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
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
        </motion.section>

        {/* ===== Add-ons ===== */}
        {addonsCatalog.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mt-10"
            data-testid="publish-addons"
          >
            <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355] mb-4">Optional add-ons</div>
            <div className="grid sm:grid-cols-3 gap-3">
              {addonsCatalog.map((a) => {
                const meta = ADDON_META[a.id] || {}
                const Icon = meta.icon || Sparkles
                const selected = selectedAddons.includes(a.id)
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAddon(a.id)}
                    data-testid={`addon-${a.id}`}
                    aria-pressed={selected}
                    className={`group relative text-left border p-5 transition focus:outline-none ${
                      selected
                        ? 'border-[#3A3226] bg-[#3A3226] text-[#FDFBF7]'
                        : 'border-[#C9B896] bg-white/40 text-[#3A3226] hover:border-[#3A3226]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className={`w-9 h-9 flex items-center justify-center flex-shrink-0 ${selected ? 'bg-[#C9B896] text-[#1F1A14]' : 'bg-[#3A3226] text-[#C9B896]'}`}>
                        <Icon size={14} />
                      </div>
                      <span className={`w-5 h-5 border flex items-center justify-center transition ${
                        selected ? 'border-[#C9B896] bg-[#C9B896]' : 'border-[#C9B896]'
                      }`}>
                        {selected && <Check size={12} className="text-[#1F1A14]" />}
                      </span>
                    </div>
                    <div className="font-serif text-lg leading-tight">{a.name}</div>
                    <div className={`text-[12px] mt-2 leading-relaxed ${selected ? 'text-[#FDFBF7]/80' : 'text-[#3A3226]/70'}`}>
                      {meta.subtitle || a.tagline || a.blurb}
                    </div>
                    <div className={`mt-4 pt-3 border-t flex items-center justify-end text-base ${selected ? 'border-[#C9B896]/40' : 'border-[#C9B896]/50'}`}>
                      <span className="font-serif">+₹{(a.price || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.section>
        )}

        {/* ===== Sticky total + pay ===== */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mt-10 bg-[#1F1A14] text-[#FDFBF7] p-7 md:p-9 relative overflow-hidden"
          data-testid="publish-total-card"
        >
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 20% 30%, #C9B896 1px, transparent 1px), radial-gradient(circle at 80% 70%, #C9B896 1px, transparent 1px)',
            backgroundSize: '40px 40px, 40px 40px',
          }} />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-[#C9B896] mb-1.5">Total</div>
              <div className="font-serif text-5xl md:text-6xl" data-testid="publish-grand-total">₹{grandTotal.toLocaleString('en-IN')}</div>
              <div className="text-[10px] tracking-[0.25em] uppercase text-[#C9B896]/85 mt-2">One-time · Lifetime hosting · Live in minutes</div>
            </div>
            <button
              onClick={payAndPublish}
              disabled={submitting}
              data-testid="publish-pay-btn"
              className="group bg-[#C9B896] hover:bg-[#FDFBF7] text-[#1F1A14] px-8 py-5 tracking-[0.2em] text-[11px] uppercase transition inline-flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg whitespace-nowrap font-medium"
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Opening…</> : <>Pay ₹{grandTotal.toLocaleString('en-IN')} &amp; Publish <ChevronRight size={13} className="group-hover:translate-x-1 transition" /></>}
            </button>
          </div>
        </motion.div>

        <p className="text-center text-[10px] tracking-[0.3em] uppercase text-[#8B7355] mt-8">
          Secure payments by Razorpay · UPI · Cards · Wallets · Netbanking
        </p>
      </div>
    </main>
  )
}

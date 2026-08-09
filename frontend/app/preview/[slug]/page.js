'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, ChevronLeft, Sparkles, ChevronRight, Clock,
  Lock, ListChecks, Zap, Edit3, Check, X, Gem,
} from 'lucide-react'
import MoonveilTemplate from '@/components/templates/Moonveil'
import RoyalHeritageTemplate from '@/components/templates/RoyalHeritage'
import EternalEditTemplate from '@/components/templates/EternalEdit'
import CrimsonLotusTemplate from '@/components/templates/CrimsonLotus'
import SapphireSagaTemplate from '@/components/templates/SapphireSaga'
import SanctumVeilTemplate from '@/components/templates/SanctumVeil'
import MarigoldBloomTemplate from '@/components/templates/MarigoldBloom'
import PearlVelvetTemplate from '@/components/templates/PearlVelvet'
import BanyanBrassTemplate from '@/components/templates/BanyanBrass'
import PichwaiBloomTemplate from '@/components/templates/PichwaiBloom'
import AlbionVowTemplate from '@/components/templates/AlbionVow'
import JannahVowTemplate from '@/components/templates/JannahVow'
import { PreviewBadge, NoIndexMeta } from '@/components/PreviewBadge'
import WeddingPageWrapper from '@/components/WeddingPageWrapper'
import LivePhotoWall from '@/components/LivePhotoWall'

const TEMPLATES = {
  'Moonveil': MoonveilTemplate,
  'Royal Heritage': RoyalHeritageTemplate,
  'Eternal Edit': EternalEditTemplate,
  'Crimson Lotus': CrimsonLotusTemplate,
  'Sapphire Saga': SapphireSagaTemplate,
  'Sanctum Veil': SanctumVeilTemplate,
  'Marigold Bloom': MarigoldBloomTemplate,
  'Pearl & Velvet': PearlVelvetTemplate,
  'Banyan & Brass': BanyanBrassTemplate,
  'Pichwai Bloom': PichwaiBloomTemplate,
  'Albion Vow': AlbionVowTemplate,
  'Jannah Vow': JannahVowTemplate,
}

const BASE_PRICE = 2999

// Cards rendered inside the publish card. Backend remains authoritative
// on price (synced via /api/payment-config). These act as fallbacks.
const PUBLISH_CARD_ADDONS_FALLBACK = [
  { id: 'custom-domain', name: 'Custom Domain',   price: 799,  blurb: 'yourname.com or rahul-priya.vivoha.in' },
  { id: 'concierge',     name: 'Concierge Setup', price: 1499, blurb: 'We build it for you — you just approve.' },
]

function formatPreviewExpiry(ts) {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    return d.toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: 'numeric', minute: '2-digit',
    }).replace(',', ' ·')
  } catch {
    return ''
  }
}

function formatWeddingDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return '' }
}

function fmtINR(n) { return n.toLocaleString('en-IN') }

function daysUntil(iso) {
  if (!iso) return null
  try {
    const target = new Date(iso).getTime()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.ceil((target - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  } catch { return null }
}

function formatLongDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return '' }
}

export default function PreviewPage() {
  const { slug } = useParams()
  const sp = useSearchParams()
  const router = useRouter()
  // Resolve the onboard token synchronously on mount: URL first, then
  // localStorage. This avoids an initial unauthenticated fetch that would
  // briefly show "wedding not found".
  const [onboardToken, setOnboardToken] = useState(() => {
    if (typeof window === 'undefined') return ''
    const urlTok = sp?.get('onboardToken') || ''
    if (urlTok) return urlTok
    try { return window.localStorage.getItem(`vivoha_onboard_${slug}`) || '' } catch (_e) { return '' }
  })
  const [w, setW] = useState(null)
  const [error, setError] = useState(null)
  const [expired, setExpired] = useState(false)
  const [permanentlyExpired, setPermanentlyExpired] = useState(false)
  const [canReactivate, setCanReactivate] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [expiresAt, setExpiresAt] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [ownerToken, setOwnerToken] = useState('')
  const [addonsCatalog, setAddonsCatalog] = useState(PUBLISH_CARD_ADDONS_FALLBACK)
  const [selectedAddons, setSelectedAddons] = useState([])
  const [scrolledPastHero, setScrolledPastHero] = useState(false)
  const [galleryPromptVisible, setGalleryPromptVisible] = useState(false)
  const [galleryPromptDismissed, setGalleryPromptDismissed] = useState(false)
  const [nudgeFired, setNudgeFired] = useState(false)
  const galleryAnchorRef = useRef(null)

  // Side-effects for token: persist the URL-provided token and strip the
  // query string so the address bar stays clean even after refresh / share.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlTok = sp.get('onboardToken') || ''
    if (!urlTok) return
    const storageKey = `vivoha_onboard_${slug}`
    try { window.localStorage.setItem(storageKey, urlTok) } catch (_e) {}
    if (onboardToken !== urlTok) setOnboardToken(urlTok)
    try { router.replace(`/preview/${slug}`) } catch (_e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // Recover cached owner token (if any) so we can deep-link the hub later.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const t = window.localStorage.getItem(`vivoha_owner_${slug}`) || ''
        if (t) setOwnerToken(t)
      } catch (_e) {}
    }
  }, [slug])

  // Load wedding
  useEffect(() => {
    (async () => {
      try {
        setExpired(false); setPermanentlyExpired(false); setCanReactivate(false); setError(null)
        const url = onboardToken
          ? `/api/public/wedding/${slug}?onboardToken=${onboardToken}`
          : `/api/public/wedding/${slug}`
        const res = await fetch(url, { cache: 'no-store' })
        const data = await res.json()
        if (res.status === 410 || data.expired) {
          setExpired(true)
          setPermanentlyExpired(!!data.permanentlyExpired)
          setCanReactivate(!!data.canReactivate)
          setError(data.error || 'Your preview is inactive.')
          // 5-day deletion: clear the local onboardToken so it won't keep retrying
          if (data.permanentlyExpired && typeof window !== 'undefined') {
            try { window.localStorage.removeItem(`vivoha_onboard_${slug}`) } catch (_e) {}
          }
          return
        }
        if (!res.ok) { setError(data.error || 'Could not load preview'); return }
        setW(data.wedding)
        if (data.wedding?.previewExpiresAt) setExpiresAt(new Date(data.wedding.previewExpiresAt).getTime())
        if (Array.isArray(data.wedding?.paymentAddons)) setSelectedAddons(data.wedding.paymentAddons)
      } catch (e) { setError('Could not load preview') }
    })()
  }, [slug, onboardToken, reloadKey])

  async function reactivatePreview() {
    if (reactivating) return
    if (!onboardToken) {
      setError('We can\'t find your edit access. Please reopen the link from your WhatsApp message.')
      return
    }
    setReactivating(true)
    try {
      const res = await fetch('/api/reactivate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, onboardToken }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPermanentlyExpired(!!data.permanentlyExpired)
        setCanReactivate(false)
        setError(data.error || 'Could not reactivate. Please contact our studio.')
        return
      }
      // Small dramatic delay so the loading shimmer actually shows
      await new Promise(r => setTimeout(r, 900))
      setReloadKey(k => k + 1)
    } catch (_e) {
      setError('Could not reactivate right now. Please try again.')
    } finally {
      setReactivating(false)
    }
  }


  // Load add-ons catalog (backend price source of truth).
  useEffect(() => {
    fetch('/api/payment-config').then(r => r.json()).then(d => {
      const all = Array.isArray(d.config?.addons) ? d.config.addons : []
      // We only surface Custom Domain + Concierge Setup in the publish card.
      const ids = ['custom-domain', 'concierge']
      const pick = ids.map(id => all.find(a => a.id === id)).filter(Boolean)
      if (pick.length) setAddonsCatalog(pick)
    }).catch(() => {})
  }, [])

  // Auto-expire countdown — keep the silent check; we don't render a timer.
  useEffect(() => {
    if (!expiresAt) return
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [expiresAt])
  useEffect(() => {
    if (!expiresAt) return
    if (now >= expiresAt && !expired) setExpired(true)
  }, [now, expiresAt, expired])

  // Sticky bar — appears once the user has scrolled past the hero (100vh).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onScroll = () => setScrolledPastHero(window.scrollY > window.innerHeight * 0.95)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 3-minute inactivity nudge — fires ONCE per session if user hasn't clicked
  // Publish. Backend is also idempotent via `previewNudgeSent` flag, so even
  // multiple tabs / refreshes can't double-send.
  useEffect(() => {
    if (!onboardToken || nudgeFired) return
    if (!w) return
    const locked = w.paymentStatus === 'verification_pending' || w.paymentStatus === 'approved'
    if (locked) return
    if (w.previewNudgeSent) return
    const t = setTimeout(async () => {
      setNudgeFired(true)
      try {
        await fetch('/api/send-preview-nudge', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ onboardToken }),
        })
      } catch (_) {}
    }, 3 * 60 * 1000)
    return () => clearTimeout(t)
  }, [onboardToken, nudgeFired, w])

  // Gallery section -> floating prompt (once per session, 1.5s after entering)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!w) return // anchor only mounts after wedding data loads
    if (galleryPromptDismissed || galleryPromptVisible) return
    try {
      if (window.sessionStorage.getItem('vivoha_gallery_prompt_dismissed') === '1') {
        setGalleryPromptDismissed(true); return
      }
    } catch (_) {}
    const anchor = galleryAnchorRef.current
    if (!anchor) return
    let timeoutId
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry?.isIntersecting) {
        timeoutId = setTimeout(() => setGalleryPromptVisible(true), 1500)
        io.disconnect()
      }
    }, { threshold: 0.01, rootMargin: '0px 0px -10% 0px' })
    io.observe(anchor)
    return () => { io.disconnect(); if (timeoutId) clearTimeout(timeoutId) }
  }, [w, galleryPromptDismissed, galleryPromptVisible])

  function dismissGalleryPrompt() {
    setGalleryPromptVisible(false)
    setGalleryPromptDismissed(true)
    try { window.sessionStorage.setItem('vivoha_gallery_prompt_dismissed', '1') } catch (_) {}
  }

  function shareWithPartner() {
    const proto = window.location.protocol
    const host = window.location.host
    // Always use the customer's chosen URL (websiteSlug) if available,
    // and never include the onboardToken — the share link must stay clean.
    const shareSlug = w?.websiteSlug || slug
    const previewUrl = `${proto}//${host}/preview/${shareSlug}`
    const me = w?.brideName || w?.groomName || 'me'
    const msg = `Hey! I found our wedding website 💕\nLook how beautiful it looks with our names:\n${previewUrl}\n\nShould we go with this? — ${me}`
    const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(wa, '_blank', 'noopener')
  }

  // -------- derived --------
  const addonsTotal = useMemo(
    () => addonsCatalog.filter(a => selectedAddons.includes(a.id)).reduce((s, a) => s + (a.price || 0), 0),
    [addonsCatalog, selectedAddons],
  )
  const grandTotal = BASE_PRICE + addonsTotal
  const paymentSubmitted = w?.paymentStatus === 'verification_pending'
  const paymentApproved = w?.paymentStatus === 'approved'
  const isLocked = paymentSubmitted || paymentApproved
  const editHref = onboardToken ? `/onboard/${onboardToken}` : null

  function goEdit() {
    if (editHref) router.push(editHref)
    else router.back()
  }

  async function gatedGo(intent) {
    if (intent === 'publish') {
      // Persist add-on selection so the publish page opens with the same total.
      if (onboardToken && selectedAddons.length >= 0) {
        try {
          await fetch(`/api/onboard/select-plan/${onboardToken}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: 'vivoha', addons: selectedAddons }),
          })
        } catch (_e) {}
      }
      router.push(`/publish/${slug}?onboardToken=${onboardToken}`)
    } else if (intent === 'hub') {
      let tok = ownerToken
      if (!tok && typeof window !== 'undefined') {
        try { tok = window.localStorage.getItem(`vivoha_owner_${slug}`) || '' } catch (_e) {}
      }
      router.push(tok ? `/hub/manage/${tok}` : '/hub/login')
    }
  }

  function toggleAddon(id) {
    setSelectedAddons(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  if (expired) {
    if (permanentlyExpired) {
      return (
        <main className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-8" data-testid="preview-permanently-expired">
          <div className="max-w-lg w-full bg-white border border-[#C9B896] shadow-xl p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-[#3A3226]/10 flex items-center justify-center mx-auto mb-5">
              <Clock className="text-[#3A3226]" size={26} />
            </div>
            <div className="text-[#8B7355] tracking-[0.3em] text-[10px] uppercase mb-2">Preview Deleted</div>
            <h1 className="font-serif text-3xl text-[#3A3226] mb-3">This preview is no longer available.</h1>
            <p className="text-[#3A3226]/70 leading-relaxed mb-7 text-sm">
              We keep unpublished drafts for 5 days. To start fresh, head back to Vivoha and pick a template — your story takes only a few minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="/" data-testid="preview-expired-home"
                className="bg-[#1F1A14] hover:bg-[#3A3226] text-[#FDFBF7] px-6 py-3 tracking-widest text-[11px] uppercase transition">Back to Vivoha</a>
              <a href="https://wa.me/919876543210?text=Hi%20Vivoha%2C%20my%20preview%20was%20deleted%20-%20can%20you%20help%3F"
                target="_blank" rel="noreferrer" data-testid="preview-expired-whatsapp"
                className="border border-[#25D366] text-[#0F5132] hover:bg-[#25D366] hover:text-white px-6 py-3 tracking-widest text-[11px] uppercase transition">WhatsApp Studio</a>
            </div>
          </div>
        </main>
      )
    }
    return (
      <main className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-8" data-testid="preview-inactive">
        <div className="max-w-lg w-full bg-white border border-[#C9B896] shadow-xl p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-[#C9A96E]/15 flex items-center justify-center mx-auto mb-5">
            {reactivating ? (
              <Loader2 className="text-[#C9A96E] animate-spin" size={26} />
            ) : (
              <Clock className="text-[#C9A96E]" size={26} />
            )}
          </div>
          <div className="text-[#8B7355] tracking-[0.3em] text-[10px] uppercase mb-2" data-testid="preview-inactive-eyebrow">
            {reactivating ? 'Waking your preview…' : 'Preview is Inactive'}
          </div>
          <h1 className="font-serif text-3xl text-[#3A3226] mb-3">
            {reactivating ? 'One moment.' : 'Your preview is taking a nap.'}
          </h1>
          <p className="text-[#3A3226]/70 leading-relaxed mb-7 text-sm">
            {reactivating
              ? 'Bringing your wedding website back to life…'
              : 'Drafts go inactive after a short while so they aren\'t shared as a free invite. Reactivate to keep building — you\'ll get one more hour to publish.'}
          </p>
          {canReactivate && onboardToken && (
            <button
              type="button"
              onClick={reactivatePreview}
              disabled={reactivating}
              data-testid="preview-reactivate-btn"
              className="group bg-[#1F1A14] hover:bg-[#3A3226] disabled:opacity-80 disabled:cursor-wait text-[#FDFBF7] px-8 py-4 tracking-[0.22em] text-[11px] uppercase transition inline-flex items-center justify-center gap-2 shadow-lg font-medium"
            >
              {reactivating ? (
                <><Loader2 size={13} className="animate-spin" /> Activating…</>
              ) : (
                <><Sparkles size={13} /> Activate Again <ChevronRight size={13} className="group-hover:translate-x-1 transition" /></>
              )}
            </button>
          )}
          {!reactivating && (
            <div className="mt-6 text-[10px] tracking-[0.25em] uppercase text-[#8B7355]/80">
              Drafts auto-delete 5 days after creation.
            </div>
          )}
          {!canReactivate && !onboardToken && (
            <a
              href="https://wa.me/919876543210?text=Hi%20Vivoha%2C%20my%20preview%20is%20inactive%20-%20can%20you%20help%3F"
              target="_blank" rel="noreferrer"
              data-testid="preview-inactive-whatsapp"
              className="inline-block bg-[#25D366] hover:bg-[#1ebe57] text-white px-6 py-3 tracking-widest text-[11px] uppercase transition"
            >
              Get help on WhatsApp
            </a>
          )}
        </div>
      </main>
    )
  }

  if (error) return (
    <main className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-8">
      <div className="text-center">
        <h1 className="font-serif text-3xl text-[#3A3226]">Preview unavailable</h1>
        <p className="mt-2 text-[#3A3226]/70">{error}</p>
        <a href="/" className="underline text-[#8B7355] mt-6 inline-block">Back to Vivoha</a>
      </div>
    </main>
  )
  if (!w) return <PreviewLoader slug={slug} />

  // If the wedding has been published already, redirect viewers to the live URL
  if (w.status === 'published' && !onboardToken) {
    if (typeof window !== 'undefined') window.location.replace(`/wedding/${w.slug}`)
  }

  const Template = TEMPLATES[w.template] || MoonveilTemplate
  const previewExpiryText = formatPreviewExpiry(expiresAt)
  const buttonTotalLabel = `Publish My Website — ₹${fmtINR(grandTotal)}`

  return (
    <main className="relative" data-testid="preview-page">
      <NoIndexMeta />

      {/* ============================== STICKY PUBLISH BAR (desktop only) ============================== */}
      <AnimatePresence>
        {scrolledPastHero && !isLocked && (
          <motion.div
            initial={{ y: -64, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -64, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="hidden md:flex fixed left-0 right-0 z-[99] bg-[#1A1A1A] text-[#FDFBF7] border-b border-[#C9B896]/15"
            style={{ top: 0, height: 56 }}
            data-testid="preview-sticky-publish-bar"
          >
            <div className="container mx-auto px-4 flex items-center justify-between gap-4 h-full">
              <div className="flex flex-col leading-tight min-w-0">
                <div className="font-serif text-base md:text-lg text-[#FDFBF7] truncate" data-testid="sticky-couple">
                  {w.brideName} <em className="italic text-[#C9B896]">&amp;</em> {w.groomName}
                </div>
                <div className="text-[10px] tracking-[0.25em] uppercase text-[#FDFBF7]/55 truncate">
                  {formatWeddingDate(w.weddingDate) || 'Your wedding'}
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <button
                  onClick={goEdit}
                  data-testid="sticky-edit-link"
                  className="text-[#FDFBF7]/70 hover:text-[#FDFBF7] text-[10px] tracking-[0.25em] uppercase border-b border-transparent hover:border-[#C9B896]/40 pb-0.5 transition"
                >
                  Edit details
                </button>
                <button
                  onClick={() => gatedGo('publish')}
                  data-testid="sticky-publish-btn"
                  className="bg-[#C9B896] hover:bg-[#FDFBF7] text-[#1F1A14] px-5 py-2 text-[11px] tracking-[0.22em] uppercase transition flex items-center gap-1.5 font-medium whitespace-nowrap"
                >
                  <Sparkles size={11} /> {buttonTotalLabel} <ChevronRight size={11} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================== TEMPLATE ============================== */}
      <div>
        <WeddingPageWrapper isDemo={true} theme={w.theme || null} showBackPill={false}>
          <Template wedding={{ ...w, rsvpClosed: false, rsvpSettings: { ...(w.rsvpSettings || {}), enabled: !!w.rsvpSettings?.enabled } }} />
          {/* Anchor used by the IntersectionObserver to trigger the gallery prompt */}
          <div ref={galleryAnchorRef} data-testid="preview-gallery-anchor" aria-hidden style={{ height: 40 }} />
          <LivePhotoWall
            slug={w.slug}
            title="Guest Photo Wall"
            coupleNames={`${w.brideName} & ${w.groomName}`}
            template={w.template}
            isDemo={true}
            previewMode={true}
          />
        </WeddingPageWrapper>
      </div>

      {/* ============================== PUBLISH CARD ============================== */}
      <section
        className="relative py-20 md:py-28 px-4 pb-32 md:pb-28"
        style={{ background: 'linear-gradient(180deg,#1F1A14 0%, #2A2018 60%, #1F1A14 100%)' }}
        data-testid="preview-publish-zone"
      >
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, #C9B896 1px, transparent 1px), radial-gradient(circle at 80% 70%, #C9B896 1px, transparent 1px)',
          backgroundSize: '40px 40px, 40px 40px',
        }} />

        <div className="relative container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="bg-[#FDFBF7] border-y-4 border-[#C9B896] px-6 sm:px-10 md:px-14 py-12 md:py-14 shadow-2xl relative"
            style={{ boxShadow: '0 30px 80px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,184,150,0.4)' }}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#C9B896] text-[#1F1A14] text-[9px] tracking-[0.4em] uppercase px-4 py-1.5 shadow-md">
              {paymentApproved ? '✦ Live & Loved ✦' : paymentSubmitted ? '✦ Awaiting Studio Approval ✦' : '✦ Almost there ✦'}
            </div>

            <div className="text-center">
              {/* WhatsApp link preview mock — shown only pre-payment so couples
                  see exactly what their guests will receive. */}
              {!isLocked && (
                <WhatsAppLinkPreview
                  brideName={w.brideName}
                  groomName={w.groomName}
                  weddingDate={w.weddingDate}
                  heroUrl={w.heroImage?.url}
                  slug={w.websiteSlug || w.slug}
                />
              )}

              {paymentApproved ? (
                <>
                  <h2 className="font-serif font-light text-3xl md:text-5xl text-[#1F1A14] leading-tight mb-3">
                    Your invite is <em className="italic text-emerald-700">live</em>.
                  </h2>
                  <p className="text-[#3A3226]/70 max-w-md mx-auto text-sm md:text-base mb-2">
                    Congratulations — the world can now visit your wedding website.
                  </p>
                </>
              ) : paymentSubmitted ? (
                <>
                  <h2 className="font-serif font-light text-3xl md:text-5xl text-[#1F1A14] leading-tight mb-3">
                    Your payment is <em className="italic text-amber-700">under review</em>.
                  </h2>
                  <p className="text-[#3A3226]/70 max-w-md mx-auto text-sm md:text-base mb-2">
                    Our studio is verifying your payment. You can keep browsing this preview &mdash; the moment we approve, the link goes live.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="font-serif font-light text-3xl md:text-5xl text-[#1F1A14] leading-tight" data-testid="publish-card-couple">
                    {w.brideName} <em className="italic text-[#8B7355]">&amp;</em> {w.groomName}
                  </h2>
                  <h3
                    className="font-serif italic text-xl md:text-3xl text-[#C9A96E] mt-1.5"
                    data-testid="publish-card-subhead"
                  >
                    your wedding website is ready.
                  </h3>
                  {/* Wedding countdown — replaces the old marketing line */}
                  {w.weddingDate && (() => {
                    const d = daysUntil(w.weddingDate)
                    if (d == null || d < 0) return null
                    return (
                      <div
                        className="font-serif italic text-[15px] md:text-base text-[#C9A96E] leading-relaxed mt-5 mb-8"
                        data-testid="publish-card-countdown"
                      >
                        <div>{formatLongDate(w.weddingDate)} is in {d} {d === 1 ? 'day' : 'days'}.</div>
                        <div>Your guests are waiting.</div>
                      </div>
                    )
                  })()}
                </>
              )}

              {/* CTA buttons */}
              <div className="flex flex-col items-center gap-3">
                {paymentApproved ? (
                  <button
                    onClick={() => gatedGo('hub')}
                    data-testid="preview-status-bottom"
                    className="group bg-emerald-700 hover:bg-emerald-800 text-white px-10 py-5 tracking-[0.25em] text-[11px] uppercase transition inline-flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Sparkles size={13} /> View live status &amp; PDF <ChevronRight size={13} className="group-hover:translate-x-1 transition" />
                  </button>
                ) : paymentSubmitted ? (
                  <button
                    onClick={() => gatedGo('hub')}
                    data-testid="preview-status-bottom"
                    className="group bg-amber-500 hover:bg-amber-400 text-[#1F1A14] px-10 py-5 tracking-[0.25em] text-[11px] uppercase transition inline-flex items-center justify-center gap-2 shadow-lg"
                  >
                    <ListChecks size={13} /> Open Wedding Hub <ChevronRight size={13} className="group-hover:translate-x-1 transition" />
                  </button>
                ) : (
                  <button
                    onClick={() => gatedGo('publish')}
                    data-testid="preview-publish-bottom"
                    className="group bg-[#1F1A14] hover:bg-[#3A3226] text-[#FDFBF7] px-10 py-5 tracking-[0.22em] text-[11px] uppercase transition inline-flex items-center justify-center gap-2 shadow-lg whitespace-nowrap font-medium"
                  >
                    <Sparkles size={13} /> {buttonTotalLabel} <ChevronRight size={13} className="group-hover:translate-x-1 transition" />
                  </button>
                )}
                {!isLocked && (
                  <button
                    onClick={goEdit}
                    data-testid="preview-tweak-btn"
                    className="text-[#8B7355] hover:text-[#1F1A14] text-[11px] tracking-[0.2em] uppercase underline underline-offset-4 decoration-[#C9B896]/60 hover:decoration-[#1F1A14] transition inline-flex items-center gap-1"
                  >
                    <ChevronLeft size={11} /> Edit
                  </button>
                )}
              </div>

              {/* Share with partner — WhatsApp-styled CTA button */}
              {!isLocked && (
                <div className="mt-7 flex justify-center">
                  <button
                    type="button"
                    onClick={shareWithPartner}
                    data-testid="share-with-partner"
                    className="group inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe57] text-white px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all text-[12px] md:text-[13px] font-medium tracking-wide"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span>Share this preview and surprise your partner</span>
                    <ChevronRight size={14} className="opacity-80 group-hover:translate-x-0.5 transition" />
                  </button>
                </div>
              )}

              {/* Trust badges */}
              <div className="mt-8 pt-6 border-t border-[#C9B896]/40 grid grid-cols-3 gap-4 text-[10px] tracking-[0.25em] uppercase text-[#8B7355]" data-testid="publish-card-trust-badges">
                <div className="flex flex-col items-center gap-1.5"><Lock size={13} className="text-[#3A3226]" /> Secure Payment</div>
                <div className="flex flex-col items-center gap-1.5"><Zap size={13} className="text-[#3A3226]" /> Live Instantly</div>
                <div className="flex flex-col items-center gap-1.5"><Edit3 size={13} className="text-[#3A3226]" /> Edit Anytime</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================== MOBILE STICKY BOTTOM CTA ============================== */}
      <AnimatePresence>
        {scrolledPastHero && !isLocked && (
          <motion.div
            initial={{ y: 70, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 70, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-[99] bg-[#1A1A1A] border-t border-[#C9B896]/15 px-4 pt-2 pb-3"
            data-testid="preview-mobile-bottom-cta"
          >
            <button
              onClick={() => gatedGo('publish')}
              data-testid="preview-mobile-publish-btn"
              className="w-full bg-[#C9B896] hover:bg-[#FDFBF7] text-[#1F1A14] tracking-[0.22em] text-[11px] uppercase transition flex items-center justify-center gap-2 font-medium"
              style={{ height: 56 }}
            >
              <Sparkles size={12} /> {buttonTotalLabel} <ChevronRight size={12} />
            </button>
            <div className="text-center text-[9px] tracking-[0.3em] uppercase text-[#FDFBF7]/55 mt-1.5">
              Secure payment · Live instantly
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================== GALLERY FLOATING PROMPT ============================== */}
      <AnimatePresence>
        {galleryPromptVisible && !isLocked && !galleryPromptDismissed && (
          <GalleryPrompt
            buttonLabel={buttonTotalLabel}
            onPublish={() => gatedGo('publish')}
            onDismiss={dismissGalleryPrompt}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

// =========================================================================
// WhatsApp link-preview mock — exactly what guests will see when the couple
// shares the wedding URL on WhatsApp. Lives inside the publish card.
// =========================================================================
function WhatsAppLinkPreview({ brideName, groomName, weddingDate, heroUrl, slug }) {
  const dateLabel = weddingDate
    ? new Date(weddingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const urlPath = slug ? `vivoha.in/${slug}` : 'vivoha.in/your-wedding'
  return (
    <div className="mb-7" data-testid="whatsapp-mock">
      <div className="text-[11px] italic text-[#3A3226]/55 mb-2.5">What your guests will see 👇</div>
      <div className="flex justify-center">
        <div
          className="rounded-[14px] px-2 pt-2 pb-1.5 shadow-sm"
          style={{ background: '#DCF8C6', maxWidth: 280, width: '100%' }}
        >
          <div className="bg-white rounded-[10px] overflow-hidden border border-black/5">
            <div
              className="w-full h-[110px] bg-[#F2EDE3] bg-center bg-cover"
              style={heroUrl ? { backgroundImage: `url(${heroUrl})` } : undefined}
              aria-label="Wedding preview thumbnail"
            />
            <div className="px-3 py-2 text-left">
              <div className="font-semibold text-[12px] text-[#111] leading-tight truncate" data-testid="wa-mock-title">
                {brideName || 'Bride'} weds {groomName || 'Groom'}
              </div>
              {dateLabel && (
                <div className="text-[11px] text-[#555] mt-0.5">{dateLabel}</div>
              )}
              <div className="text-[10px] text-[#1B7CD3] mt-1 truncate" data-testid="wa-mock-url">{urlPath}</div>
            </div>
          </div>
          <div className="text-right text-[9px] text-[#7d8d76] mt-1 pr-1">12:42 PM ✓✓</div>
        </div>
      </div>
    </div>
  )
}

// =========================================================================
// GalleryPrompt — desktop side-card / mobile bottom-sheet that slides in
// once the gallery section enters the viewport. Once dismissed it stays
// dismissed for the entire session (sessionStorage flag).
// =========================================================================
function GalleryPrompt({ buttonLabel, onPublish, onDismiss }) {
  const [touchStartY, setTouchStartY] = useState(null)
  function onTouchStart(e) { setTouchStartY(e.touches[0].clientY) }
  function onTouchMove(e) {
    if (touchStartY == null) return
    const dy = e.touches[0].clientY - touchStartY
    if (dy > 80) { onDismiss(); setTouchStartY(null) }
  }
  return (
    <>
      {/* Desktop — right side floating card */}
      <motion.div
        initial={{ x: 280, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 280, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        className="hidden md:block fixed right-6 top-1/2 -translate-y-1/2 z-[101]"
        style={{
          width: 220,
          background: 'rgba(20, 16, 12, 0.94)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid #C9A96E',
          borderRadius: 8,
          padding: 20,
        }}
        data-testid="gallery-prompt-desktop"
      >
        <button
          type="button"
          onClick={onDismiss}
          data-testid="gallery-prompt-dismiss"
          className="absolute top-2 right-2 text-[#FDFBF7]/60 hover:text-[#FDFBF7] p-1"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
        <div className="font-serif text-[#C9A96E] text-[12px] mb-2">✦ Love how this looks?</div>
        <div className="text-[#FDFBF7]/90 text-[13px] leading-snug font-serif italic mb-4">
          Publish &amp; surprise your guests today.
        </div>
        <button
          type="button"
          onClick={onPublish}
          data-testid="gallery-prompt-publish"
          className="w-full bg-[#C9B896] hover:bg-[#FDFBF7] text-[#1F1A14] py-2.5 text-[10px] tracking-[0.22em] uppercase transition flex items-center justify-center gap-1.5 font-medium"
        >
          <Sparkles size={10} /> {buttonLabel} <ChevronRight size={10} />
        </button>
      </motion.div>

      {/* Mobile — bottom sheet (swipe-down to dismiss) */}
      <motion.div
        initial={{ y: 240, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 240, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        className="md:hidden fixed left-3 right-3 z-[101]"
        style={{
          bottom: 84,
          background: 'rgba(20, 16, 12, 0.94)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid #C9A96E',
          borderRadius: 10,
          padding: 18,
        }}
        data-testid="gallery-prompt-mobile"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="mx-auto w-10 h-1 bg-[#C9A96E]/40 rounded-full mb-3 -mt-1" aria-hidden />
            <div className="font-serif text-[#C9A96E] text-[12px]">✦ Love how this looks?</div>
            <div className="text-[#FDFBF7]/90 text-[13px] leading-snug font-serif italic mt-1.5 mb-3">
              Publish &amp; surprise your guests today.
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            data-testid="gallery-prompt-dismiss-mobile"
            className="text-[#FDFBF7]/60 hover:text-[#FDFBF7] p-1 flex-shrink-0"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
        <button
          type="button"
          onClick={onPublish}
          data-testid="gallery-prompt-publish-mobile"
          className="w-full bg-[#C9B896] hover:bg-[#FDFBF7] text-[#1F1A14] py-3 text-[10px] tracking-[0.22em] uppercase transition flex items-center justify-center gap-1.5 font-medium"
        >
          <Sparkles size={10} /> {buttonLabel} <ChevronRight size={10} />
        </button>
      </motion.div>
    </>
  )
}

// =========================================================================
// PreviewLoader — replaces the boring spinner with a staged progress
// animation. Reads progressively (template → photos → composing), shows a
// glowing gold progress bar, and a rotating one-line message. Designed to
// feel like a moment of anticipation, not a wait.
// =========================================================================
function PreviewLoader({ slug }) {
  const stages = [
    { label: 'Setting your scene',     pct: 22 },
    { label: 'Composing your hero',    pct: 45 },
    { label: 'Lighting the candles',   pct: 68 },
    { label: 'Inviting your guests',   pct: 88 },
    { label: 'Almost ready',           pct: 97 },
  ]
  const [idx, setIdx] = useState(0)
  const [pct, setPct] = useState(8)
  useEffect(() => {
    const stageIv = setInterval(() => {
      setIdx((i) => (i + 1) % stages.length)
    }, 1100)
    let raf
    const tick = () => {
      setPct((p) => {
        // Approach the next stage's pct asymptotically
        const target = stages[idx]?.pct ?? 95
        const delta = (target - p) * 0.06
        return p + (delta > 0 ? Math.max(delta, 0.2) : 0)
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { clearInterval(stageIv); cancelAnimationFrame(raf) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])
  const shown = Math.min(97, Math.round(pct))
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'radial-gradient(ellipse at top, #1A1410 0%, #0a0a0a 70%)' }}
      data-testid="preview-loader"
    >
      <div className="w-full max-w-md text-center">
        {/* Brand monogram with breathing animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex items-center justify-center w-16 h-16 border border-[#C9A96E]/60 mx-auto"
          >
            <span className="font-serif italic text-[#C9A96E] text-2xl" style={{ textShadow: '0 0 18px rgba(201,169,110,0.5)' }}>V</span>
          </motion.div>
          <div className="mt-5 tracking-[0.42em] text-[10px] uppercase text-[#C9A96E]/85">
            Vivoha
          </div>
        </motion.div>

        {/* Rotating message */}
        <div className="h-7 relative overflow-hidden mb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="font-serif italic text-[#FDFBF7] text-base"
            >
              {stages[idx].label}<span className="text-[#C9A96E]">…</span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Gold progress bar */}
        <div className="relative h-[3px] bg-[#3A3226]/55 overflow-hidden">
          <motion.div
            animate={{ width: `${shown}%` }}
            transition={{ duration: 0.35, ease: 'linear' }}
            className="absolute inset-y-0 left-0"
            style={{
              background: 'linear-gradient(90deg, #C9A96E 0%, #FDFBF7 50%, #C9A96E 100%)',
              boxShadow: '0 0 14px rgba(201,169,110,0.55)',
            }}
            data-testid="preview-loader-bar"
          />
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)',
              backgroundSize: '220% 100%',
              animation: 'vivohaLoaderShimmer 1.4s linear infinite',
            }}
          />
        </div>

        <div className="mt-3 text-[10px] tracking-[0.32em] uppercase text-[#FDFBF7]/45 font-medium">
          {shown}%
        </div>

        <div className="mt-12 font-serif italic text-[#FDFBF7]/45 text-[12px]">
          Worth the wait — promise.
        </div>
      </div>
      <style>{`@keyframes vivohaLoaderShimmer { 0%{background-position:200% 0} 100%{background-position:-100% 0} }`}</style>
    </main>
  )
}

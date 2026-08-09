'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Plus, Trash2, Loader2, ChevronRight, ChevronLeft, X, Image as ImageIcon,
  Sparkles, MapPin, Users, BookOpen, Camera, CheckCircle2, Eye, Pencil,
  Wand2, Eraser, Crop,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

// Default crop state (no modal open)
const INITIAL_CROP_STATE = { open: false, target: null, galleryIdx: null, srcUri: '', aspect: 1, fileName: '', uploading: false }

// Four-step flow — no PIN, no "step X of Y" feel.
const STEPS = [
  { id: 'story',       label: 'Story',       icon: BookOpen, title: 'Your Story',
    subtitle: 'How did it begin? Your guests will love this part.' },
  { id: 'events',      label: 'Events',      icon: MapPin, title: 'Where the magic happens',
    subtitle: 'Add your ceremonies and celebrations.' },
  { id: 'photos',      label: 'Photos',      icon: Camera, title: 'Your Moments',
    subtitle: 'Upload your favourite photo — make this truly yours.' },
  { id: 'preferences', label: 'Preferences', icon: Users,  title: 'Your Preferences',
    subtitle: 'A few finishing touches before we craft your invite.' },
]

const STEP_TRANSITION_TOAST = {
  0: "Your story is saved. ✦ Now, where's the celebration?",
  1: "Events saved. ✦ Time to make it look like you.",
  2: "Looking beautiful. ✦ Just a few finishing touches.",
}

// ---- Story prompt chips ---------------------------------------------------
const STORY_PROMPTS = [
  { id: 'met',      label: 'How we met',              starter: 'We met at ' },
  { id: 'propose',  label: 'The proposal',            starter: 'He proposed when ' },
  { id: 'forever',  label: 'Why we chose each other', starter: 'We knew it was forever when ' },
]

// ---- Tradition mapping ----------------------------------------------------
// Maps template name -> tradition bucket. Used to filter the "Quick add" chips.
function detectTradition(templateName) {
  const n = (templateName || '').toLowerCase()
  if (n.includes('sanctum') || n.includes('albion')) return 'christian'
  if (n.includes('jannah') || n.includes('nikah')) return 'muslim'
  if (
    n.includes('royal') || n.includes('sapphire') || n.includes('crimson') ||
    n.includes('marigold') || n.includes('banyan') || n.includes('pichwai')
  ) return 'hindu'
  return 'modern'
}

const TRADITION_QUICK_ADDS = {
  hindu:     ['Mehendi', 'Haldi', 'Sangeet', 'Engagement', 'Reception'],
  christian: ['Church Ceremony', 'Reception', 'Engagement'],
  muslim:    ['Nikah', 'Walima', 'Engagement', 'Reception'],
  modern:    ['Mehendi', 'Haldi', 'Sangeet', 'Engagement', 'Reception', 'Church Ceremony', 'Nikah'],
}

const EVENT_EMOJI = {
  'Ceremony': '🪔', 'Reception': '🎊', 'Mehendi': '🌿', 'Haldi': '💛', 'Sangeet': '🎶',
  'Engagement': '💍', 'Church Ceremony': '⛪', 'Nikah': '☪️', 'Walima': '🌙',
}
function emojiForEvent(name = '') {
  const k = Object.keys(EVENT_EMOJI).find(x => x.toLowerCase() === String(name).toLowerCase())
  return k ? EVENT_EMOJI[k] : '✦'
}

// ---- Photo gallery slot labels -------------------------------------------
const GALLERY_SLOT_LABELS = [
  'A candid moment',
  'Together',
  'With family',
  'Your favourite',
]

function fileToDataUri(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

async function compressFile(file, { maxW = 1600, quality = 0.82 } = {}) {
  const uri = await fileToDataUri(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(1, maxW / img.width)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * ratio)
      c.height = Math.round(img.height * ratio)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      try { resolve(c.toDataURL('image/jpeg', quality)) } catch (e) { reject(e) }
    }
    img.onerror = reject
    img.src = uri
  })
}

// ---- Soft warm transition toast (top-center, 1.2s) ----
function transitionToast(message) {
  toast.custom(
    (t) => (
      <div
        data-testid="step-transition-toast"
        className="bg-[#FAF8F4] border border-[#C9A96E]/60 text-[#3A3226] font-serif text-[15px] tracking-wide px-5 py-3 shadow-[0_8px_28px_rgba(58,50,38,0.18)] flex items-center gap-2.5 rounded-sm"
        style={{ minWidth: 280 }}
      >
        <span className="text-[#C9A96E] text-lg leading-none">✦</span>
        <span className="italic">{message}</span>
      </div>
    ),
    { duration: 1200, position: 'top-center' },
  )
}

export default function OnboardPage() {
  const { token } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(0)
  const [pulseStep, setPulseStep] = useState(-1)
  const [submitting, setSubmitting] = useState(false)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const [editingDetails, setEditingDetails] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [storyEnhanced, setStoryEnhanced] = useState('')
  const [storyTab, setStoryTab] = useState('original')  // 'original' | 'enhanced'
  const [flashing, setFlashing] = useState(false)
  const [cropState, setCropState] = useState(INITIAL_CROP_STATE)
  const enhanceAbortRef = useRef(null)
  const storyRef = useRef(null)
  const [form, setForm] = useState({
    brideName: '', groomName: '', tagline: '',
    weddingDate: '', weddingTime: '00:00',
    story: '',
    template: 'Moonveil',
    heroImage: null, gallery: [], events: [],
    contactPhone: '', contactEmail: '',
    rsvpEnabled: true, mealOptions: 'Vegetarian, Non-Vegetarian',
    passwordProtect: false, invitePassword: '', invitePasswordPrompt: 'This invitation is private.',
    ownerWhatsapp: '',
    websiteSlug: '',
  })
  const [slug, setSlug] = useState('')
  const [crafting, setCrafting] = useState(false)

  // Detect tradition for chip filtering.
  const tradition = useMemo(() => detectTradition(form.template), [form.template])
  const quickAdds = TRADITION_QUICK_ADDS[tradition] || TRADITION_QUICK_ADDS.modern

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/onboard/wedding/${token}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Onboarding session not found'); setLoading(false); return }
        const w = data.wedding
        setSlug(w.slug)
        const isoDate = w.weddingDate || ''
        const datePart = isoDate.slice(0, 10)
        const timeMatch = isoDate.match(/T(\d{2}):(\d{2})/)
        let cachedWa = ''
        try {
          cachedWa = JSON.parse(window.localStorage.getItem('vivoha_demo_seed') || '{}').whatsapp || ''
        } catch {}
        // Strip an existing +91 prefix from the stored value — the visual
        // prefix is now part of the input chrome.
        let waDigits = (w.ownerWhatsapp || w.onboardPhone || cachedWa || '').replace(/^\+?91/, '').replace(/\D+/g, '')
        // Pre-populate two starter events on a fresh onboarding session.
        const incomingEvents = Array.isArray(w.events) ? w.events : []
        const events = incomingEvents.length > 0 ? incomingEvents : [
          newEvent({ name: 'Ceremony', emoji: '🪔' }),
          newEvent({ name: 'Reception', emoji: '🎊' }),
        ]
        setForm({
          brideName: w.brideName || '',
          groomName: w.groomName || '',
          tagline: w.tagline || '',
          weddingDate: datePart,
          weddingTime: timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '00:00',
          story: w.story || '',
          template: w.template || 'Moonveil',
          heroImage: w.heroImage || null,
          gallery: w.gallery || [],
          events,
          contactPhone: '',
          contactEmail: w.onboardEmail || '',
          rsvpEnabled: w.rsvpSettings?.enabled !== false,
          mealOptions: (w.rsvpSettings?.mealOptions || ['Vegetarian', 'Non-Vegetarian']).join(', '),
          passwordProtect: !!w.passwordProtected,
          invitePassword: '',
          invitePasswordPrompt: 'This invitation is private.',
          ownerWhatsapp: waDigits,
          websiteSlug: w.websiteSlug || '',
        })
        setLoading(false)
      } catch (e) {
        setError('Could not load onboarding')
        setLoading(false)
      }
    })()
  }, [token])

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function saveDraft(patch = {}) {
    // Normalise whatsapp back to E.164-ish before saving: prepend 91 if 10-digit.
    const waDigits = form.ownerWhatsapp.replace(/\D+/g, '')
    const waOut = waDigits ? (waDigits.length === 10 ? '91' + waDigits : waDigits) : ''
    const payload = {
      brideName: form.brideName, groomName: form.groomName, tagline: form.tagline,
      weddingDate: form.weddingDate ? `${form.weddingDate}T${form.weddingTime || '00:00'}:00+05:30` : '',
      story: storyTab === 'enhanced' && storyEnhanced.trim() ? storyEnhanced : form.story,
      template: form.template,
      heroImage: form.heroImage, gallery: form.gallery, events: form.events,
      rsvpSettings: {
        enabled: !!form.rsvpEnabled,
        mealOptions: form.mealOptions.split(',').map(s => s.trim()).filter(Boolean),
      },
      passwordProtect: !!form.passwordProtect,
      invitePassword: form.invitePassword,
      invitePasswordPrompt: form.invitePasswordPrompt,
      ownerWhatsapp: waOut,
      ...(form.websiteSlug ? { websiteSlug: form.websiteSlug } : {}),
      ...patch,
    }
    const res = await fetch(`/api/onboard/wedding/${token}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Something went wrong — let's fix it")
    return data.wedding
  }

  async function uploadFile(file) {
    if (file.size > 8 * 1024 * 1024) { toast.error('Your photo is a little too large — try one under 8MB'); return null }
    let dataUri
    try { dataUri = await compressFile(file) } catch { dataUri = await fileToDataUri(file) }
    const res = await fetch(`/api/onboard/upload/${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUri }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || "Upload didn't go through — try once more"); return null }
    return data
  }

  // Uploads a cropped data URI directly (skips compressFile — canvas output
  // is already a manageable JPEG).
  async function uploadDataUri(dataUri) {
    const res = await fetch(`/api/onboard/upload/${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataUri }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || "Upload didn't go through — try once more"); return null }
    return data
  }

  async function onHero(e) {
    const f = e.target.files?.[0]; if (e.target) e.target.value = ''
    if (!f) return
    if (f.size > 8 * 1024 * 1024) { toast.error('Your photo is a little too large — try one under 8MB'); return }
    toast.loading('Adding your cover moment…', { id: 'hu' })
    const u = await uploadFile(f); toast.dismiss('hu')
    if (u) { set('heroImage', u); toast.success('Perfect.') }
  }

  // Open the crop modal for the hero photo that's already been uploaded.
  // This is OPTIONAL — only triggered when the user clicks "Reposition".
  async function repositionHero() {
    if (!form.heroImage?.url) return
    setCropState({ open: true, target: 'hero', srcUri: form.heroImage.url, aspect: 16 / 9, fileName: 'hero.jpg' })
  }

  async function onGallerySingle(e, idx) {
    const f = e.target.files?.[0]; if (e.target) e.target.value = ''
    if (!f) return
    toast.loading('Adding your moment…', { id: 'gs' })
    const u = await uploadFile(f); toast.dismiss('gs')
    if (!u) return
    const next = [...form.gallery]
    next[idx] = u
    set('gallery', next)
    toast.success('Perfect.')
  }

  // Called by the crop modal once user confirms a hero crop — upload the
  // cropped data URI and apply it to heroImage, storing crop metadata too.
  async function applyCroppedPhoto({ croppedDataUri, crop }) {
    setCropState(c => ({ ...c, open: false, uploading: true }))
    toast.loading('Saving your moment…', { id: 'hu' })
    const uploaded = await uploadDataUri(croppedDataUri)
    toast.dismiss('hu')
    if (!uploaded) { setCropState(INITIAL_CROP_STATE); return }
    set('heroImage', { ...uploaded, crop })
    setCropState(INITIAL_CROP_STATE)
    toast.success('Perfect.')
  }

  function removeGalleryAt(idx) {
    const next = [...form.gallery]
    next.splice(idx, 1)
    set('gallery', next)
  }

  // ---- Events ---------------------------------------------------------
  function addEvent(presetName = '') {
    const ev = newEvent({ name: presetName || '', emoji: emojiForEvent(presetName) })
    set('events', [...form.events, ev])
  }
  function updEvent(i, k, v) { const next = [...form.events]; next[i] = { ...next[i], [k]: v }; set('events', next) }
  function rmEvent(i) {
    if (form.events.length <= 1) {
      toast('Keep at least one event so guests know where to come.', { duration: 2200 })
      return
    }
    set('events', form.events.filter((_, idx) => idx !== i))
  }
  function setEventField(i, k, v) { updEvent(i, k, v) }
  function toggleEventAddress(i) {
    updEvent(i, '_showAddress', !form.events[i]?._showAddress)
  }

  async function nextStep() {
    setSubmitting(true)
    try {
      await saveDraft()
      // Visual: pulse the dot for the step we just completed
      setPulseStep(step)
      setTimeout(() => setPulseStep(-1), 900)
      // Soft toast micro-moment
      const msg = STEP_TRANSITION_TOAST[step]
      if (msg) transitionToast(msg)
      // Reward flash — a tiny preview thumbnail + "Saved ✦" before navigating
      setFlashing(true)
      await new Promise(r => setTimeout(r, 500))
      setFlashing(false)
      setStep(s => Math.min(STEPS.length - 1, s + 1))
    } catch (e) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }
  function prevStep() { setStep(s => Math.max(0, s - 1)) }

  // ---- Story prompt chip insertion ------------------------------------
  function insertStoryStarter(starter) {
    const current = form.story || ''
    const needsSpace = current.length > 0 && !current.endsWith(' ') && !current.endsWith('\n')
    const next = current + (needsSpace ? '\n\n' : '') + starter
    set('story', next)
    // Drop cursor at the end after React commits the new value
    setTimeout(() => {
      const el = storyRef.current
      if (el) {
        el.focus()
        const len = el.value.length
        try { el.setSelectionRange(len, len) } catch (_) {}
        el.scrollTop = el.scrollHeight
      }
    }, 0)
  }

  // ---- AI enhance + clear ---------------------------------------------
  function clearStory() {
    if (enhancing) {
      try { enhanceAbortRef.current?.abort() } catch (_) {}
    }
    set('story', '')
    setStoryEnhanced('')
    setStoryTab('original')
    setTimeout(() => { storyRef.current?.focus() }, 0)
  }

  async function enhanceStory() {
    if (enhancing) return
    // The text we send for enhancement is always the user's "original" tab.
    const content = (form.story || '').trim()
    if (!content) return
    const wordCount = content.split(/\s+/).filter(Boolean).length
    if (wordCount < 4) {
      toast.error('Write at least 4 words before enhancing.')
      return
    }
    setEnhancing(true)
    const controller = new AbortController()
    enhanceAbortRef.current = controller
    let enhanced = ''
    let finished = false
    // Reset enhanced buffer + show tabs after first token arrives
    setStoryEnhanced('')
    try {
      const res = await fetch('/api/ai-enhance-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) throw new Error('Could not enhance right now.')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const json = line.slice(5).trim()
          if (!json) continue
          let evt
          try { evt = JSON.parse(json) } catch { continue }
          if (typeof evt.text === 'string') {
            enhanced += evt.text
            // Stream into the enhanced buffer (not form.story) so the Original
            // tab still holds the user's typed text untouched.
            setStoryEnhanced(enhanced)
            // Auto-switch to Enhanced tab once we have content
            setStoryTab('enhanced')
          }
          if (evt.finished) { finished = true; break }
        }
        if (finished) break
      }
      if (!enhanced.trim()) throw new Error('Enhancer returned nothing — try again.')
      toast.success('Story enhanced ✦')
    } catch (e) {
      if (e?.name === 'AbortError') {
        setStoryEnhanced('')
        setStoryTab('original')
      } else {
        toast.error(e?.message || 'Could not enhance right now.')
        setStoryEnhanced('')
      }
    } finally {
      setEnhancing(false)
      enhanceAbortRef.current = null
    }
  }

  // When Continue/Save runs, ensure form.story holds the currently-active tab.
  // The "Enhanced" tab value lives in storyEnhanced and is mirrored here.
  function storyDisplayValue() {
    return storyTab === 'enhanced' ? storyEnhanced : (form.story || '')
  }
  function setStoryDisplayValue(v) {
    if (storyTab === 'enhanced') setStoryEnhanced(v)
    else set('story', v)
  }
  // Final step → save WhatsApp, register owner (no PIN), then route to preview.
  async function finishToPreview() {
    const wa = form.ownerWhatsapp.replace(/\D+/g, '')
    if (!wa || wa.length < 10) { toast.error('We need your WhatsApp number to send you the private link.'); return }
    const waE164 = wa.length === 10 ? '91' + wa : wa
    setSubmitting(true)
    setCrafting(true)
    try {
      await saveDraft()
      const res = await fetch('/api/owner/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardToken: token, whatsapp: waE164 }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCrafting(false)
        throw new Error(data.error || "Something went wrong — let's fix it")
      }
      // Use the customer's chosen wedding URL if they picked one — that way
      // the address bar (and any link they share) carries their own URL.
      const finalSlug = (form.websiteSlug || slug || '').trim()
      try {
        if (data.ownerToken && typeof window !== 'undefined') {
          window.localStorage.setItem(`vivoha_owner_${finalSlug}`, data.ownerToken)
        }
        // Stash the onboardToken so the preview page (clean URL) and the
        // "Edit Details" link can still reach the draft after redirect.
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`vivoha_onboard_${finalSlug}`, token)
        }
      } catch (_e) {}
      setTimeout(() => router.push(`/preview/${finalSlug}`), 3600)
    } catch (e) { toast.error(e.message); setSubmitting(false); setCrafting(false) }
  }

  if (loading) return <Wrapper><div className="text-center py-32 text-[#8B7355]"><Loader2 className="animate-spin mx-auto" /></div></Wrapper>
  if (error) return <Wrapper><div className="text-center py-32" data-testid="onboard-error">
    <h1 className="font-serif text-3xl text-[#3A3226]">Session unavailable</h1>
    <p className="mt-3 text-[#3A3226]/70">{error}</p>
    <a href="/" className="inline-block mt-6 underline text-[#8B7355]">Back to Vivoha</a>
  </div></Wrapper>

  const Icon = STEPS[step].icon

  return (
    <Wrapper>
      <div className="max-w-3xl mx-auto py-12 px-4 pb-28 md:pb-12" data-testid="onboard-page">
        {/* Header */}
        <div className="text-[#8B7355] tracking-[0.3em] text-[10px] uppercase mb-2 flex items-center gap-2">
          <Sparkles size={12} /> Vivoha · Crafting your invite
        </div>
        <h1 className="font-serif font-light text-4xl md:text-5xl text-[#3A3226]" data-testid="onboard-couple-heading">
          {form.brideName && form.groomName ? <>{form.brideName} <em className="italic text-[#8B7355]">&amp;</em> {form.groomName}</> : 'Your wedding details'}
        </h1>

        {/* Confirmation banner */}
        {form.brideName && form.groomName && (
          <div className="mt-5" data-testid="onboard-prefilled-banner">
            <div className="inline-flex items-start gap-3 bg-white/50 border border-[#C9B896] px-4 py-3">
              <CheckCircle2 size={16} className="text-[#3A3226] mt-0.5 flex-shrink-0" />
              <div className="text-sm text-[#3A3226]">
                <span className="font-serif">We&apos;ve saved your names and your wedding date</span>
                <span className="text-[#3A3226]/70"> — let&apos;s build your website.</span>
                <button
                  type="button"
                  onClick={() => setEditingDetails(v => !v)}
                  data-testid="onboard-edit-details-btn"
                  className="ml-3 inline-flex items-center gap-1 text-[11px] tracking-[0.18em] uppercase text-[#8B7355] hover:text-[#1F1A14] border border-[#C9B896] hover:border-[#1F1A14] px-2.5 py-1 transition align-middle"
                >
                  <Pencil size={11} /> {editingDetails ? 'Close' : 'Edit Details'}
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {editingDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                  data-testid="onboard-edit-details-panel"
                >
                  <div className="mt-3 bg-white/60 border border-[#C9B896] p-4 grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] tracking-[0.25em] uppercase text-[#8B7355]">Bride name</Label>
                      <Input
                        value={form.brideName}
                        onChange={(e) => set('brideName', e.target.value)}
                        data-testid="onb-edit-bride"
                        className="rounded-none border-[#C9B896] focus-visible:ring-0 focus-visible:border-[#C9A96E] mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] tracking-[0.25em] uppercase text-[#8B7355]">Groom name</Label>
                      <Input
                        value={form.groomName}
                        onChange={(e) => set('groomName', e.target.value)}
                        data-testid="onb-edit-groom"
                        className="rounded-none border-[#C9B896] focus-visible:ring-0 focus-visible:border-[#C9A96E] mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] tracking-[0.25em] uppercase text-[#8B7355]">Wedding date</Label>
                      <Input
                        type="date"
                        value={form.weddingDate}
                        onChange={(e) => set('weddingDate', e.target.value)}
                        data-testid="onb-edit-date"
                        className="rounded-none border-[#C9B896] focus-visible:ring-0 focus-visible:border-[#C9A96E] mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] tracking-[0.25em] uppercase text-[#8B7355]">
                        Wedding time <span className="lowercase italic text-[#8B7355]/70 tracking-normal">(optional · defaults to 12 midnight)</span>
                      </Label>
                      <Input
                        type="time"
                        value={form.weddingTime}
                        onChange={(e) => set('weddingTime', e.target.value)}
                        data-testid="onb-edit-time"
                        className="rounded-none border-[#C9B896] focus-visible:ring-0 focus-visible:border-[#C9A96E] mt-1"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Progress dots */}
        <div className="mt-9 flex items-center gap-3" data-testid="onboard-progress">
          {STEPS.map((s, i) => {
            const done = i < step, active = i === step, pulse = pulseStep === i
            return (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  data-testid={`step-${s.id}`}
                  className="group inline-flex items-center gap-2 focus:outline-none"
                >
                  <span className="relative inline-flex">
                    {pulse && (
                      <motion.span
                        initial={{ scale: 1, opacity: 0.85 }}
                        animate={{ scale: 2.6, opacity: 0 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="absolute inset-0 -m-1 rounded-full bg-[#C9A96E]"
                        aria-hidden
                      />
                    )}
                    <span
                      className={`relative w-2 h-2 rounded-full transition ${
                        active ? 'bg-[#3A3226] scale-150' :
                        done   ? 'bg-[#C9A96E]' :
                                 'bg-[#3A3226]/20'
                      } ${pulse ? 'shadow-[0_0_12px_#C9A96E]' : ''}`}
                    />
                  </span>
                  <span className={`text-[10px] tracking-[0.25em] uppercase transition ${active ? 'text-[#3A3226]' : done ? 'text-[#8B7355]' : 'text-[#3A3226]/35'}`}>{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className={`w-5 h-px ${done ? 'bg-[#C9A96E]' : 'bg-[#C9B896]/50'}`} />}
              </div>
            )
          })}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.3 }}
            className="mt-10 space-y-6"
          >
            <div className="flex items-center gap-3 mb-1 text-[#8B7355]">
              <Icon size={16} />
              <div className="text-[10px] tracking-[0.3em] uppercase">{STEPS[step].label}</div>
            </div>
            <h2 className="font-serif font-light text-3xl md:text-4xl text-[#3A3226] leading-tight">{STEPS[step].title}</h2>
            <p className="text-[15px] md:text-base text-[#3A3226]/70 italic font-serif leading-relaxed mb-2" data-testid={`onb-subtitle-${STEPS[step].id}`}>
              {STEPS[step].subtitle}
            </p>

            {/* ============================== STORY ============================== */}
            {step === 0 && (
              <div className="space-y-3">
                {/* Tappable prompt chips */}
                <div className="flex flex-wrap gap-2" data-testid="story-prompts">
                  {STORY_PROMPTS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => insertStoryStarter(p.starter)}
                      data-testid={`story-chip-${p.id}`}
                      className="font-serif text-[13px] text-[#3A3226] border border-[#C9A96E]/70 hover:border-[#C9A96E] hover:bg-[#C9A96E]/10 px-3.5 py-1.5 rounded-full transition inline-flex items-center gap-1.5 bg-transparent"
                    >
                      <span className="text-[#C9A96E] leading-none">✦</span> {p.label}
                    </button>
                  ))}
                </div>

                {/* Original / Enhanced tabs — appear once we have an enhanced version */}
                {storyEnhanced && (
                  <div className="flex items-center gap-2" data-testid="story-tabs">
                    <button
                      type="button"
                      onClick={() => setStoryTab('original')}
                      data-testid="story-tab-original"
                      className={`text-[11px] tracking-[0.22em] uppercase px-3.5 py-1.5 border transition ${
                        storyTab === 'original'
                          ? 'bg-[#3A3226] border-[#3A3226] text-[#FDFBF7]'
                          : 'bg-transparent border-[#C9B896] text-[#3A3226] hover:border-[#3A3226]'
                      }`}
                    >Original</button>
                    <button
                      type="button"
                      onClick={() => setStoryTab('enhanced')}
                      data-testid="story-tab-enhanced"
                      className={`text-[11px] tracking-[0.22em] uppercase px-3.5 py-1.5 border transition inline-flex items-center gap-1.5 ${
                        storyTab === 'enhanced'
                          ? 'bg-[#3A3226] border-[#3A3226] text-[#FDFBF7]'
                          : 'bg-transparent border-[#C9B896] text-[#3A3226] hover:border-[#3A3226]'
                      }`}
                    ><Wand2 size={11} /> Enhanced</button>
                  </div>
                )}

                {/* Gold-bordered textarea */}
                <div className="relative">
                  <Textarea
                    ref={storyRef}
                    value={storyTab === 'enhanced' ? storyEnhanced : (form.story || '')}
                    onChange={(e) => {
                      if (storyTab === 'enhanced') setStoryEnhanced(e.target.value)
                      else set('story', e.target.value)
                    }}
                    rows={7}
                    maxLength={2000}
                    placeholder="We met at... and everything changed."
                    data-testid="onb-story"
                    className="rounded-none border-[#C9B896] bg-[#FAF8F4] text-[15px] leading-relaxed font-serif text-[#3A3226] placeholder:text-[#8B7355]/50 placeholder:italic focus-visible:ring-0 focus-visible:border-[#C9A96E] pr-3 pb-12"
                    style={{ borderLeft: '2px solid #C9A96E' }}
                  />
                  <StoryEnhanceControls
                    value={storyTab === 'enhanced' ? storyEnhanced : (form.story || '')}
                    enhancing={enhancing}
                    onEnhance={enhanceStory}
                    onClear={clearStory}
                  />
                </div>

                {/* Helper */}
                <div className="text-[12px] italic text-[#8B7355] leading-relaxed" data-testid="story-helper">
                  {storyEnhanced
                    ? 'You can edit the enhanced version freely.'
                    : 'Most couples write 2–3 sentences. Yours can be as long as your story.'}
                </div>
              </div>
            )}

            {/* ============================== EVENTS ============================== */}
            {step === 1 && (
              <div className="space-y-4" data-testid="events-section">
                {form.events.map((ev, i) => (
                  <EventCard
                    key={i}
                    index={i}
                    event={ev}
                    canDelete={form.events.length > 1}
                    onChange={(k, v) => setEventField(i, k, v)}
                    onRemove={() => rmEvent(i)}
                    onToggleAddress={() => toggleEventAddress(i)}
                  />
                ))}

                {/* Quick add chips */}
                <div className="pt-2" data-testid="quick-add-section">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355] mb-2.5">Quick add a celebration:</div>
                  <div className="flex flex-wrap gap-2">
                    {quickAdds.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => addEvent(name)}
                        data-testid={`quick-add-${name.toLowerCase().replace(/\s+/g, '-')}`}
                        className="font-serif text-[13px] text-[#3A3226] border border-[#C9A96E]/60 hover:border-[#C9A96E] hover:bg-[#C9A96E]/10 px-3.5 py-1.5 rounded-full transition inline-flex items-center gap-1.5 bg-transparent"
                      >
                        <span className="leading-none">{emojiForEvent(name)}</span> {name}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addEvent('')}
                  data-testid="onb-add-event"
                  className="rounded-none border-[#3A3226] text-[#3A3226] hover:bg-[#3A3226] hover:text-[#FDFBF7] bg-transparent"
                >
                  <Plus size={14} className="mr-1.5" /> Add a custom event
                </Button>
              </div>
            )}

            {/* ============================== PHOTOS ============================== */}
            {step === 2 && (
              <div className="grid lg:grid-cols-2 lg:gap-8" data-testid="photos-section">
                <div className="space-y-6">
                {/* Hero drop zone */}
                <Field label="Your cover moment">
                  {form.heroImage?.url ? (
                    <div className="relative">
                      <img src={form.heroImage.url} alt="" className="w-full h-72 object-cover" />
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={repositionHero}
                          data-testid="hero-reposition"
                          className="bg-[#1F1A14]/85 hover:bg-[#1F1A14] text-[#FDFBF7] px-3 py-1.5 text-[10px] tracking-widest uppercase inline-flex items-center gap-1.5 transition"
                        >
                          <Crop size={11} /> Reposition
                        </button>
                        <label
                          className="bg-[#FDFBF7]/90 hover:bg-[#FDFBF7] text-[#3A3226] px-3 py-1.5 text-[10px] tracking-widest uppercase cursor-pointer transition"
                          data-testid="hero-replace-label"
                        >
                          Replace
                          <input type="file" accept="image/*" className="hidden" onChange={onHero} data-testid="onb-hero-input" />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label
                      className="group relative block border-2 border-dashed border-[#C9B896] hover:border-[#C9A96E] transition cursor-pointer aspect-[16/8] flex flex-col items-center justify-center bg-[#FAF8F4]"
                      data-testid="onb-hero-label"
                    >
                      <div className="w-12 h-12 bg-[#3A3226] text-[#C9A96E] flex items-center justify-center mb-4 group-hover:scale-110 transition">
                        <Camera size={18} />
                      </div>
                      <div className="font-serif text-2xl text-[#3A3226]" data-testid="hero-primary">Drop your favourite photo together</div>
                      <div className="font-serif text-[#8B7355] italic text-[13px] mt-1.5 flex items-center gap-1.5" data-testid="hero-secondary">
                        This is the first thing your guests will see <span className="text-[#C9A96E]">✦</span>
                      </div>
                      <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355]/70 mt-3" data-testid="hero-tertiary">or click to choose</div>
                      <input type="file" accept="image/*" className="hidden" onChange={onHero} data-testid="onb-hero-input" />
                    </label>
                  )}
                </Field>

                {/* 4 labelled gallery slots */}
                <div>
                  <Label className="text-[10px] tracking-widest uppercase text-[#8B7355]">4 photos your guests will love</Label>
                  <div className="grid grid-cols-2 gap-3 mt-3" data-testid="gallery-slots">
                    {[0, 1, 2, 3].map((i) => {
                      const photo = form.gallery[i]
                      const slotLabel = GALLERY_SLOT_LABELS[i]
                      return (
                        <div key={i} className="flex flex-col gap-2" data-testid={`gallery-slot-${i}`}>
                          {photo?.url ? (
                            <div className="relative aspect-square group bg-[#FAF8F4]">
                              <img src={photo.url} alt={slotLabel} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeGalleryAt(i)}
                                className="absolute top-1.5 right-1.5 bg-[#3A3226]/80 text-white p-1 opacity-0 group-hover:opacity-100 transition"
                              ><X size={12} /></button>
                            </div>
                          ) : (
                            <label className="group relative aspect-square border-2 border-dashed border-[#C9B896] hover:border-[#C9A96E] bg-[#FAF8F4] flex flex-col items-center justify-center cursor-pointer transition">
                              <Camera size={22} className="text-[#8B7355] group-hover:text-[#C9A96E] group-hover:scale-110 transition" />
                              <span className="text-[10px] tracking-[0.25em] uppercase text-[#8B7355]/80 mt-2.5">Add a photo</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => onGallerySingle(e, i)}
                                data-testid={`gallery-input-${i}`}
                              />
                            </label>
                          )}
                          <div className="font-serif italic text-[12px] text-[#8B7355] text-center" data-testid={`gallery-label-${i}`}>
                            {slotLabel}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Reassurance */}
                <div className="text-[12px] italic text-[#8B7355] text-center pt-2" data-testid="photos-reassurance">
                  Only you choose who sees these.
                </div>
                </div>
                {/* Sticky live preview — desktop only */}
                <SplitPreviewPanel form={form} />
              </div>
            )}

            {/* ============================== PREFERENCES ============================== */}
            {step === 3 && (
              <div className="space-y-5" data-testid="prefs-section">
                <ToggleCard
                  testId="onb-rsvp-toggle"
                  checked={form.rsvpEnabled}
                  onChange={(v) => set('rsvpEnabled', v)}
                  title="Let guests confirm their attendance"
                  desc="A simple RSVP form on your invite — names, count, meal choice, a short note."
                />

                {form.rsvpEnabled && (
                  <div className="space-y-2" data-testid="meals-block">
                    <Label className="text-[14px] font-serif text-[#3A3226] not-italic block">
                      What meal options will you offer guests?
                    </Label>
                    <Input
                      value={form.mealOptions}
                      onChange={(e) => set('mealOptions', e.target.value)}
                      placeholder="e.g. Veg, Non-Veg, Jain"
                      data-testid="onb-meals"
                      className="rounded-none border-[#C9B896] bg-[#FAF8F4] py-5 font-serif text-[15px] focus-visible:border-[#C9A96E] focus-visible:ring-0"
                      style={{ borderLeft: '2px solid #C9A96E' }}
                    />
                    <div className="text-[12px] italic text-[#8B7355]" data-testid="meals-helper">
                      Your guests will choose when they RSVP.
                    </div>
                  </div>
                )}

                <ToggleCard
                  testId="onb-password-toggle"
                  checked={!!form.passwordProtect}
                  onChange={(v) => set('passwordProtect', v)}
                  title="Make this invite private — only for your guest list"
                  desc="Guests will need a soft password to open your invite. You share it with them privately."
                >
                  {form.passwordProtect && (
                    <div className="space-y-3 mt-3">
                      <Input
                        type="text"
                        value={form.invitePassword}
                        onChange={(e) => set('invitePassword', e.target.value)}
                        placeholder="A soft password for your guests"
                        maxLength={80}
                        data-testid="onb-password-input"
                        className="rounded-none border-[#C9B896] bg-white py-5"
                      />
                      <Input
                        value={form.invitePasswordPrompt}
                        onChange={(e) => set('invitePasswordPrompt', e.target.value)}
                        placeholder="Hint shown to guests (optional)"
                        maxLength={200}
                        data-testid="onb-password-prompt"
                        className="rounded-none border-[#C9B896] bg-white py-5"
                      />
                    </div>
                  )}
                </ToggleCard>

                {/* WhatsApp with +91 IN prefix */}
                <div className="space-y-2" data-testid="whatsapp-block">
                  <Label className="text-[14px] font-serif text-[#3A3226] not-italic block">
                    Your WhatsApp number
                  </Label>
                  <div
                    className="flex items-stretch border border-[#C9B896] bg-[#FAF8F4]"
                    style={{ borderLeft: '2px solid #C9A96E' }}
                  >
                    <span
                      className="flex items-center gap-1.5 px-3.5 border-r border-[#C9B896] text-[#3A3226] font-serif text-[15px] select-none"
                      data-testid="whatsapp-prefix"
                    >
                      <span className="text-base leading-none">🇮🇳</span>
                      <span>+91</span>
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={form.ownerWhatsapp}
                      onChange={(e) => set('ownerWhatsapp', e.target.value.replace(/\D+/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      maxLength={10}
                      data-testid="onb-owner-whatsapp"
                      className="flex-1 bg-transparent px-3.5 py-3 outline-none font-serif text-[15px] text-[#3A3226] placeholder:text-[#8B7355]/50"
                    />
                  </div>
                  <div className="text-[12px] italic text-[#8B7355] leading-relaxed" data-testid="whatsapp-helper">
                    We&apos;ll send your live website link here — the moment it&apos;s ready. 🎊
                  </div>
                </div>

                {/* WEDDING URL */}
                <WeddingUrlField
                  token={token}
                  value={form.websiteSlug}
                  onChange={(v) => set('websiteSlug', v)}
                  brideName={form.brideName}
                  groomName={form.groomName}
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-6">
              <Button onClick={prevStep} disabled={step === 0 || submitting} variant="outline" className="rounded-none border-[#C9B896] text-[#3A3226] disabled:opacity-30 bg-transparent hover:bg-[#3A3226]/5">
                <ChevronLeft size={14} className="mr-1.5" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={nextStep} disabled={submitting} data-testid="onb-next" className="bg-[#3A3226] hover:bg-[#1F1A14] text-[#FDFBF7] rounded-none py-6 px-8 tracking-widest text-xs uppercase">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <>Continue <ChevronRight size={14} className="ml-1.5" /></>}
                </Button>
              ) : (
                <Button onClick={finishToPreview} disabled={submitting} data-testid="onb-finish" className="bg-[#3A3226] hover:bg-[#1F1A14] text-[#FDFBF7] rounded-none py-6 px-8 tracking-widest text-xs uppercase">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <>Craft my wedding website <Sparkles size={13} className="ml-2" /></>}
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating preview button — all viewports */}
      <button
        type="button"
        onClick={() => setShowMobilePreview(true)}
        data-testid="floating-preview-btn"
        className="fixed bottom-6 right-6 z-[80] bg-[#1a1a1a] text-[#FDFBF7] border border-[#C9A96E] shadow-[0_10px_30px_rgba(0,0,0,0.35)] rounded-full pl-4 pr-5 py-3 flex items-center gap-2 active:scale-95 hover:bg-[#0F0C08] transition"
      >
        <Eye size={16} className="text-[#C9A96E]" />
        <span className="font-serif text-[13px] tracking-wide">Preview your website</span>
      </button>

      {/* Full-screen live preview overlay */}
      <AnimatePresence>
        {showMobilePreview && (
          <LivePreviewOverlay
            slug={slug}
            token={token}
            form={form}
            onClose={() => setShowMobilePreview(false)}
            onBeforeOpen={() => saveDraft().catch(() => {})}
          />
        )}
      </AnimatePresence>

      {/* Image crop modal — opens when user picks any hero/gallery photo */}
      <AnimatePresence>
        {cropState.open && (
          <ImageCropModal
            srcUri={cropState.srcUri}
            aspect={cropState.aspect}
            target={cropState.target}
            onCancel={() => setCropState(INITIAL_CROP_STATE)}
            onTryAnother={() => {
              const inputId = cropState.target === 'hero'
                ? 'onb-hero-input'
                : `gallery-input-${cropState.galleryIdx}`
              setCropState(INITIAL_CROP_STATE)
              setTimeout(() => {
                const el = document.querySelector(`[data-testid="${inputId}"]`)
                el?.click?.()
              }, 60)
            }}
            onConfirm={applyCroppedPhoto}
          />
        )}
      </AnimatePresence>

      {/* Step transition preview flash — fades in over current page on Continue */}
      <AnimatePresence>
        {flashing && <StepTransitionFlash heroUrl={form.heroImage?.url} />}
      </AnimatePresence>

      <CraftingOverlay open={crafting} couple={form.brideName && form.groomName ? `${form.brideName} & ${form.groomName}` : null} />
    </Wrapper>
  )
}

// ---- Event card subcomponent ---------------------------------------------
function EventCard({ index, event, canDelete, onChange, onRemove, onToggleAddress }) {
  const showAddress = !!event._showAddress || !!event.address || !!event.mapsLink
  return (
    <div className="border border-[#C9B896] bg-white/50 p-4" data-testid={`event-card-${index}`}>
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl leading-none mt-1" aria-hidden>{event.emoji || emojiForEvent(event.name) || '✦'}</span>
        <div className="flex-1 min-w-0">
          <Input
            value={event.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Event name"
            data-testid={`event-name-${index}`}
            className="rounded-none border-0 border-b border-transparent hover:border-[#C9B896] focus-visible:border-[#C9A96E] focus-visible:ring-0 bg-transparent px-0 py-1 font-serif text-xl text-[#3A3226]"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canDelete}
          data-testid={`event-delete-${index}`}
          className={`p-1.5 transition ${canDelete ? 'text-[#3A3226]/60 hover:text-red-700' : 'text-[#3A3226]/20 cursor-not-allowed'}`}
          title={canDelete ? 'Remove this event' : 'At least one event is required'}
        ><X size={16} /></button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-[10px] tracking-widest uppercase text-[#8B7355]">Date</Label>
          <Input
            type="date"
            value={event.date || ''}
            onChange={(e) => onChange('date', e.target.value)}
            data-testid={`event-date-${index}`}
            className="rounded-none border-[#C9B896] bg-[#FAF8F4] mt-1"
          />
        </div>
        <div>
          <Label className="text-[10px] tracking-widest uppercase text-[#8B7355]">Time</Label>
          <Input
            type="time"
            value={(event.startTime || '').match(/^\d{2}:\d{2}$/) ? event.startTime : ''}
            onChange={(e) => onChange('startTime', e.target.value)}
            placeholder="6:00 PM"
            data-testid={`event-time-${index}`}
            className="rounded-none border-[#C9B896] bg-[#FAF8F4] mt-1"
          />
        </div>
      </div>

      <div className="mt-3">
        <Label className="text-[10px] tracking-widest uppercase text-[#8B7355]">Venue</Label>
        <Input
          value={event.venue || ''}
          onChange={(e) => onChange('venue', e.target.value)}
          placeholder="ITC Grand Chola"
          data-testid={`event-venue-${index}`}
          className="rounded-none border-[#C9B896] bg-[#FAF8F4] mt-1"
        />
      </div>

      {/* Collapsible venue details */}
      {!showAddress ? (
        <button
          type="button"
          onClick={onToggleAddress}
          data-testid={`event-add-venue-details-${index}`}
          className="mt-3 text-[11px] tracking-[0.25em] uppercase text-[#8B7355] hover:text-[#C9A96E] transition inline-flex items-center gap-1.5"
        >
          <Plus size={12} /> Add venue details
        </button>
      ) : (
        <div className="mt-3 space-y-3 border-t border-[#C9B896]/50 pt-3" data-testid={`event-venue-details-${index}`}>
          <div>
            <Label className="text-[10px] tracking-widest uppercase text-[#8B7355]">Address</Label>
            <Input
              value={event.address || ''}
              onChange={(e) => onChange('address', e.target.value)}
              placeholder="63 Mount Road, Guindy, Chennai"
              data-testid={`event-address-${index}`}
              className="rounded-none border-[#C9B896] bg-[#FAF8F4] mt-1"
            />
          </div>
          <div>
            <Label className="text-[10px] tracking-widest uppercase text-[#8B7355]">Google Maps link (optional)</Label>
            <Input
              value={event.mapsLink || ''}
              onChange={(e) => onChange('mapsLink', e.target.value)}
              placeholder="https://maps.app.goo.gl/…"
              data-testid={`event-maps-${index}`}
              className="rounded-none border-[#C9B896] bg-[#FAF8F4] mt-1"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ---- LivePreviewOverlay — full-screen slide-up preview, all viewports ---
// Iframe loads the customer's draft. Real-time updates: whenever `form`
// changes, we debounce a saveDraft + bump an iframe key (800ms).
function LivePreviewOverlay({ slug, token, form, onClose, onBeforeOpen }) {
  const [src, setSrc] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const firstRunRef = useRef(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try { await onBeforeOpen?.() } catch (_) {}
      if (cancelled) return
      setSrc(`/preview/${slug}?onboardToken=${token}`)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, token])

  // Real-time refresh: debounce 800ms after any meaningful change
  useEffect(() => {
    if (firstRunRef.current) { firstRunRef.current = false; return }
    const t = setTimeout(async () => {
      try { await onBeforeOpen?.() } catch (_) {}
      setRefreshKey(k => k + 1)
    }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.story, form.brideName, form.groomName, form.weddingDate, form.weddingTime,
    form.heroImage?.url,
    form.gallery?.length,
    JSON.stringify(form.events || []),
    JSON.stringify(form.heroImage?.crop || null),
  ])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[110] bg-black/55"
      onClick={onClose}
      data-testid="live-preview-overlay"
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
        className="absolute inset-0 bg-[#0a0a0a] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#C9A96E]/25 bg-[#0a0a0a]">
          <div className="text-[10px] tracking-[0.32em] uppercase text-[#C9A96E] flex items-center gap-2 font-medium">
            <Eye size={13} /> Live Preview
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="live-preview-close"
            className="text-[#FDFBF7]/85 hover:text-[#FDFBF7] inline-flex items-center gap-1.5 text-[11px] tracking-[0.25em] uppercase border border-[#C9A96E]/40 hover:border-[#C9A96E] px-3 py-1.5 transition"
            aria-label="Close preview"
          >
            <X size={13} /> Close
          </button>
        </div>
        <div className="flex-1 bg-[#0a0a0a] overflow-hidden">
          {src ? (
            <iframe
              key={refreshKey}
              src={src}
              title="Wedding website preview"
              className="w-full h-full border-0 bg-[#FDFBF7]"
              data-testid="live-preview-iframe"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-[#C9A96E]">
              <Loader2 className="animate-spin" />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ---- StepTransitionFlash — micro reward (~500ms) after Continue ---------
function StepTransitionFlash({ heroUrl }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[115] bg-[#FDFBF7]/80 backdrop-blur-[2px] flex items-center justify-center pointer-events-none"
      data-testid="step-transition-flash"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative bg-white border border-[#C9A96E] shadow-2xl px-6 py-5 flex flex-col items-center overflow-hidden"
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(110deg, transparent 30%, rgba(201,169,110,0.35) 50%, transparent 70%)',
            backgroundSize: '220% 100%',
            animation: 'vivohaShimmer 0.9s ease-out',
          }}
        />
        <div className="relative w-20 h-20 overflow-hidden border border-[#C9B896] mb-3 bg-[#FAF8F4]">
          {heroUrl ? (
            <img src={heroUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#C9A96E]">
              <Sparkles size={22} />
            </div>
          )}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.2 }}
          className="relative text-[11px] tracking-[0.32em] uppercase text-[#8B7355] font-medium flex items-center gap-1.5"
        >
          Saved <span className="text-[#C9A96E]">✦</span>
        </motion.div>
      </motion.div>
      <style>{`@keyframes vivohaShimmer { 0%{background-position:200% 0} 100%{background-position:-100% 0} }`}</style>
    </motion.div>
  )
}

// ---- Mobile bottom sheet preview (legacy — kept for backward compat) ----
function MobilePreviewSheet({ slug, token, onClose, onBeforeOpen }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try { await onBeforeOpen?.() } catch (_) {}
      if (cancelled) return
      setSrc(`/preview/${slug}?onboardToken=${token}`)
    })()
    return () => { cancelled = true }
  }, [slug, token])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="md:hidden fixed inset-0 z-[110] bg-black/45 flex items-end"
      onClick={onClose}
      data-testid="mobile-preview-sheet"
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="w-full bg-[#FDFBF7] rounded-t-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ height: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#C9B896]/40">
          <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355] flex items-center gap-1.5">
            <Eye size={12} /> Live preview
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="mobile-preview-close"
            className="text-[#3A3226] hover:text-[#1F1A14] p-1"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 bg-[#FAF8F4] overflow-hidden">
          {src ? (
            <iframe
              src={src}
              title="Wedding website preview"
              className="w-full h-full border-0"
              data-testid="mobile-preview-iframe"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-[#8B7355]">
              <Loader2 className="animate-spin" />
            </div>
          )}
        </div>
        <div className="px-4 py-2.5 text-center text-[10px] tracking-[0.3em] uppercase text-[#8B7355] border-t border-[#C9B896]/40">
          Tap × to keep editing
        </div>
      </motion.div>
    </motion.div>
  )
}

function CraftingOverlay({ open, couple }) {
  if (!open) return null
  const stages = [
    { label: 'Preparing your gallery' },
    { label: 'Styling your timeline' },
    { label: 'Optimizing mobile experience' },
  ]
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.55 }}
      className="fixed inset-0 z-[120] bg-[#1F1A14] text-[#FDFBF7] flex items-center justify-center px-6"
      data-testid="onb-crafting-overlay"
    >
      <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 20% 30%, #C9B896 1px, transparent 1px), radial-gradient(circle at 80% 70%, #C9B896 1px, transparent 1px)',
        backgroundSize: '60px 60px, 60px 60px',
      }} />
      <div className="relative text-center max-w-xl">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="text-[#C9B896] tracking-[0.4em] text-[10px] uppercase mb-5 inline-flex items-center gap-2">
          <Sparkles size={12} /> Vivoha · Studio
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
          className="font-serif font-light text-4xl md:text-6xl leading-[1.1]">
          Crafting <em className="italic text-[#C9B896]">{couple || 'your'}</em>
          {couple ? '\u00A0' : ''}wedding website…
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.75 }} transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-5 text-[#FDFBF7]/75 text-sm md:text-base font-light">
          A moment of magic. We&apos;re shaping every detail just for you.
        </motion.p>
        <ul className="mt-10 inline-flex flex-col gap-3 text-left">
          {stages.map((s, i) => (
            <motion.li key={i}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + i * 0.7, duration: 0.5 }}
              className="flex items-center gap-3 text-[#FDFBF7]/85">
              <motion.span initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ delay: 0.9 + i * 0.7, type: 'spring', stiffness: 220, damping: 20 }}
                className="w-2 h-2 rounded-full bg-[#C9B896] block flex-shrink-0" />
              <span className="tracking-[0.25em] text-[11px] uppercase">{s.label}</span>
            </motion.li>
          ))}
        </ul>
        <div className="mt-10 mx-auto w-44 h-px bg-[#C9B896]/40 overflow-hidden">
          <motion.div initial={{ x: '-100%' }} animate={{ x: '200%' }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            className="h-px w-1/2 bg-[#C9B896]" />
        </div>
      </div>
    </motion.div>
  )
}

function Wrapper({ children }) {
  return <main className="min-h-screen bg-[#FDFBF7] text-[#3A3226]">{children}</main>
}
function Field({ label, hint, children }) {
  return (
    <div className="space-y-2">
      {label && <Label className="text-[10px] tracking-widest uppercase text-[#8B7355]">{label}</Label>}
      {children}
      {hint && <div className="text-[11px] text-[#3A3226]/60 italic">{hint}</div>}
    </div>
  )
}
function ToggleCard({ checked, onChange, title, desc, children, testId }) {
  return (
    <div className={`border bg-white/40 p-5 transition ${checked ? 'border-[#3A3226]' : 'border-[#C9B896]'}`}>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        data-testid={testId}
        className="w-full flex items-start gap-4 text-left focus:outline-none"
      >
        <span className={`relative inline-flex items-center w-12 h-7 rounded-full flex-shrink-0 transition ${checked ? 'bg-[#3A3226]' : 'bg-[#C9B896]/60'}`}>
          <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-[#FDFBF7] shadow transition ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </span>
        <span className="flex-1 min-w-0">
          <div className="font-serif text-lg text-[#3A3226] leading-tight">{title}</div>
          <div className="text-[13px] text-[#3A3226]/70 mt-1 leading-relaxed">{desc}</div>
        </span>
      </button>
      {children}
    </div>
  )
}

function newEvent({ name = '', emoji = '' } = {}) {
  return {
    name,
    emoji: emoji || emojiForEvent(name),
    date: '',
    startTime: '',
    endTime: '',
    venue: '',
    address: '',
    mapsLink: '',
    description: '',
    _showAddress: false,
  }
}

// =========================================================================
// WeddingUrlField — slug input with debounced availability check + auto-
// suggested chips. Validates client-side (lowercase, a-z0-9-, length 3..30)
// and queries GET /api/check-url?slug=...
// =========================================================================
function slugify(s = '') {
  return String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim()
    .replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 30)
}

function WeddingUrlField({ token, value, onChange, brideName, groomName }) {
  const b = slugify((brideName || '').split(/\s+/)[0])
  const g = slugify((groomName || '').split(/\s+/)[0])
  const suggestions = useMemo(() => {
    if (!b || !g) return []
    const year = new Date().getFullYear() + 1
    return [
      `${b}-${g}`,
      `${b}-weds-${g}`,
      `${b}${g}${year}`,
    ].map(s => s.slice(0, 30)).filter(s => s.length >= 3)
  }, [b, g])
  // status: empty | invalid | checking | available | taken | reserved
  const [status, setStatus] = useState('empty')
  const [altSuggestions, setAltSuggestions] = useState([])
  const debounceRef = useRef(null)

  function sanitize(raw) {
    return String(raw || '').toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .slice(0, 30)
  }

  function handleChange(raw) {
    const clean = sanitize(raw)
    onChange(clean)
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const v = value || ''
    if (!v) { setStatus('empty'); setAltSuggestions([]); return }
    if (v.length < 3 || v.length > 30 || !/^[a-z0-9]([a-z0-9-]{1,28})[a-z0-9]$/.test(v)) {
      setStatus('invalid'); setAltSuggestions([]); return
    }
    setStatus('checking')
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-url?slug=${encodeURIComponent(v)}&exclude=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (data.available) {
          setStatus('available'); setAltSuggestions([])
        } else {
          setStatus(data.reason === 'reserved' ? 'reserved' : data.reason === 'invalid' ? 'invalid' : 'taken')
          setAltSuggestions(Array.isArray(data.suggestions) ? data.suggestions.slice(0, 3) : [])
        }
      } catch (_) {
        setStatus('available') // fail open — backend revalidates on save
      }
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [value, token])

  const borderColor =
    status === 'available' ? '#4CAF50' :
    status === 'taken' || status === 'reserved' || status === 'invalid' ? '#E57373' :
    '#C9A96E'

  return (
    <div className="space-y-2" data-testid="wedding-url-block">
      <Label className="text-[14px] font-serif text-[#3A3226] not-italic block">
        Your wedding URL
      </Label>
      <div
        className="flex items-stretch bg-[#FAF8F4] transition-colors"
        style={{
          border: `2px solid ${borderColor}`,
          borderLeftWidth: 2,
        }}
        data-testid="wedding-url-input-wrapper"
      >
        <span
          className="flex items-center px-3.5 border-r border-[#C9B896] text-[#8B7355] font-serif text-[15px] select-none"
          data-testid="wedding-url-prefix"
        >
          vivoha.in/
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="rahul-priya"
          maxLength={30}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          data-testid="wedding-url-input"
          className="flex-1 bg-transparent px-3.5 py-3 outline-none font-serif text-[15px] text-[#3A3226] placeholder:text-[#8B7355]/50 lowercase"
        />
        {status === 'checking' && (
          <span className="flex items-center pr-3.5" aria-label="Checking">
            <Loader2 size={14} className="animate-spin text-[#8B7355]" />
          </span>
        )}
      </div>

      {/* Suggestion chips — shown when input is empty */}
      {status === 'empty' && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1" data-testid="wedding-url-suggestions">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              data-testid={`wedding-url-suggestion-${s}`}
              className="font-serif text-[13px] text-[#3A3226] border border-[#C9A96E]/70 hover:border-[#C9A96E] hover:bg-[#C9A96E]/10 px-3 py-1 rounded-full transition bg-transparent"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Status messages */}
      {status === 'empty' && suggestions.length === 0 && (
        <div className="text-[12px] italic text-[#8B7355]" data-testid="wedding-url-helper">
          Your guests will open this link. Choose something memorable.
        </div>
      )}
      {status === 'empty' && suggestions.length > 0 && (
        <div className="text-[12px] italic text-[#8B7355]" data-testid="wedding-url-helper">
          Tap a suggestion or type your own.
        </div>
      )}
      {status === 'invalid' && (
        <div className="text-[12px] italic text-[#E57373]" data-testid="wedding-url-status-invalid">
          3–30 lowercase letters, numbers or hyphens. Start &amp; end with a letter or number.
        </div>
      )}
      {status === 'available' && (
        <div className="text-[12px] italic text-[#4CAF50]" data-testid="wedding-url-status-available">
          ✓ vivoha.in/{value} is available!
        </div>
      )}
      {(status === 'taken' || status === 'reserved') && (
        <div className="space-y-2" data-testid="wedding-url-status-taken">
          <div className="text-[12px] italic text-[#E57373]">
            {status === 'reserved'
              ? "That URL is reserved — pick one of these:"
              : "This URL is taken. Try one of these:"}
          </div>
          {altSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {altSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange(s)}
                  data-testid={`wedding-url-alt-${s}`}
                  className="font-serif text-[13px] text-[#3A3226] border border-[#C9A96E]/70 hover:border-[#C9A96E] hover:bg-[#C9A96E]/10 px-3 py-1 rounded-full transition bg-transparent"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =========================================================================
// StoryEnhanceControls — bottom-right overlay inside the Story textarea
// with an AI "Enhance" wand and a "Clear" eraser. Wand only appears
// once the user has typed at least 4 words.
// =========================================================================
function StoryEnhanceControls({ value, enhancing, onEnhance, onClear }) {
  const wordCount = (value || '').trim().split(/\s+/).filter(Boolean).length
  const canEnhance = wordCount >= 4
  const hasText = (value || '').length > 0
  return (
    <div className="absolute bottom-2 right-2 flex items-center gap-2 pointer-events-none">
      {hasText && (
        <button
          type="button"
          onClick={onClear}
          data-testid="story-clear-btn"
          aria-label="Clear story"
          className="pointer-events-auto inline-flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-[#8B7355]/85 hover:text-[#1F1A14] bg-white/85 hover:bg-white border border-[#C9B896]/70 hover:border-[#1F1A14] px-2 py-1 transition backdrop-blur-sm shadow-sm"
        >
          <Eraser size={11} /> Clear all
        </button>
      )}
      <AnimatePresence>
        {canEnhance && (
          <motion.button
            type="button"
            onClick={onEnhance}
            disabled={enhancing}
            data-testid="story-enhance-btn"
            aria-label="Enhance with AI"
            title="Enhance with AI"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto relative inline-flex items-center gap-1.5 text-[11px] tracking-[0.2em] uppercase font-medium text-[#FDFBF7] px-3 py-1.5 transition shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-wait overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #C9A96E 0%, #8B6F3D 55%, #4A3A8C 110%)',
              border: '1px solid rgba(255,255,255,0.18)',
            }}
          >
            <span
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.18) 0%, transparent 50%)',
              }}
            />
            {enhancing ? (
              <Loader2 size={12} className="animate-spin relative" />
            ) : (
              <Wand2 size={12} className="relative" />
            )}
            <span className="relative">{enhancing ? 'Enhancing…' : 'Enhance'}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

// =========================================================================
// ImageCropModal — centred card with react-image-crop. User can drag the
// crop area + zoom the image. Aspect locked to the slot's ratio. Confirms
// produce a JPEG data URI that's uploaded to Cloudinary.
// =========================================================================
function ImageCropModal({ srcUri, aspect, target, onCancel, onTryAnother, onConfirm }) {
  const imgRef = useRef(null)
  const [crop, setCrop] = useState(null)
  const [completedCrop, setCompletedCrop] = useState(null)
  const [scale, setScale] = useState(1)
  const [busy, setBusy] = useState(false)

  function onLoad(e) {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
    const initial = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, aspect, w, h),
      w, h
    )
    setCrop(initial)
    setCompletedCrop({
      unit: 'px',
      x: (initial.x / 100) * w,
      y: (initial.y / 100) * h,
      width: (initial.width / 100) * w,
      height: (initial.height / 100) * h,
    })
  }

  function onWheel(e) {
    e.preventDefault()
    const next = Math.min(3, Math.max(1, scale + (e.deltaY < 0 ? 0.08 : -0.08)))
    setScale(Number(next.toFixed(2)))
  }

  async function confirm() {
    if (!completedCrop || !imgRef.current || busy) return
    setBusy(true)
    try {
      const dataUri = await renderCroppedDataUri(imgRef.current, completedCrop, scale)
      const meta = {
        x: Number((completedCrop.x).toFixed(2)),
        y: Number((completedCrop.y).toFixed(2)),
        width: Number((completedCrop.width).toFixed(2)),
        height: Number((completedCrop.height).toFixed(2)),
        scale,
      }
      await onConfirm({ croppedDataUri: dataUri, crop: meta })
    } finally {
      setBusy(false)
    }
  }

  const aspectLabel = aspect > 1.5 ? '16:9 landscape' : aspect === 1 ? '1:1 square' : '4:3'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[125] bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
      data-testid="crop-modal"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="relative bg-[#FDFBF7] border border-[#C9A96E] shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-[#C9B896]/60">
          <h3 className="font-serif text-2xl text-[#3A3226] flex items-center gap-2">
            Position your moment <span className="text-[#C9A96E]">✦</span>
          </h3>
          <p className="text-[12px] italic text-[#8B7355] mt-1 leading-relaxed">
            Drag to reposition · Scroll to zoom · Locked to {aspectLabel}
          </p>
        </div>

        <div
          className="flex-1 overflow-auto bg-[#0a0a0a] flex items-center justify-center p-4 select-none"
          onWheel={onWheel}
        >
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            keepSelection
            ruleOfThirds
          >
            <img
              ref={imgRef}
              src={srcUri}
              alt=""
              crossOrigin="anonymous"
              onLoad={onLoad}
              draggable={false}
              data-testid="crop-image"
              style={{ transform: `scale(${scale})`, transformOrigin: 'center center', maxHeight: '60vh', display: 'block' }}
            />
          </ReactCrop>
        </div>

        <div className="px-6 py-3 border-t border-[#C9B896]/60 flex items-center gap-3 bg-[#FAF8F4]">
          <input
            type="range" min="1" max="3" step="0.02"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            data-testid="crop-zoom"
            className="flex-1 accent-[#C9A96E]"
            aria-label="Zoom"
          />
          <span className="text-[10px] tracking-[0.25em] uppercase text-[#8B7355] w-12 text-right">{Math.round(scale * 100)}%</span>
        </div>

        <div className="px-6 py-4 border-t border-[#C9B896]/60 flex flex-col sm:flex-row gap-3 sm:justify-between items-stretch sm:items-center bg-white">
          <button
            type="button"
            onClick={onTryAnother}
            data-testid="crop-try-another"
            disabled={busy}
            className="text-[11px] tracking-[0.22em] uppercase text-[#8B7355] hover:text-[#1F1A14] underline underline-offset-4 decoration-[#C9B896] hover:decoration-[#1F1A14] transition disabled:opacity-50"
          >
            Try a different photo
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy || !completedCrop}
            data-testid="crop-confirm"
            className="bg-[#1F1A14] hover:bg-[#3A3226] disabled:opacity-70 disabled:cursor-wait text-[#FDFBF7] px-7 py-3.5 tracking-[0.22em] text-[11px] uppercase transition inline-flex items-center justify-center gap-2 shadow-md font-medium"
          >
            {busy ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : <>Use this <Sparkles size={12} /></>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Helper — draw the cropped (and zoomed) region of the image to a canvas
// and return a JPEG data URI ready for upload.
async function renderCroppedDataUri(imgEl, crop, scale = 1) {
  const naturalW = imgEl.naturalWidth
  const naturalH = imgEl.naturalHeight
  const renderedW = imgEl.width
  const renderedH = imgEl.height
  // The transform: scale() applied to the <img> only changes display size,
  // not the underlying image data. The crop coords from react-image-crop are
  // in *displayed* pixels at scale=1. When we apply CSS scale > 1, the
  // visible image is bigger so the crop frame (which stayed the same on
  // screen) actually covers less of the natural image. Compensate:
  const sourceRatioX = naturalW / renderedW / scale
  const sourceRatioY = naturalH / renderedH / scale
  const sx = (crop.x + (renderedW * (scale - 1)) / 2) * sourceRatioX
  const sy = (crop.y + (renderedH * (scale - 1)) / 2) * sourceRatioY
  const sw = crop.width * sourceRatioX
  const sh = crop.height * sourceRatioY
  // Output canvas: cap longest side at 1800 for sensible upload size
  const maxOut = 1800
  const longest = Math.max(sw, sh)
  const outScale = longest > maxOut ? maxOut / longest : 1
  const outW = Math.max(1, Math.round(sw * outScale))
  const outH = Math.max(1, Math.round(sh * outScale))
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    imgEl,
    Math.max(0, sx), Math.max(0, sy),
    Math.min(naturalW, sw), Math.min(naturalH, sh),
    0, 0,
    outW, outH,
  )
  return canvas.toDataURL('image/jpeg', 0.88)
}

// =========================================================================
// SplitPreviewPanel — sticky right column shown on the Photos step on
// desktop. Renders a lightweight hero card using the in-memory form data
// so it updates instantly (no iframe).
// =========================================================================
function SplitPreviewPanel({ form }) {
  const hero = form.heroImage?.url
  const dateLabel = (() => {
    if (!form.weddingDate) return ''
    try {
      return new Date(`${form.weddingDate}T${form.weddingTime || '00:00'}:00`).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    } catch { return '' }
  })()
  return (
    <aside className="hidden lg:block sticky top-12 self-start" data-testid="split-preview-panel">
      <div className="text-[10px] tracking-[0.32em] uppercase text-[#8B7355] mb-3 flex items-center gap-2">
        <Eye size={12} /> How your guests will see this
      </div>
      <div className="border border-[#C9B896] bg-[#FAF8F4] shadow-md overflow-hidden">
        <div className="relative w-full aspect-[16/9] bg-[#0F0C08] overflow-hidden">
          {hero ? (
            <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" data-testid="split-hero-img" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#C9A96E]/65">
              <div className="text-center px-6">
                <Camera size={28} className="mx-auto mb-2" />
                <div className="text-[10px] tracking-[0.3em] uppercase">Your hero appears here</div>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-[#0F0C08]/45" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div className="text-[9px] tracking-[0.4em] uppercase text-[#C9A96E] mb-2" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}>
              Save our date
            </div>
            <div className="font-serif text-[#FDFBF7] leading-none italic" style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.4rem)', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
              {form.brideName || 'Bride'}
            </div>
            <div className="my-1.5 text-[#C9A96E] italic font-serif text-base">&amp;</div>
            <div className="font-serif text-[#FDFBF7] leading-none italic" style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.4rem)', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
              {form.groomName || 'Groom'}
            </div>
            {dateLabel && (
              <div className="mt-4 text-[10px] tracking-[0.32em] uppercase text-[#C9A96E]" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
                {dateLabel}
              </div>
            )}
          </div>
        </div>
        <div className="px-4 py-3 bg-white border-t border-[#C9B896]/50 grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => {
            const g = form.gallery?.[i]
            return (
              <div key={i} className="aspect-square bg-[#FAF8F4] border border-[#C9B896]/50 overflow-hidden" data-testid={`split-thumb-${i}`}>
                {g?.url ? (
                  <img src={g.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#C9B896]">
                    <Camera size={12} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-3 text-[10px] italic text-[#8B7355] leading-relaxed">
        Tap any photo on the left to reposition or replace it.
      </div>
    </aside>
  )
}

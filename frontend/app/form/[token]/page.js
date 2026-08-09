'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Plus, Trash2, Upload, Loader2, CheckCircle2, Image as ImageIcon, Sparkles, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const TEMPLATES = [
  'Moonveil', 'Royal Heritage', 'Eternal Edit', 'Crimson Lotus', 'Sapphire Saga',
  'Sanctum Veil', 'Marigold Bloom', 'Pearl & Velvet', 'Banyan & Brass',
  'Pichwai Bloom', 'Albion Vow', 'Jannah Vow',
]

function fileToDataUri(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

export default function ClientFormPage() {
  const { token } = useParams()
  const [meta, setMeta] = useState(null)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    brideName: '', groomName: '', tagline: '', weddingDate: '', weddingTime: '',
    template: 'Moonveil', story: '', mapsLink: '',
    contactPhone: '', contactEmail: '', notes: '',
    heroImage: null, gallery: [], events: [],
    passwordProtect: false, invitePassword: '', invitePrompt: '',
  })

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/forms/public/${token}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Form unavailable'); return }
        setMeta(data.form)
        if (data.form.status !== 'pending') setDone(true)
      } catch (e) { setError('Could not load form') }
    })()
  }, [token])

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function uploadFile(file) {
    if (file.size > 8 * 1024 * 1024) { toast.error('Image must be under 8MB'); return null }
    const dataUri = await fileToDataUri(file)
    const res = await fetch(`/api/forms/public/${token}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUri }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Upload failed'); return null }
    return data
  }

  async function onHero(e) {
    const f = e.target.files?.[0]; if (!f) return
    toast.loading('Uploading hero…', { id: 'hu' })
    const u = await uploadFile(f); toast.dismiss('hu')
    if (u) { set('heroImage', u); toast.success('Hero photo uploaded') }
  }
  async function onGallery(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    toast.loading(`Uploading ${files.length} photos…`, { id: 'gu' })
    const results = []
    for (const f of files) {
      const u = await uploadFile(f); if (u) results.push(u)
    }
    toast.dismiss('gu')
    if (results.length) { set('gallery', [...form.gallery, ...results]); toast.success(`${results.length} photo(s) added`) }
  }

  function addEvent() {
    set('events', [...form.events, { name: '', date: '', startTime: '', endTime: '', venue: '', address: '', description: '' }])
  }
  function updEvent(i, k, v) {
    const next = [...form.events]; next[i] = { ...next[i], [k]: v }; set('events', next)
  }
  function rmEvent(i) { set('events', form.events.filter((_, idx) => idx !== i)) }

  async function submit() {
    if (!form.brideName.trim() || !form.groomName.trim() || !form.weddingDate) {
      toast.error('Bride, groom and wedding date are required'); return
    }
    if (form.passwordProtect && (!form.invitePassword || form.invitePassword.length < 4)) {
      toast.error('Please set an invite password (4+ characters)'); return
    }
    setSubmitting(true)
    try {
      const isoDate = form.weddingTime
        ? `${form.weddingDate}T${form.weddingTime}:00+05:30`
        : `${form.weddingDate}T18:00:00+05:30`
      const payload = { ...form, weddingDate: isoDate }
      delete payload.weddingTime
      const res = await fetch(`/api/forms/public/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      toast.success('Submitted! Our studio will be in touch.')
      setDone(true)
    } catch (e) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  if (error) return <Wrapper><div className="text-center py-32" data-testid="form-error"><AlertCircle size={32} className="mx-auto text-[#8B7355] mb-3" /><h1 className="font-serif text-3xl text-[#3A3226]">Form unavailable</h1><p className="mt-3 text-[#3A3226]/70">{error}</p></div></Wrapper>
  if (!meta) return <Wrapper><div className="text-center py-32 text-[#8B7355]"><Loader2 className="animate-spin mx-auto" /></div></Wrapper>
  if (done) return <Wrapper><div className="text-center py-32" data-testid="form-thankyou">
    <div className="w-20 h-20 bg-[#C9B896]/30 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} className="text-[#3A3226]" /></div>
    <div className="text-[#8B7355] tracking-[0.3em] text-xs uppercase mb-3">Submitted</div>
    <h1 className="font-serif font-light text-5xl text-[#3A3226]">Thank you, {meta.clientName}!</h1>
    <p className="mt-4 text-[#3A3226]/70 max-w-lg mx-auto">Your wedding details have reached our studio. We'll craft your Vivoha page within 24–48 hours and share the link via WhatsApp.</p>
  </div></Wrapper>

  return (
    <Wrapper>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto py-16 px-4" data-testid="client-form">
        <div className="text-[#8B7355] tracking-[0.3em] text-xs uppercase mb-3 flex items-center gap-2"><Sparkles size={14} /> Vivoha · Studio Intake</div>
        <h1 className="font-serif font-light text-5xl md:text-6xl text-[#3A3226]">Welcome{meta.clientName ? `, ${meta.clientName}` : ''}.</h1>
        <p className="mt-4 text-[#3A3226]/75 text-lg leading-relaxed max-w-2xl">
          Tell us about your wedding. Our studio will use these details and photos to craft your cinematic website within 24–48 hours.
        </p>
        <p className="mt-2 text-[#8B7355] text-sm italic">This form can only be submitted once.</p>

        <div className="mt-12 space-y-12">
          <Card title="The couple" subtitle="Names exactly as you would like them displayed.">
            <Row>
              <FormField label="Bride's name *"><Input value={form.brideName} onChange={e => set('brideName', e.target.value)} data-testid="form-bride-input" className="rounded-none border-[#C9B896] bg-white/40 py-5" /></FormField>
              <FormField label="Groom's name *"><Input value={form.groomName} onChange={e => set('groomName', e.target.value)} data-testid="form-groom-input" className="rounded-none border-[#C9B896] bg-white/40 py-5" /></FormField>
            </Row>
            <FormField label="Tagline (optional)" hint="A short phrase that describes the two of you.">
              <Input value={form.tagline} onChange={e => set('tagline', e.target.value)} maxLength={140} placeholder="A sky full of stars, finally home." className="rounded-none border-[#C9B896] bg-white/40 py-5" />
            </FormField>
          </Card>

          <Card title="The day" subtitle="When and how.">
            <Row>
              <FormField label="Wedding date *"><Input type="date" value={form.weddingDate} onChange={e => set('weddingDate', e.target.value)} data-testid="form-date-input" className="rounded-none border-[#C9B896] bg-white/40 py-5" /></FormField>
              <FormField label="Wedding time"><Input type="time" value={form.weddingTime} onChange={e => set('weddingTime', e.target.value)} className="rounded-none border-[#C9B896] bg-white/40 py-5" /></FormField>
            </Row>
            <FormField label="Choose a template style" hint="You can change this with us later.">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TEMPLATES.map(t => (
                  <button key={t} type="button" onClick={() => set('template', t)} data-testid={`form-template-${t.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                    className={`text-left text-xs tracking-wider uppercase px-3 py-3 border transition ${form.template === t ? 'border-[#3A3226] bg-[#3A3226] text-[#FDFBF7]' : 'border-[#C9B896] text-[#3A3226] hover:border-[#3A3226]'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </FormField>
          </Card>

          <Card title="Your story" subtitle="Where you met, how you fell, why now.">
            <FormField label="Tell us briefly (3–6 sentences)">
              <Textarea value={form.story} onChange={e => set('story', e.target.value)} rows={5} maxLength={2000} data-testid="form-story-input" className="rounded-none border-[#C9B896] bg-white/40" />
            </FormField>
          </Card>

          <Card title="Photos" subtitle="One hero photo + up to 12 gallery photos. Best quality you have.">
            <FormField label="Hero photo (full-page header)">
              {form.heroImage?.url ? (
                <div className="relative">
                  <img src={form.heroImage.url} alt="" className="w-full h-56 object-cover" />
                  <button type="button" onClick={() => set('heroImage', null)} className="absolute top-2 right-2 bg-[#FDFBF7]/90 text-[#3A3226] px-3 py-1 text-xs tracking-widest uppercase">Replace</button>
                </div>
              ) : (
                <label className="border border-dashed border-[#C9B896] flex flex-col items-center justify-center py-10 cursor-pointer hover:bg-[#C9B896]/10 transition" data-testid="form-hero-label">
                  <Upload size={22} className="text-[#8B7355] mb-2" />
                  <div className="text-sm text-[#3A3226]">Tap to choose hero photo</div>
                  <input type="file" accept="image/*" className="hidden" onChange={onHero} data-testid="form-hero-input" />
                </label>
              )}
            </FormField>
            <FormField label={`Gallery (${form.gallery.length}/12)`}>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-3">
                {form.gallery.map((g, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={g.url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => set('gallery', form.gallery.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-[#3A3226]/80 text-white p-1"><X size={12} /></button>
                  </div>
                ))}
              </div>
              <label className="border border-dashed border-[#C9B896] flex items-center justify-center py-6 cursor-pointer hover:bg-[#C9B896]/10 transition" data-testid="form-gallery-label">
                <ImageIcon size={18} className="text-[#8B7355] mr-2" />
                <span className="text-sm text-[#3A3226]">Add gallery photos</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={onGallery} data-testid="form-gallery-input" />
              </label>
            </FormField>
          </Card>

          <Card title="Events" subtitle="Mehendi, Sangeet, Ceremony… add as many as you like.">
            {form.events.map((ev, i) => (
              <div key={i} className="border border-[#C9B896] bg-white/40 p-4 mb-3" data-testid={`form-event-${i}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs tracking-widest uppercase text-[#8B7355]">Event #{i + 1}</div>
                  <button type="button" onClick={() => rmEvent(i)} className="text-red-700 hover:text-red-900"><Trash2 size={14} /></button>
                </div>
                <Row>
                  <FormField label="Name"><Input value={ev.name} onChange={e => updEvent(i, 'name', e.target.value)} placeholder="Mehendi" className="rounded-none border-[#C9B896] bg-white/40" /></FormField>
                  <FormField label="Date"><Input type="date" value={ev.date} onChange={e => updEvent(i, 'date', e.target.value)} className="rounded-none border-[#C9B896] bg-white/40" /></FormField>
                </Row>
                <Row>
                  <FormField label="Start time"><Input value={ev.startTime} onChange={e => updEvent(i, 'startTime', e.target.value)} placeholder="6:00 PM" className="rounded-none border-[#C9B896] bg-white/40" /></FormField>
                  <FormField label="End time"><Input value={ev.endTime} onChange={e => updEvent(i, 'endTime', e.target.value)} placeholder="9:00 PM" className="rounded-none border-[#C9B896] bg-white/40" /></FormField>
                </Row>
                <FormField label="Venue"><Input value={ev.venue} onChange={e => updEvent(i, 'venue', e.target.value)} className="rounded-none border-[#C9B896] bg-white/40" /></FormField>
                <FormField label="Address"><Input value={ev.address} onChange={e => updEvent(i, 'address', e.target.value)} className="rounded-none border-[#C9B896] bg-white/40" /></FormField>
                <FormField label="Short description"><Textarea value={ev.description} onChange={e => updEvent(i, 'description', e.target.value)} rows={2} className="rounded-none border-[#C9B896] bg-white/40" /></FormField>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addEvent} data-testid="form-add-event-btn" className="rounded-none border-[#3A3226] text-[#3A3226] hover:bg-[#3A3226] hover:text-[#FDFBF7]">
              <Plus size={14} className="mr-1.5" /> Add an event
            </Button>
          </Card>

          <Card title="Venue location" subtitle="Add a Google Maps link so guests can navigate easily.">
            <FormField label="Google Maps URL (optional)" hint="Open the location on Google Maps and paste the share link.">
              <Input value={form.mapsLink} onChange={e => set('mapsLink', e.target.value)} placeholder="https://maps.app.goo.gl/…" data-testid="form-maps-input" className="rounded-none border-[#C9B896] bg-white/40 py-5" />
            </FormField>
          </Card>

          <Card title="Privacy" subtitle="Keep your invitation visible only to those you choose.">
            <div className="flex items-start gap-3 border border-[#C9B896] bg-white/40 p-4">
              <input
                type="checkbox"
                id="pwprotect"
                checked={form.passwordProtect}
                onChange={e => set('passwordProtect', e.target.checked)}
                data-testid="form-password-protect-toggle"
                className="mt-1 w-4 h-4 accent-[#3A3226]"
              />
              <label htmlFor="pwprotect" className="flex-1 cursor-pointer">
                <div className="font-serif text-base text-[#3A3226]">Password-protect this invitation</div>
                <div className="text-xs text-[#8B7355] mt-1">Recommended for intimate gatherings. Only guests with the password will see your invite.</div>
              </label>
            </div>
            {form.passwordProtect && (
              <div className="space-y-4 pl-7" data-testid="form-password-fields">
                <FormField label="Invite password *" hint="Share this with the guests you invite. At least 4 characters.">
                  <Input
                    type="text"
                    value={form.invitePassword}
                    onChange={e => set('invitePassword', e.target.value)}
                    minLength={4}
                    placeholder="e.g. aanya2030"
                    data-testid="form-invite-password-input"
                    className="rounded-none border-[#C9B896] bg-white/40 py-5"
                  />
                </FormField>
                <FormField label="Welcome line (optional)" hint="A short message shown above the password field.">
                  <Input
                    value={form.invitePrompt}
                    onChange={e => set('invitePrompt', e.target.value)}
                    maxLength={200}
                    placeholder="A private celebration. Enter the password we shared."
                    data-testid="form-invite-prompt-input"
                    className="rounded-none border-[#C9B896] bg-white/40 py-5"
                  />
                </FormField>
              </div>
            )}
          </Card>

          <Card title="How can we reach you?" subtitle="So our studio can WhatsApp you with the live link.">
            <Row>
              <FormField label="Phone (preferred)"><Input value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} placeholder="+91 98765 43210" className="rounded-none border-[#C9B896] bg-white/40 py-5" /></FormField>
              <FormField label="Email"><Input type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} className="rounded-none border-[#C9B896] bg-white/40 py-5" /></FormField>
            </Row>
            <FormField label="Anything else?" hint="Special requests, colors, references — anything we should know."><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} maxLength={2000} className="rounded-none border-[#C9B896] bg-white/40" /></FormField>
          </Card>

          <Button onClick={submit} disabled={submitting} data-testid="form-submit-btn" className="w-full bg-[#3A3226] hover:bg-[#1F1A14] text-[#FDFBF7] rounded-none py-7 tracking-widest text-xs uppercase">
            {submitting ? <><Loader2 className="animate-spin mr-2" size={14} /> Submitting…</> : 'Submit to Studio'}
          </Button>
          <p className="text-xs text-[#3A3226]/55 text-center -mt-6">This form can only be submitted once. Double-check your details before sending.</p>
        </div>
      </motion.div>
    </Wrapper>
  )
}

function Wrapper({ children }) {
  return <main className="min-h-screen bg-[#FDFBF7] text-[#3A3226]">{children}</main>
}
function Card({ title, subtitle, children }) {
  return (
    <section className="border-t border-[#C9B896]/50 pt-10">
      <h2 className="font-serif text-3xl text-[#3A3226]">{title}</h2>
      {subtitle && <p className="text-sm text-[#8B7355] italic mt-1">{subtitle}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  )
}
function Row({ children }) { return <div className="grid md:grid-cols-2 gap-5">{children}</div> }
function FormField({ label, hint, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs tracking-widest uppercase text-[#8B7355]">{label}</Label>
      {children}
      {hint && <div className="text-xs text-[#3A3226]/60">{hint}</div>}
    </div>
  )
}

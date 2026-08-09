'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MapPin, Clock, Calendar, Check, ChevronLeft, ChevronRight, X, Gift, Instagram } from 'lucide-react'
import { toast } from 'sonner'

function useCountdown(target) {
  const [now, setNow] = useState(0)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const ms = mounted ? Math.max(0, new Date(target).getTime() - now) : 0
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
    done: mounted && ms === 0,
  }
}
const fmt = (d) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
const fmtMo = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
const fmtDay = (d) => new Date(d).getDate()

// ===== ORNAMENTS (SVG paisley/mandala decorations) =====
const Paisley = ({ className = '', size = 60 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M32 6c-8 6-14 14-14 24 0 10 8 20 14 28 6-8 14-18 14-28 0-10-6-18-14-24z" />
    <path d="M32 18c-4 3-7 8-7 14 0 6 4 12 7 18 3-6 7-12 7-18 0-6-3-11-7-14z" />
    <circle cx="32" cy="36" r="2.5" fill="currentColor" />
    <path d="M14 38c2 4 5 8 8 10M50 38c-2 4-5 8-8 10" />
  </svg>
)
const Mandala = ({ className = '', size = 80 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="0.8">
    <circle cx="50" cy="50" r="48" />
    <circle cx="50" cy="50" r="38" />
    <circle cx="50" cy="50" r="26" />
    <circle cx="50" cy="50" r="14" />
    <circle cx="50" cy="50" r="4" fill="currentColor" />
    {[...Array(12)].map((_, i) => (
      <line key={i} x1="50" y1="2" x2="50" y2="14" transform={`rotate(${i * 30} 50 50)`} />
    ))}
    {[...Array(8)].map((_, i) => (
      <path key={i} d="M50 16 Q56 26 50 36 Q44 26 50 16" transform={`rotate(${i * 45} 50 50)`} />
    ))}
  </svg>
)
const Divider = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-4 ${className}`}>
    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-[#D4AF37]" />
    <Paisley className="text-[#D4AF37]" size={32} />
    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#D4AF37] to-[#D4AF37]" />
  </div>
)

export default function RoyalHeritageTemplate({ wedding }) {
  const [lightbox, setLightbox] = useState(null)
  const cd = useCountdown(wedding.weddingDate)
  const heroUrl = wedding.heroImage?.url
  const gallery = wedding.gallery || []
  const events = wedding.events || []

  return (
    <main className="min-h-screen bg-[#FFF8DC] text-[#3A0F0F]" style={{
      backgroundImage: `radial-gradient(circle at 10% 0%, rgba(212,175,55,0.08) 0%, transparent 40%),
                        radial-gradient(circle at 90% 100%, rgba(139,0,0,0.05) 0%, transparent 40%)`,
    }}>
      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {heroUrl ? (
          <>
            <motion.img initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 2.5, ease: 'easeOut' }}
              src={heroUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#3A0F0F]/40 via-[#3A0F0F]/40 to-[#3A0F0F]/85" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#3A0F0F] via-[#8B0000] to-[#5C0A0A]" />
        )}

        {/* Ornate border frame */}
        <div className="absolute inset-6 md:inset-10 border-2 border-[#D4AF37]/60 pointer-events-none" />
        <div className="absolute inset-10 md:inset-14 border border-[#D4AF37]/30 pointer-events-none" />

        {/* Corner mandalas */}
        <Mandala className="absolute top-12 left-12 text-[#D4AF37]/40 hidden md:block" size={70} />
        <Mandala className="absolute top-12 right-12 text-[#D4AF37]/40 hidden md:block" size={70} />
        <Mandala className="absolute bottom-12 left-12 text-[#D4AF37]/40 hidden md:block" size={70} />
        <Mandala className="absolute bottom-12 right-12 text-[#D4AF37]/40 hidden md:block" size={70} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.4 }}
          className="relative z-10 text-center text-[#FFF8DC] px-8 max-w-5xl">
          <div className="text-[#D4AF37] tracking-[0.6em] text-xs uppercase mb-4">॥ शुभ विवाह ॥</div>
          <div className="text-[#D4AF37] tracking-[0.4em] text-xs uppercase mb-8">With the blessings of our families</div>
          <Paisley className="mx-auto mb-6 text-[#D4AF37]" size={50} />
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[1.05] mb-2 text-[#FFF8DC]"
            style={{ textShadow: '0 0 40px rgba(212,175,55,0.3)' }}>
            {wedding.brideName}
          </h1>
          <div className="font-serif italic text-3xl md:text-5xl text-[#D4AF37] my-4">~ weds ~</div>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[1.05] mb-8 text-[#FFF8DC]"
            style={{ textShadow: '0 0 40px rgba(212,175,55,0.3)' }}>
            {wedding.groomName}
          </h1>
          {wedding.tagline && (
            <p className="font-serif italic text-xl md:text-2xl text-[#FFF8DC]/90 max-w-2xl mx-auto mb-8">"{wedding.tagline}"</p>
          )}
          <Divider className="my-8 max-w-md mx-auto opacity-80" />
          <div className="inline-flex items-center gap-3 text-[#D4AF37] tracking-widest">
            <Calendar className="w-4 h-4" />
            <span className="text-sm md:text-base">{fmt(wedding.weddingDate)}</span>
          </div>
        </motion.div>
      </section>

      {/* COUNTDOWN */}
      {!cd.done && (
        <section className="py-20 md:py-28 px-4 bg-[#3A0F0F] text-[#FFF8DC] relative overflow-hidden">
          <Mandala className="absolute -left-20 top-1/2 -translate-y-1/2 text-[#D4AF37]/10" size={300} />
          <Mandala className="absolute -right-20 top-1/2 -translate-y-1/2 text-[#D4AF37]/10" size={300} />
          <div className="container mx-auto max-w-4xl relative z-10">
            <div className="text-center mb-12">
              <Paisley className="mx-auto mb-4 text-[#D4AF37]" size={36} />
              <div className="text-[#D4AF37] tracking-[0.4em] text-xs uppercase mb-3">The auspicious moment</div>
              <h2 className="font-serif text-4xl md:text-5xl">Until our vows</h2>
            </div>
            <div className="grid grid-cols-4 gap-3 md:gap-6">
              {[{ v: cd.days, l: 'Days' }, { v: cd.hours, l: 'Hours' }, { v: cd.minutes, l: 'Minutes' }, { v: cd.seconds, l: 'Seconds' }].map((u) => (
                <div key={u.l} className="aspect-square flex flex-col items-center justify-center border-2 border-[#D4AF37]/50 bg-[#FFF8DC]/5 relative">
                  <div className="absolute inset-1 border border-[#D4AF37]/20" />
                  <div className="font-serif text-4xl md:text-6xl text-[#D4AF37]">{String(u.v).padStart(2, '0')}</div>
                  <div className="text-[10px] md:text-xs tracking-[0.3em] uppercase mt-2 text-[#FFF8DC]/80">{u.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* STORY */}
      {wedding.story && (
        <section className="py-20 md:py-32 px-4 relative">
          <div className="container mx-auto max-w-3xl text-center">
            <Mandala className="mx-auto mb-6 text-[#8B0000]/50" size={70} />
            <div className="text-[#8B0000] tracking-[0.4em] text-xs uppercase mb-4">॥ Our Story ॥</div>
            <h2 className="font-serif text-5xl md:text-6xl text-[#3A0F0F] mb-4">A union written in the stars</h2>
            <Divider className="max-w-md mx-auto my-10" />
            <div className="font-serif text-lg md:text-xl text-[#3A0F0F]/85 leading-relaxed whitespace-pre-line text-left bg-[#FFF8DC]/60 p-8 md:p-12 border border-[#D4AF37]/40 relative">
              <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-[#8B0000]" />
              <div className="absolute -top-3 -right-3 w-6 h-6 border-t-2 border-r-2 border-[#8B0000]" />
              <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-2 border-l-2 border-[#8B0000]" />
              <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-[#8B0000]" />
              <span className="float-left font-serif text-7xl leading-none mr-3 mt-1 text-[#8B0000]">{wedding.story.charAt(0)}</span>
              {wedding.story.slice(1)}
            </div>
          </div>
        </section>
      )}

      {/* GALLERY */}
      {gallery.length > 0 && (
        <section className="py-20 md:py-32 px-4 bg-[#3A0F0F] text-[#FFF8DC]">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <Paisley className="mx-auto mb-4 text-[#D4AF37]" size={40} />
              <div className="text-[#D4AF37] tracking-[0.4em] text-xs uppercase mb-3">Cherished moments</div>
              <h2 className="font-serif text-5xl md:text-6xl">Our gallery</h2>
              <Divider className="max-w-md mx-auto mt-8 opacity-80" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {gallery.map((g, i) => (
                <motion.button key={g.publicId || i}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: (i % 8) * 0.05 }}
                  onClick={() => setLightbox(i)}
                  className={`relative overflow-hidden group border-2 border-[#D4AF37]/30 hover:border-[#D4AF37] transition ${i % 5 === 0 ? 'md:row-span-2 aspect-square md:aspect-[3/4]' : 'aspect-square'}`}>
                  <img src={g.url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-[#3A0F0F]/0 group-hover:bg-[#3A0F0F]/30 transition" />
                </motion.button>
              ))}
            </div>
          </div>
          <AnimatePresence>
            {lightbox !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
                <button className="absolute top-6 right-6 text-[#D4AF37]" onClick={() => setLightbox(null)}><X /></button>
                <button className="absolute left-4 md:left-12 text-[#D4AF37] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length) }}><ChevronLeft size={32} /></button>
                <button className="absolute right-4 md:right-12 text-[#D4AF37] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length) }}><ChevronRight size={32} /></button>
                <motion.img key={lightbox} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  src={gallery[lightbox].url} alt="" className="max-w-[90vw] max-h-[85vh] object-contain border-4 border-[#D4AF37]/30" onClick={(e) => e.stopPropagation()} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* EVENTS */}
      {events.length > 0 && (
        <section className="py-20 md:py-32 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <Mandala className="mx-auto mb-6 text-[#8B0000]/50" size={70} />
              <div className="text-[#8B0000] tracking-[0.4em] text-xs uppercase mb-4">॥ Celebrations ॥</div>
              <h2 className="font-serif text-5xl md:text-6xl text-[#3A0F0F]">Join the festivities</h2>
              <Divider className="max-w-md mx-auto mt-8" />
            </div>
            <div className="space-y-8">
              {events.map((ev, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
                  className="flex flex-col md:flex-row gap-6 bg-[#FFF8DC]/80 border-2 border-[#D4AF37]/40 p-6 relative">
                  <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
                  <div className="md:w-44 flex-shrink-0">
                    <div className="bg-[#8B0000] text-[#FFF8DC] aspect-square flex flex-col items-center justify-center p-4 relative border-2 border-[#D4AF37]/60">
                      <div className="absolute inset-1 border border-[#D4AF37]/40" />
                      <div className="text-xs tracking-[0.3em] text-[#D4AF37]">{fmtMo(ev.date)}</div>
                      <div className="font-serif text-5xl my-1">{fmtDay(ev.date)}</div>
                      <div className="text-xs tracking-[0.3em] text-[#D4AF37]">{new Date(ev.date).getFullYear()}</div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-3xl md:text-4xl text-[#8B0000] mb-2">{ev.name}</h3>
                    <Paisley className="text-[#D4AF37] mb-3" size={24} />
                    <div className="flex flex-wrap gap-4 text-sm text-[#8B0000] mb-3">
                      {ev.startTime && <span className="flex items-center gap-2"><Clock size={14} /> {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}</span>}
                      {ev.venue && <span className="flex items-center gap-2"><MapPin size={14} /> {ev.venue}</span>}
                    </div>
                    {ev.address && <p className="text-[#3A0F0F]/80 mb-3">{ev.address}</p>}
                    {ev.description && <p className="text-[#3A0F0F]/75 leading-relaxed mb-4">{ev.description}</p>}
                    {ev.mapsLink && (
                      <a href={ev.mapsLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs tracking-widest uppercase border-2 border-[#8B0000] text-[#8B0000] px-5 py-2 hover:bg-[#8B0000] hover:text-[#FFF8DC] transition">
                        Get directions <MapPin size={12} />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* RSVP */}
      {wedding.rsvpSettings?.enabled !== false && <RoyalRSVP wedding={wedding} />}

      {/* GIFT REGISTRY */}
      {wedding.advancedSettings?.giftRegistryLink && (
        <section className="py-20 px-4 text-center">
          <Gift className="w-8 h-8 text-[#8B0000] mx-auto mb-4" />
          <h2 className="font-serif text-3xl md:text-4xl text-[#3A0F0F] mb-4">With our gratitude</h2>
          <p className="text-[#3A0F0F]/70 mb-8 max-w-xl mx-auto">Your blessings are our greatest gift. Should you wish to celebrate further, our registry awaits.</p>
          <a href={wedding.advancedSettings.giftRegistryLink} target="_blank" rel="noreferrer"
            className="inline-block bg-[#8B0000] text-[#FFF8DC] border-2 border-[#D4AF37] px-10 py-4 text-xs tracking-widest uppercase hover:bg-[#6B0000]">
            View Registry
          </a>
        </section>
      )}

      {/* FOOTER */}
      <footer className="py-16 px-4 text-center bg-[#3A0F0F] text-[#FFF8DC]">
        <Paisley className="w-8 h-8 text-[#D4AF37] mx-auto mb-4" size={40} />
        <div className="font-serif text-3xl mb-2">{wedding.brideName} <span className="italic text-[#D4AF37]">~</span> {wedding.groomName}</div>
        <div className="text-sm tracking-widest text-[#D4AF37] uppercase mb-8">{fmt(wedding.weddingDate)}</div>
        {wedding.advancedSettings?.socialMedia?.instagram && (
          <a href={wedding.advancedSettings.socialMedia.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#D4AF37] mb-8"><Instagram size={18} /></a>
        )}
        <Divider className="max-w-xs mx-auto mb-6 opacity-60" />
        <div className="text-xs text-[#D4AF37]/70 tracking-wider">Made with love · <a href="/" className="underline">Powered by Vivoha</a></div>
      </footer>
    </main>
  )
}

function RoyalRSVP({ wedding }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [attending, setAttending] = useState('')
  const [guests, setGuests] = useState(1)
  const [meal, setMeal] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const mealOptions = wedding.rsvpSettings?.mealOptions || []

  async function submit(e) {
    e.preventDefault()
    if (!attending) { toast.error('Please let us know'); return }
    if (!phone.trim()) { toast.error('WhatsApp number is required'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingSlug: wedding.slug, name, email, phone, attending,
          guests: Number(guests), mealPreferences: meal ? [meal] : [], message,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setSuccess(true)
    } catch (err) { toast.error(err.message) } finally { setSubmitting(false) }
  }

  return (
    <section id="rsvp" className="py-20 md:py-32 px-4 bg-[#8B0000] text-[#FFF8DC] relative overflow-hidden">
      <Mandala className="absolute -top-20 -left-20 text-[#D4AF37]/10" size={300} />
      <Mandala className="absolute -bottom-20 -right-20 text-[#D4AF37]/10" size={300} />
      <div className="container mx-auto max-w-2xl relative z-10">
        <div className="text-center mb-12">
          <Paisley className="mx-auto mb-4 text-[#D4AF37]" size={40} />
          <div className="text-[#D4AF37] tracking-[0.4em] text-xs uppercase mb-3">॥ RSVP ॥</div>
          <h2 className="font-serif text-5xl md:text-6xl">Bless us with your presence</h2>
          {wedding.rsvpSettings?.deadline && (
            <p className="mt-4 text-[#D4AF37] text-sm">Kindly respond by {fmt(wedding.rsvpSettings.deadline)}</p>
          )}
        </div>

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="border-2 border-[#D4AF37] p-12 text-center bg-[#FFF8DC]/5">
            <Check className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
            <h3 className="font-serif text-3xl mb-3">Thank you</h3>
            <p>Your blessings have been received. We eagerly await your presence.</p>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="space-y-6 border-2 border-[#D4AF37]/40 p-6 md:p-10 bg-[#3A0F0F]/40">
            <div>
              <label className="text-xs tracking-widest uppercase text-[#D4AF37] block mb-2">Your name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b border-[#D4AF37]/50 py-3 focus:outline-none focus:border-[#FFF8DC]" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs tracking-widest uppercase text-[#D4AF37] block mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-[#D4AF37]/50 py-3 focus:outline-none focus:border-[#FFF8DC]" />
              </div>
              <div>
                <label className="text-xs tracking-widest uppercase text-[#D4AF37] block mb-2">WhatsApp Number *</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent border-b border-[#D4AF37]/50 py-3 focus:outline-none focus:border-[#FFF8DC]" />
              </div>
            </div>
            <div>
              <label className="text-xs tracking-widest uppercase text-[#D4AF37] block mb-3">Can you attend? *</label>
              <div className="grid grid-cols-3 gap-3">
                {[{ v: 'yes', l: 'Joyfully' }, { v: 'maybe', l: 'Maybe' }, { v: 'no', l: 'Regretfully' }].map((o) => (
                  <button type="button" key={o.v} onClick={() => setAttending(o.v)}
                    className={`py-3 sm:py-4 px-1 text-[10px] sm:text-xs leading-tight tracking-wider sm:tracking-widest uppercase border-2 transition break-words ${attending === o.v ? 'bg-[#D4AF37] text-[#3A0F0F] border-[#D4AF37]' : 'border-[#D4AF37]/40 hover:border-[#D4AF37]'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            {attending === 'yes' && (
              <>
                <div>
                  <label className="text-xs tracking-widest uppercase text-[#D4AF37] block mb-2">Number of guests</label>
                  <input type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(e.target.value)}
                    className="w-full bg-transparent border-b border-[#D4AF37]/50 py-3 focus:outline-none focus:border-[#FFF8DC]" />
                </div>
                {mealOptions.length > 0 && (
                  <div>
                    <label className="text-xs tracking-widest uppercase text-[#D4AF37] block mb-3">Meal preference</label>
                    <div className="flex flex-wrap gap-2">
                      {mealOptions.map((m) => (
                        <button type="button" key={m} onClick={() => setMeal(m)}
                          className={`px-5 py-2 text-xs tracking-widest uppercase border-2 transition ${meal === m ? 'bg-[#D4AF37] text-[#3A0F0F] border-[#D4AF37]' : 'border-[#D4AF37]/40 hover:border-[#D4AF37]'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div>
              <label className="text-xs tracking-widest uppercase text-[#D4AF37] block mb-2">A blessing for the couple</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                className="w-full bg-transparent border-b border-[#D4AF37]/50 py-3 focus:outline-none focus:border-[#FFF8DC] resize-none" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full bg-[#D4AF37] hover:bg-[#FFF8DC] text-[#3A0F0F] py-5 tracking-widest text-xs uppercase transition border-2 border-[#D4AF37]">
              {submitting ? 'Sending…' : 'Send Blessings'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

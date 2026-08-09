'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Clock, Calendar, Check, ChevronLeft, ChevronRight, X, Gift, Instagram, Sparkles, Moon } from 'lucide-react'
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

// ===== MUGHAL ARCH (jharokha) =====
const MughalArch = ({ className = '', size = 200, stroke = 1.2 }) => (
  <svg viewBox="0 0 100 140" width={size} height={(size * 140) / 100} className={className} fill="none" stroke="currentColor" strokeWidth={stroke} preserveAspectRatio="xMidYMid meet">
    {/* Outer arch */}
    <path d="M10 140 V60 Q10 30 30 22 Q40 18 50 16 Q60 18 70 22 Q90 30 90 60 V140" />
    {/* Inner arch */}
    <path d="M18 140 V64 Q18 38 34 30 Q42 26 50 24 Q58 26 66 30 Q82 38 82 64 V140" opacity="0.6" />
    {/* Top finial */}
    <line x1="50" y1="16" x2="50" y2="6" />
    <circle cx="50" cy="4" r="2" fill="currentColor" />
    {/* Corner ornaments */}
    <circle cx="20" cy="60" r="2" fill="currentColor" />
    <circle cx="80" cy="60" r="2" fill="currentColor" />
  </svg>
)
// Crescent moon + star
const CrescentStar = ({ className = '', size = 60 }) => (
  <svg viewBox="0 0 80 80" width={size} height={size} className={className} fill="none">
    <path d="M55 14 A26 26 0 1 0 55 66 A20 20 0 1 1 55 14 Z" fill="currentColor" />
    <g stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.9">
      <path d="M16 28 L18 32 L22 33 L18 35 L16 39 L14 35 L10 33 L14 32 Z" />
      <path d="M22 50 L23 52 L25 53 L23 54 L22 56 L21 54 L19 53 L21 52 Z" opacity="0.7" />
    </g>
  </svg>
)
// Star sprinkle
const Star = ({ className = '', size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
    <path d="M12 2 L13.5 9 L20.5 10 L15 14.5 L17 21 L12 17 L7 21 L9 14.5 L3.5 10 L10.5 9 Z" opacity="0.9" />
  </svg>
)
const ArchDivider = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-4 ${className}`}>
    <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, #D7CFA3, #D7CFA3)' }} />
    <Star className="text-[#D7CFA3]" size={14} />
    <CrescentStar className="text-[#D7CFA3]" size={28} />
    <Star className="text-[#D7CFA3]" size={14} />
    <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, #D7CFA3, #D7CFA3)' }} />
  </div>
)

// ===== STARFIELD =====
function Starfield({ count = 80, color = '#FFFFFF' }) {
  const stars = useMemo(() => Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    delay: Math.random() * 4,
    duration: 2 + Math.random() * 3,
    opacity: 0.3 + Math.random() * 0.7,
  })), [count])
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s, i) => (
        <motion.div key={i}
          initial={{ opacity: s.opacity * 0.3 }}
          animate={{ opacity: [s.opacity * 0.2, s.opacity, s.opacity * 0.2] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity }}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: color,
            borderRadius: '50%',
            boxShadow: `0 0 ${s.size * 2}px ${color}`,
          }}
        />
      ))}
    </div>
  )
}

// ===== SHOOTING STAR =====
function ShootingStars({ count = 2 }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(count)].map((_, i) => (
        <motion.div key={i}
          initial={{ x: '-10vw', y: `${10 + i * 30}vh`, opacity: 0 }}
          animate={{ x: '110vw', y: `${30 + i * 30}vh`, opacity: [0, 1, 0] }}
          transition={{ duration: 2.5, delay: 4 + i * 7, repeat: Infinity, repeatDelay: 9 + i * 4, ease: 'easeOut' }}
          className="absolute h-px bg-gradient-to-r from-transparent via-white to-transparent"
          style={{ width: '180px', boxShadow: '0 0 8px rgba(215,207,163,0.8)' }}
        />
      ))}
    </div>
  )
}

export default function SapphireSagaTemplate({ wedding }) {
  const [lightbox, setLightbox] = useState(null)
  const cd = useCountdown(wedding.weddingDate)
  const heroUrl = wedding.heroImage?.url
  const gallery = wedding.gallery || []
  const events = wedding.events || []

  return (
    <main className="min-h-screen text-[#EAE4D2]" style={{
      background: 'radial-gradient(ellipse at top, #1A2752 0%, #0B1029 60%, #050817 100%)',
    }}>
      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {heroUrl ? (
          <>
            <motion.img initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 2.8, ease: 'easeOut' }}
              src={heroUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'brightness(0.55) saturate(1.05) hue-rotate(-10deg)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(11,16,41,0.4) 0%, rgba(11,16,41,0.5) 50%, rgba(5,8,23,0.95) 100%)' }} />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, #1A2752, #0B1029, #050817)' }} />
        )}

        <Starfield count={120} color="#FFFFFF" />
        <ShootingStars count={2} />

        {/* Large mughal arch behind text */}
        <div className="absolute inset-0 flex items-end justify-center pointer-events-none pb-12">
          <MughalArch className="text-[#D7CFA3]/15" size={500} stroke={1.5} />
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4, delay: 0.5 }}
          className="relative z-10 text-center px-6 max-w-5xl">
          <motion.div initial={{ scale: 0, rotate: 180 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 1.2, delay: 0.3 }}>
            <CrescentStar className="mx-auto mb-6 text-[#D7CFA3]" size={56} />
          </motion.div>
          <div className="text-[#D7CFA3] tracking-[0.5em] text-[10px] md:text-xs uppercase mb-4">Beneath a thousand stars</div>
          <ArchDivider className="max-w-sm mx-auto mb-8 opacity-70" />
          <h1 className="font-serif font-light leading-[0.95] text-[#FFF8E7] mb-2"
            style={{ fontSize: 'clamp(3.5rem, 9vw, 8.5rem)', textShadow: '0 0 60px rgba(215,207,163,0.3)' }}>
            {wedding.brideName}
          </h1>
          <div className="my-4 flex items-center justify-center gap-4">
            <div className="h-px w-12 md:w-20" style={{ background: 'linear-gradient(to right, transparent, #D7CFA3)' }} />
            <span className="font-serif italic text-2xl md:text-4xl text-[#D7CFA3]">&amp;</span>
            <div className="h-px w-12 md:w-20" style={{ background: 'linear-gradient(to left, transparent, #D7CFA3)' }} />
          </div>
          <h1 className="font-serif font-light leading-[0.95] text-[#FFF8E7] mb-8"
            style={{ fontSize: 'clamp(3.5rem, 9vw, 8.5rem)', textShadow: '0 0 60px rgba(215,207,163,0.3)' }}>
            {wedding.groomName}
          </h1>
          {wedding.tagline && (
            <p className="font-serif italic text-xl md:text-2xl text-[#EAE4D2]/85 max-w-2xl mx-auto mb-8">"{wedding.tagline}"</p>
          )}
          <ArchDivider className="max-w-md mx-auto mb-8 opacity-80" />
          <div className="inline-flex items-center gap-3 text-[#D7CFA3] tracking-[0.3em] uppercase text-xs">
            <Calendar className="w-4 h-4" />
            <span>{fmt(wedding.weddingDate)}</span>
          </div>
        </motion.div>
      </section>

      {/* COUNTDOWN */}
      {!cd.done && (
        <section className="py-20 md:py-28 px-4 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #050817, #0B1029)' }}>
          <Starfield count={40} color="#D7CFA3" />
          <div className="container mx-auto max-w-5xl relative z-10">
            <div className="text-center mb-12">
              <Sparkles className="mx-auto mb-4 text-[#D7CFA3]" size={28} />
              <div className="text-[#D7CFA3] tracking-[0.4em] text-xs uppercase mb-3">Awaiting the stars</div>
              <h2 className="font-serif font-light text-4xl md:text-6xl text-[#FFF8E7]">Until our constellation</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[{ v: cd.days, l: 'Days' }, { v: cd.hours, l: 'Hours' }, { v: cd.minutes, l: 'Minutes' }, { v: cd.seconds, l: 'Seconds' }].map((u, i) => (
                <motion.div key={u.l}
                  initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="relative aspect-square flex flex-col items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(26,39,82,0.6), rgba(11,16,41,0.8))',
                    border: '1px solid rgba(215,207,163,0.3)',
                    boxShadow: '0 8px 32px -8px rgba(0,0,0,0.5), inset 0 0 40px rgba(215,207,163,0.05)',
                  }}>
                  <div className="absolute top-2 left-2"><Star className="text-[#D7CFA3]/40" size={10} /></div>
                  <div className="absolute top-2 right-2"><Star className="text-[#D7CFA3]/40" size={10} /></div>
                  <div className="absolute bottom-2 left-2"><Star className="text-[#D7CFA3]/40" size={10} /></div>
                  <div className="absolute bottom-2 right-2"><Star className="text-[#D7CFA3]/40" size={10} /></div>
                  <div className="font-serif text-5xl md:text-7xl font-light text-[#FFF8E7]" style={{ textShadow: '0 0 20px rgba(215,207,163,0.4)' }}>{String(u.v).padStart(2, '0')}</div>
                  <div className="text-[10px] md:text-xs tracking-[0.3em] uppercase mt-2 text-[#D7CFA3]">{u.l}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* STORY */}
      {wedding.story && (
        <section className="py-20 md:py-32 px-4 relative">
          <Starfield count={30} color="#D7CFA3" />
          <div className="container mx-auto max-w-3xl relative z-10 text-center">
            <CrescentStar className="mx-auto mb-6 text-[#D7CFA3]" size={50} />
            <div className="text-[#D7CFA3] tracking-[0.4em] text-xs uppercase mb-4">Our saga</div>
            <h2 className="font-serif font-light text-5xl md:text-6xl text-[#FFF8E7] mb-4">Written in the sky</h2>
            <ArchDivider className="max-w-md mx-auto mb-12" />
            <div className="relative p-8 md:p-14"
              style={{
                background: 'linear-gradient(180deg, rgba(26,39,82,0.5), rgba(11,16,41,0.7))',
                border: '1px solid rgba(215,207,163,0.25)',
                clipPath: 'polygon(0 24px, 24px 0, calc(100% - 24px) 0, 100% 24px, 100% calc(100% - 24px), calc(100% - 24px) 100%, 24px 100%, 0 calc(100% - 24px))',
              }}>
              <MughalArch className="absolute -top-12 left-1/2 -translate-x-1/2 text-[#D7CFA3]/30 hidden md:block" size={80} />
              <div className="font-serif text-lg md:text-xl text-[#EAE4D2] leading-relaxed whitespace-pre-line text-left">
                <span className="float-left font-serif text-7xl leading-none mr-3 mt-1 text-[#D7CFA3]">{wedding.story.charAt(0)}</span>
                {wedding.story.slice(1)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* GALLERY */}
      {gallery.length > 0 && (
        <section className="py-20 md:py-32 px-4 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #0B1029, #050817)' }}>
          <Starfield count={60} color="#FFFFFF" />
          <div className="container mx-auto relative z-10">
            <div className="text-center mb-16">
              <Sparkles className="mx-auto mb-4 text-[#D7CFA3]" size={28} />
              <div className="text-[#D7CFA3] tracking-[0.4em] text-xs uppercase mb-3">Frames in time</div>
              <h2 className="font-serif font-light text-5xl md:text-6xl text-[#FFF8E7]">Our constellation</h2>
              <ArchDivider className="max-w-md mx-auto mt-8" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {gallery.map((g, i) => (
                <motion.button key={g.publicId || i}
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: (i % 8) * 0.05 }}
                  onClick={() => setLightbox(i)}
                  className={`relative overflow-hidden group ${i % 5 === 0 ? 'md:row-span-2 aspect-square md:aspect-[3/4]' : 'aspect-square'}`}
                  style={{
                    border: '1px solid rgba(215,207,163,0.3)',
                    boxShadow: '0 10px 30px -10px rgba(0,0,0,0.6)',
                  }}>
                  <img src={g.url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050817]/60 to-transparent" />
                  <div className="absolute inset-0 bg-[#1A2752]/0 group-hover:bg-[#1A2752]/30 transition" />
                  <div className="absolute top-2 right-2"><Star className="text-[#D7CFA3]/50" size={12} /></div>
                </motion.button>
              ))}
            </div>
          </div>
          <AnimatePresence>
            {lightbox !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-[#050817]/98 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
                <Starfield count={50} color="#D7CFA3" />
                <button className="absolute top-6 right-6 text-[#D7CFA3]" onClick={() => setLightbox(null)}><X /></button>
                <button className="absolute left-4 md:left-12 text-[#D7CFA3] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length) }}><ChevronLeft size={32} /></button>
                <button className="absolute right-4 md:right-12 text-[#D7CFA3] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length) }}><ChevronRight size={32} /></button>
                <motion.img key={lightbox} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  src={gallery[lightbox].url} alt="" className="max-w-[90vw] max-h-[85vh] object-contain"
                  style={{ border: '1px solid rgba(215,207,163,0.5)' }} onClick={(e) => e.stopPropagation()} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* EVENTS — under jharokha arches */}
      {events.length > 0 && (
        <section className="py-20 md:py-32 px-4 relative">
          <Starfield count={40} color="#D7CFA3" />
          <div className="container mx-auto max-w-6xl relative z-10">
            <div className="text-center mb-16">
              <Moon className="mx-auto mb-4 text-[#D7CFA3]" size={32} />
              <div className="text-[#D7CFA3] tracking-[0.4em] text-xs uppercase mb-3">Royal festivities</div>
              <h2 className="font-serif font-light text-5xl md:text-6xl text-[#FFF8E7]">Join the saga</h2>
              <ArchDivider className="max-w-md mx-auto mt-8" />
            </div>
            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              {events.map((ev, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.1 }}
                  className="relative pt-16 px-6 pb-8 text-center"
                  style={{
                    background: 'linear-gradient(180deg, rgba(26,39,82,0.4), rgba(11,16,41,0.7))',
                    borderRadius: '120px 120px 8px 8px',
                    border: '1px solid rgba(215,207,163,0.25)',
                    boxShadow: '0 20px 50px -20px rgba(0,0,0,0.6), inset 0 0 60px rgba(215,207,163,0.04)',
                  }}>
                  <MughalArch className="absolute top-0 left-1/2 -translate-x-1/2 text-[#D7CFA3]/30" size={140} stroke={1} />
                  <div className="relative z-10 pt-2">
                    <div className="text-xs tracking-[0.4em] uppercase text-[#D7CFA3] mb-2">Chapter {String(i + 1).padStart(2, '0')}</div>
                    <h3 className="font-serif text-3xl md:text-4xl text-[#FFF8E7] mb-3 font-light">{ev.name}</h3>
                    <div className="inline-block px-4 py-1 mb-4 text-xs tracking-[0.3em] uppercase text-[#D7CFA3]" style={{ border: '1px solid rgba(215,207,163,0.4)' }}>
                      {fmtDay(ev.date)} {fmtMo(ev.date)} {new Date(ev.date).getFullYear()}
                    </div>
                    <div className="space-y-2 mb-4 text-sm text-[#EAE4D2]/85">
                      {ev.startTime && (
                        <div className="flex items-center justify-center gap-2">
                          <Clock size={14} className="text-[#D7CFA3]" />
                          {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}
                        </div>
                      )}
                      {ev.venue && (
                        <div className="flex items-center justify-center gap-2">
                          <MapPin size={14} className="text-[#D7CFA3]" />
                          {ev.venue}
                        </div>
                      )}
                    </div>
                    {ev.address && <p className="text-[#EAE4D2]/65 text-sm mb-3 italic">{ev.address}</p>}
                    {ev.description && <p className="text-[#EAE4D2]/80 leading-relaxed mb-4">{ev.description}</p>}
                    {ev.mapsLink && (
                      <a href={ev.mapsLink} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs tracking-widest uppercase px-5 py-2 text-[#D7CFA3] transition hover:bg-[#D7CFA3] hover:text-[#0B1029]"
                        style={{ border: '1px solid #D7CFA3' }}>
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
      {wedding.rsvpSettings?.enabled !== false && <SapphireRSVP wedding={wedding} />}

      {/* GIFT REGISTRY */}
      {wedding.advancedSettings?.giftRegistryLink && (
        <section className="py-20 px-4 text-center relative" style={{ background: '#0B1029' }}>
          <Starfield count={30} color="#D7CFA3" />
          <div className="relative z-10">
            <Gift className="w-8 h-8 text-[#D7CFA3] mx-auto mb-4" />
            <h2 className="font-serif font-light text-4xl md:text-5xl text-[#FFF8E7] mb-4">A star from you</h2>
            <p className="text-[#EAE4D2]/75 mb-10 max-w-xl mx-auto italic">Your presence outshines any gift. Should you wish to add a star, our registry awaits.</p>
            <a href={wedding.advancedSettings.giftRegistryLink} target="_blank" rel="noreferrer"
              className="inline-block px-10 py-4 text-xs tracking-widest uppercase text-[#0B1029] hover:bg-[#FFF8E7]"
              style={{ background: '#D7CFA3', border: '1px solid #D7CFA3' }}>
              View Registry
            </a>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="py-20 px-4 text-center relative overflow-hidden">
        <Starfield count={40} color="#D7CFA3" />
        <div className="relative z-10">
          <CrescentStar className="mx-auto mb-4 text-[#D7CFA3]" size={50} />
          <div className="font-serif text-3xl text-[#FFF8E7] mb-2">
            {wedding.brideName} <span className="italic text-[#D7CFA3]">&amp;</span> {wedding.groomName}
          </div>
          <div className="text-sm tracking-[0.3em] text-[#D7CFA3] uppercase mb-8">{fmt(wedding.weddingDate)}</div>
          {wedding.advancedSettings?.socialMedia?.instagram && (
            <a href={wedding.advancedSettings.socialMedia.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#D7CFA3] mb-8"><Instagram size={18} /></a>
          )}
          <ArchDivider className="max-w-xs mx-auto mb-6 opacity-60" />
          <div className="text-xs text-[#D7CFA3]/70 tracking-wider italic">Beneath the same stars · <a href="/" className="underline">Powered by Vivoha</a></div>
        </div>
      </footer>
    </main>
  )
}

function SapphireRSVP({ wedding }) {
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
    if (!attending) { toast.error('Please choose'); return }
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
    <section id="rsvp" className="py-20 md:py-32 px-4 relative overflow-hidden" style={{
      background: 'linear-gradient(180deg, #0B1029, #1A2752, #0B1029)',
    }}>
      <Starfield count={80} color="#D7CFA3" />
      <ShootingStars count={1} />
      <div className="container mx-auto max-w-2xl relative z-10">
        <div className="text-center mb-12">
          <CrescentStar className="mx-auto mb-4 text-[#D7CFA3]" size={50} />
          <div className="text-[#D7CFA3] tracking-[0.4em] text-xs uppercase mb-3">RSVP</div>
          <h2 className="font-serif font-light text-5xl md:text-6xl text-[#FFF8E7]">Add your light</h2>
          {wedding.rsvpSettings?.deadline && (
            <p className="mt-4 text-[#D7CFA3] text-sm italic">Please respond by {fmt(wedding.rsvpSettings.deadline)}</p>
          )}
        </div>

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="p-12 text-center"
            style={{
              background: 'linear-gradient(180deg, rgba(26,39,82,0.6), rgba(11,16,41,0.8))',
              border: '1px solid #D7CFA3',
            }}>
            <Sparkles className="w-12 h-12 text-[#D7CFA3] mx-auto mb-4" />
            <h3 className="font-serif text-4xl mb-3 text-[#FFF8E7] font-light">A new star is lit</h3>
            <p className="text-[#EAE4D2]/85">Your light joins our constellation. We cannot wait.</p>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="space-y-6 p-6 md:p-10"
            style={{
              background: 'linear-gradient(180deg, rgba(26,39,82,0.6), rgba(11,16,41,0.7))',
              border: '1px solid rgba(215,207,163,0.3)',
            }}>
            <div>
              <label className="text-xs tracking-widest uppercase text-[#D7CFA3] block mb-2">Your name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b border-[#D7CFA3]/30 py-3 focus:outline-none focus:border-[#D7CFA3] text-[#FFF8E7]" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs tracking-widest uppercase text-[#D7CFA3] block mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-[#D7CFA3]/30 py-3 focus:outline-none focus:border-[#D7CFA3] text-[#FFF8E7]" />
              </div>
              <div>
                <label className="text-xs tracking-widest uppercase text-[#D7CFA3] block mb-2">WhatsApp Number *</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent border-b border-[#D7CFA3]/30 py-3 focus:outline-none focus:border-[#D7CFA3] text-[#FFF8E7]" />
              </div>
            </div>
            <div>
              <label className="text-xs tracking-widest uppercase text-[#D7CFA3] block mb-3">Will you attend? *</label>
              <div className="grid grid-cols-3 gap-3">
                {[{ v: 'yes', l: 'Joyfully' }, { v: 'maybe', l: 'Maybe' }, { v: 'no', l: 'Regretfully' }].map((o) => (
                  <button type="button" key={o.v} onClick={() => setAttending(o.v)}
                    className="py-3 sm:py-4 px-1 text-[10px] sm:text-xs leading-tight tracking-wider sm:tracking-widest uppercase transition break-words"
                    style={{
                      background: attending === o.v ? '#D7CFA3' : 'transparent',
                      color: attending === o.v ? '#0B1029' : '#EAE4D2',
                      border: `1px solid ${attending === o.v ? '#D7CFA3' : 'rgba(215,207,163,0.3)'}`,
                    }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            {attending === 'yes' && (
              <>
                <div>
                  <label className="text-xs tracking-widest uppercase text-[#D7CFA3] block mb-2">Guests</label>
                  <input type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(e.target.value)}
                    className="w-full bg-transparent border-b border-[#D7CFA3]/30 py-3 focus:outline-none focus:border-[#D7CFA3] text-[#FFF8E7]" />
                </div>
                {mealOptions.length > 0 && (
                  <div>
                    <label className="text-xs tracking-widest uppercase text-[#D7CFA3] block mb-3">Meal</label>
                    <div className="flex flex-wrap gap-2">
                      {mealOptions.map((m) => (
                        <button type="button" key={m} onClick={() => setMeal(m)}
                          className="px-5 py-2 text-xs tracking-widest uppercase transition"
                          style={{
                            background: meal === m ? '#D7CFA3' : 'transparent',
                            color: meal === m ? '#0B1029' : '#EAE4D2',
                            border: `1px solid ${meal === m ? '#D7CFA3' : 'rgba(215,207,163,0.3)'}`,
                          }}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div>
              <label className="text-xs tracking-widest uppercase text-[#D7CFA3] block mb-2">A wish under the stars</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                className="w-full bg-transparent border-b border-[#D7CFA3]/30 py-3 focus:outline-none focus:border-[#D7CFA3] resize-none text-[#FFF8E7]" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-5 tracking-widest text-xs uppercase transition hover:opacity-90"
              style={{ background: '#D7CFA3', color: '#0B1029' }}>
              {submitting ? 'Sending starlight…' : 'Add Your Star'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

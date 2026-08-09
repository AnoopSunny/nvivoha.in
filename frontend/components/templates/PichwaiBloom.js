'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Clock, Calendar, Check, ChevronLeft, ChevronRight, X, Gift, Instagram } from 'lucide-react'
import { toast } from 'sonner'

// ===== PALETTE =====
// indigo    #1E3A5F   deep royal indigo
// ochre     #D4A017   mustard ochre gold
// lotus     #E8839E   lotus pink
// cream     #FBF6E9   antique paper cream
// sage      #7A8B5F   pichwai olive sage

// ===== UTILS =====
function useCountdown(target) {
  const [now, setNow] = useState(0)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true); setNow(Date.now())
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
const IST = 'Asia/Kolkata'
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: IST }) } catch { return d } }
const fmtTime = (d) => {
  try {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return ''
    return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST })
  } catch { return '' }
}
const hasTime = (d) => {
  try {
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return false
    const istHHmm = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: IST })
    return istHHmm !== '00:00'
  } catch { return false }
}
const fmtMonth = (d) => { try { return new Date(d).toLocaleDateString('en-US', { month: 'short', timeZone: IST }).toUpperCase() } catch { return '' } }
const fmtDay = (d) => { try { return new Date(d).toLocaleDateString('en-US', { day: 'numeric', timeZone: IST }) } catch { return '' } }

// ===== SVG MOTIFS =====
const Lotus = ({ className = '' }) => (
  <svg viewBox="0 0 120 100" className={className} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" aria-hidden>
    {/* Outer petals */}
    <path d="M60 90 Q10 70 14 40 Q34 50 60 90" />
    <path d="M60 90 Q110 70 106 40 Q86 50 60 90" />
    {/* Mid petals */}
    <path d="M60 88 Q26 64 32 30 Q48 44 60 88" />
    <path d="M60 88 Q94 64 88 30 Q72 44 60 88" />
    {/* Center petal */}
    <path d="M60 86 Q46 60 50 24 Q60 36 60 86" />
    <path d="M60 86 Q74 60 70 24 Q60 36 60 86" />
    {/* Stamens */}
    <path d="M60 80 L60 92" strokeWidth="0.8" />
    <circle cx="60" cy="50" r="2.4" fill="currentColor" />
    <circle cx="56" cy="56" r="1.6" fill="currentColor" />
    <circle cx="64" cy="56" r="1.6" fill="currentColor" />
  </svg>
)

const Peacock = ({ className = '' }) => (
  <svg viewBox="0 0 180 160" className={className} fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
    {/* Plumage fan */}
    {Array.from({ length: 13 }).map((_, i) => {
      const angle = -75 + i * 12.5
      const rad = (angle * Math.PI) / 180
      const x = 90 + Math.sin(rad) * 78
      const y = 100 - Math.cos(rad) * 78
      return (
        <g key={i}>
          <path d={`M90 100 Q${90 + Math.sin(rad) * 40} ${100 - Math.cos(rad) * 40} ${x} ${y}`} />
          <circle cx={x} cy={y} r="6" fill="currentColor" opacity="0.85" />
          <circle cx={x} cy={y} r="2.5" fill="#FBF6E9" />
        </g>
      )
    })}
    {/* Body */}
    <ellipse cx="90" cy="110" rx="14" ry="26" fill="currentColor" opacity="0.8" />
    {/* Head */}
    <circle cx="90" cy="84" r="10" fill="currentColor" />
    {/* Crest */}
    <path d="M90 74 L88 68" strokeWidth="1" />
    <path d="M90 74 L92 68" strokeWidth="1" />
    <circle cx="88" cy="67" r="1.4" fill="currentColor" />
    <circle cx="92" cy="67" r="1.4" fill="currentColor" />
    <path d="M90 74 L90 66" strokeWidth="1" />
    <circle cx="90" cy="65" r="1.4" fill="currentColor" />
    {/* Beak */}
    <path d="M90 88 L96 92" strokeWidth="1.4" />
    {/* Feet */}
    <path d="M84 136 L80 144 M84 136 L86 144 M96 136 L100 144 M96 136 L94 144" />
  </svg>
)

const Haveli = ({ className = '' }) => (
  // Mughal jharokha arched window outline
  <svg viewBox="0 0 100 140" className={className} fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
    <path d="M10 138 L10 60 Q10 20 50 12 Q90 20 90 60 L90 138" />
    <path d="M16 138 L16 60 Q16 26 50 18 Q84 26 84 60 L84 138" />
    <path d="M22 138 L22 60 Q22 32 50 24 Q78 32 78 60 L78 138" />
    {/* Inner star */}
    <path d="M50 60 L52 66 L58 66 L53 70 L55 76 L50 72 L45 76 L47 70 L42 66 L48 66 Z" fill="currentColor" />
  </svg>
)

const Paisley = ({ className = '' }) => (
  <svg viewBox="0 0 60 80" className={className} fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
    <path d="M30 8 Q56 24 40 56 Q30 72 18 64 Q8 56 16 40 Q22 28 30 24" />
    <path d="M30 24 Q44 32 36 52" strokeWidth="0.8" />
    <circle cx="22" cy="56" r="2" fill="currentColor" />
    <path d="M16 64 Q18 68 22 68" strokeWidth="0.8" />
  </svg>
)

const Bansuri = ({ className = '' }) => (
  // Krishna's flute
  <svg viewBox="0 0 120 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
    <rect x="6" y="8" width="108" height="8" rx="4" />
    <circle cx="30" cy="12" r="1.4" fill="currentColor" />
    <circle cx="48" cy="12" r="1.4" fill="currentColor" />
    <circle cx="66" cy="12" r="1.4" fill="currentColor" />
    <circle cx="84" cy="12" r="1.4" fill="currentColor" />
    <path d="M0 12 L6 8 L6 16 Z" fill="currentColor" />
  </svg>
)

const Cow = ({ className = '' }) => (
  // Sacred cow silhouette (small, simple)
  <svg viewBox="0 0 80 50" className={className} fill="currentColor" aria-hidden>
    <ellipse cx="44" cy="32" rx="22" ry="11" />
    <ellipse cx="22" cy="22" rx="9" ry="8" />
    <rect x="32" y="42" width="2" height="6" />
    <rect x="40" y="42" width="2" height="6" />
    <rect x="50" y="42" width="2" height="6" />
    <rect x="58" y="42" width="2" height="6" />
    <path d="M14 20 L10 12 L14 14 Z" />
    <path d="M30 20 L34 12 L30 14 Z" />
    <circle cx="18" cy="22" r="1" fill="#FBF6E9" />
    <path d="M64 30 Q72 28 70 36" stroke="currentColor" strokeWidth="1.6" fill="none" />
  </svg>
)

// ===== FLOATING LOTUS PETALS =====
function LotusPetals() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  const petals = Array.from({ length: 12 }).map((_, i) => ({
    i,
    left: `${(i * 41) % 100}%`,
    delay: (i * 0.9) % 12,
    duration: 16 + (i % 5) * 4,
    size: 14 + (i % 4) * 6,
  }))
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {petals.map((p) => (
        <motion.div
          key={p.i}
          initial={{ y: -40, x: 0, rotate: 0, opacity: 0 }}
          animate={{ y: '110vh', x: [0, 30, -20, 10], rotate: 360, opacity: [0, 0.85, 0.85, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'linear' }}
          style={{ left: p.left, position: 'absolute', width: p.size, height: p.size, top: 0 }}
        >
          <svg viewBox="0 0 20 20" fill="#E8839E" opacity="0.7">
            <path d="M10 0 Q14 6 10 14 Q6 6 10 0 Z" />
          </svg>
        </motion.div>
      ))}
    </div>
  )
}

// ===== TEMPLATE =====
export default function PichwaiBloomTemplate({ wedding }) {
  const [lightbox, setLightbox] = useState(null)
  const cd = useCountdown(wedding.weddingDate)
  const gallery = wedding.gallery || []
  const events = wedding.events || []

  return (
    <main className="min-h-screen bg-[#FBF6E9] text-[#1E3A5F]" style={{ fontFamily: 'Georgia, "Cormorant Garamond", serif' }}>
      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {wedding.heroImage?.url ? (
          <>
            <motion.img initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 2.4, ease: 'easeOut' }} src={wedding.heroImage.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#1E3A5F]/85 via-[#1E3A5F]/60 to-[#1E3A5F]/90" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#1E3A5F] via-[#2A4A75] to-[#1E3A5F]" />
        )}

        <LotusPetals />

        {/* Peacock plumage at top corners */}
        <Peacock className="absolute -top-6 -left-6 md:-top-2 md:left-4 w-44 md:w-64 text-[#D4A017]/55" />
        <Peacock className="absolute -top-6 -right-6 md:-top-2 md:right-4 w-44 md:w-64 text-[#D4A017]/55 scale-x-[-1]" />

        {/* Haveli frames at bottom corners */}
        <Haveli className="absolute -bottom-2 left-6 md:left-12 w-20 md:w-28 text-[#E8839E]/40" />
        <Haveli className="absolute -bottom-2 right-6 md:right-12 w-20 md:w-28 text-[#E8839E]/40" />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4, delay: 0.4 }} className="relative z-10 text-center px-6 max-w-4xl">
          <div className="text-[#D4A017] tracking-[0.5em] text-[10px] md:text-xs uppercase mb-4">॥ शुभ विवाह ॥</div>
          <div className="text-[#FBF6E9]/80 tracking-[0.3em] text-[10px] uppercase mb-8">A Garden of Forever</div>

          {/* Ornate name layout */}
          <h1 className="text-[#FBF6E9] font-light leading-[0.95]">
            <span className="block font-serif italic text-5xl md:text-7xl lg:text-8xl">{wedding.brideName}</span>
            <span className="inline-flex items-center gap-3 my-4 md:my-5">
              <span className="h-px w-10 md:w-14 bg-[#D4A017]" />
              <Lotus className="w-7 h-7 md:w-9 md:h-9 text-[#E8839E]" />
              <span className="h-px w-10 md:w-14 bg-[#D4A017]" />
            </span>
            <span className="block font-serif italic text-5xl md:text-7xl lg:text-8xl">{wedding.groomName}</span>
          </h1>

          {wedding.tagline && (
            <p className="mt-8 text-[#FBF6E9]/90 italic text-lg md:text-xl max-w-2xl mx-auto">"{wedding.tagline}"</p>
          )}
          <div className="mt-10 inline-flex flex-col items-center gap-2 px-7 py-4 bg-[#D4A017] text-[#1E3A5F]">
            <div className="flex items-center gap-3">
              <Calendar size={14} />
              <span className="tracking-[0.3em] text-xs md:text-sm uppercase font-medium">{fmtDate(wedding.weddingDate)}</span>
            </div>
            {hasTime(wedding.weddingDate) && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-[0.3em] uppercase">Muhurtham</span>
                <span className="font-serif italic text-base">{fmtTime(wedding.weddingDate)}</span>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[#D4A017]/80 text-[10px] tracking-[0.4em] uppercase">
          ↓ Continue
        </motion.div>
      </section>

      {/* ===== LOTUS DIVIDER ===== */}
      <Divider />

      {/* ===== COUNTDOWN ===== */}
      {!cd.done && (
        <section className="relative py-20 md:py-28 px-4 bg-gradient-to-b from-[#FBF6E9] to-[#F5EDD9] overflow-hidden">
          <Paisley className="absolute top-10 left-8 w-16 text-[#D4A017]/25" />
          <Paisley className="absolute bottom-10 right-8 w-16 text-[#D4A017]/25 scale-x-[-1]" />
          <div className="container mx-auto max-w-4xl">
            <SectionHeader eyebrow="The Sacred Hour" title="Until our garden blooms" />
            <div className="grid grid-cols-4 gap-3 md:gap-6 mt-12">
              {[
                { v: cd.days, l: 'Days' }, { v: cd.hours, l: 'Hours' },
                { v: cd.minutes, l: 'Minutes' }, { v: cd.seconds, l: 'Seconds' },
              ].map((u) => (
                <div key={u.l} className="relative flex flex-col items-center justify-center bg-[#1E3A5F] text-[#FBF6E9] py-8 md:py-10" style={{ borderRadius: '50% 50% 8px 8px / 30% 30% 8px 8px' }}>
                  <Lotus className="absolute top-2 w-6 h-6 text-[#E8839E]/60" />
                  <div className="font-serif italic text-4xl md:text-6xl text-[#D4A017] font-light mt-5">{String(u.v).padStart(2, '0')}</div>
                  <div className="text-[9px] md:text-[10px] tracking-[0.3em] uppercase mt-1 text-[#FBF6E9]/80">{u.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== STORY ===== */}
      {wedding.story && (
        <section className="relative py-20 md:py-32 px-4 bg-[#FBF6E9] overflow-hidden">
          <Cow className="absolute top-20 left-8 w-24 text-[#D4A017]/25" />
          <Cow className="absolute bottom-20 right-8 w-24 text-[#D4A017]/25 scale-x-[-1]" />
          <Bansuri className="absolute top-12 right-12 w-28 text-[#7A8B5F]/40 -rotate-12" />
          <div className="container mx-auto max-w-3xl relative">
            <div className="text-center">
              <Lotus className="w-16 h-12 text-[#E8839E] mx-auto mb-4" />
              <SectionHeader eyebrow="Our Pichwai" title="A story painted in lotus" />
            </div>
            <div className="relative mt-12 bg-white border-2 border-[#D4A017] p-8 md:p-14" style={{ borderRadius: '20px' }}>
              <Lotus className="absolute -top-7 left-1/2 -translate-x-1/2 w-12 h-12 text-[#E8839E] bg-[#FBF6E9] p-1" />
              <div className="font-serif italic text-lg md:text-xl text-[#1E3A5F]/90 leading-relaxed whitespace-pre-line text-left">
                <span className="float-left font-serif text-7xl leading-none mr-3 mt-1 text-[#D4A017] not-italic">
                  {wedding.story.charAt(0)}
                </span>
                {wedding.story.slice(1)}
              </div>
              <div className="mt-10 flex items-center justify-center gap-3">
                <div className="h-px w-12 bg-[#D4A017]/50" />
                <Lotus className="w-6 h-5 text-[#E8839E]" />
                <div className="h-px w-12 bg-[#D4A017]/50" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== GALLERY ===== */}
      {gallery.length > 0 && (
        <section className="relative py-20 md:py-32 px-4 bg-[#1E3A5F] text-[#FBF6E9] overflow-hidden">
          <Peacock className="absolute -top-10 -left-8 w-56 text-[#D4A017]/15" />
          <Peacock className="absolute -bottom-12 -right-8 w-56 text-[#D4A017]/15 scale-x-[-1]" />
          <div className="container mx-auto relative">
            <SectionHeader eyebrow="Moments in Bloom" title="A garden of memories" tone="dark" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mt-14">
              {gallery.map((g, i) => (
                <motion.button
                  key={g.publicId || i}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: (i % 8) * 0.04 }}
                  onClick={() => setLightbox(i)}
                  className={`relative overflow-hidden group ${i % 5 === 0 ? 'md:row-span-2 aspect-square md:aspect-[3/4]' : 'aspect-square'}`}
                  style={{ borderRadius: '50% 50% 12px 12px / 28% 28% 12px 12px', border: '2px solid #D4A017' }}
                >
                  <img src={g.url} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-[#1E3A5F]/0 group-hover:bg-[#1E3A5F]/30 transition" />
                </motion.button>
              ))}
            </div>
          </div>
          <AnimatePresence>
            {lightbox !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(null)} className="fixed inset-0 z-50 bg-[#1E3A5F]/97 flex items-center justify-center p-4">
                <button className="absolute top-6 right-6 text-[#D4A017]" onClick={() => setLightbox(null)}><X /></button>
                <button className="absolute left-4 md:left-12 text-[#D4A017] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length) }}><ChevronLeft size={32} /></button>
                <button className="absolute right-4 md:right-12 text-[#D4A017] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length) }}><ChevronRight size={32} /></button>
                <motion.img key={lightbox} initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={gallery[lightbox].url} alt="" onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[85vh] object-contain border-2 border-[#D4A017]" />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* ===== EVENTS ===== */}
      {events.length > 0 && (
        <section className="relative py-20 md:py-32 px-4 bg-[#FBF6E9] overflow-hidden">
          <Haveli className="absolute top-8 left-2 md:left-8 w-20 md:w-28 text-[#E8839E]/30" />
          <Haveli className="absolute bottom-8 right-2 md:right-8 w-20 md:w-28 text-[#E8839E]/30" />
          <div className="container mx-auto max-w-5xl relative">
            <div className="text-center">
              <Peacock className="w-24 h-20 text-[#1E3A5F] mx-auto mb-2" />
              <SectionHeader eyebrow="Wedding Ceremonies" title="Each ritual, a verse" />
            </div>
            <div className="space-y-10 mt-14">
              {events.map((ev, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7 }}
                  className="relative flex flex-col md:flex-row gap-6 bg-white border border-[#D4A017]"
                  style={{ borderRadius: '24px' }}
                >
                  <Lotus className="absolute -top-5 -left-2 w-10 h-10 text-[#E8839E] bg-[#FBF6E9] rounded-full p-0.5" />
                  <div className="md:w-44 flex-shrink-0 bg-[#1E3A5F] text-[#FBF6E9] flex flex-row md:flex-col items-center justify-center p-5 gap-2 md:gap-1" style={{ borderRadius: '24px 0 0 24px' }}>
                    <div className="text-[10px] tracking-[0.3em] text-[#D4A017]">{fmtMonth(ev.date)}</div>
                    <div className="font-serif italic text-5xl font-light text-[#D4A017]">{fmtDay(ev.date)}</div>
                    <div className="text-[10px] tracking-[0.3em] text-[#D4A017]">{new Date(ev.date).getFullYear()}</div>
                  </div>
                  <div className="flex-1 p-6 md:p-8 pr-10">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-serif italic text-3xl md:text-4xl text-[#1E3A5F]">{ev.name}</h3>
                      <Paisley className="w-6 h-8 text-[#D4A017]" />
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-[#7A8B5F] mb-3">
                      {ev.startTime && <span className="flex items-center gap-2"><Clock size={14} /> {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}</span>}
                      {ev.venue && <span className="flex items-center gap-2"><MapPin size={14} /> {ev.venue}</span>}
                    </div>
                    {ev.address && <p className="text-[#1E3A5F]/75 mb-3">{ev.address}</p>}
                    {ev.description && <p className="text-[#1E3A5F]/70 leading-relaxed mb-4 italic">{ev.description}</p>}
                    {ev.mapsLink && (
                      <a href={ev.mapsLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs tracking-widest uppercase bg-[#D4A017] text-[#1E3A5F] px-5 py-2 hover:bg-[#1E3A5F] hover:text-[#D4A017] transition rounded-full">
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

      {/* ===== RSVP ===== */}
      {wedding.rsvpSettings?.enabled !== false && <RSVPSection wedding={wedding} />}

      {/* ===== GIFT REGISTRY ===== */}
      {wedding.advancedSettings?.giftRegistryLink && (
        <section className="py-20 px-4 bg-[#F5EDD9] border-t border-[#D4A017]/30 text-center">
          <Gift className="w-8 h-8 text-[#D4A017] mx-auto mb-4" />
          <h2 className="font-serif italic text-3xl md:text-4xl text-[#1E3A5F] mb-3">With blessings &amp; love</h2>
          <p className="text-[#1E3A5F]/70 max-w-xl mx-auto mb-8">Your presence is our greatest gift. If you wish to add to our garden, our registry awaits.</p>
          <a href={wedding.advancedSettings.giftRegistryLink} target="_blank" rel="noreferrer" className="inline-block bg-[#1E3A5F] text-[#D4A017] border-2 border-[#D4A017] px-10 py-4 text-xs tracking-[0.3em] uppercase hover:bg-[#D4A017] hover:text-[#1E3A5F] transition rounded-full">
            View Registry
          </a>
        </section>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="relative py-16 px-4 text-center bg-[#1E3A5F] text-[#FBF6E9] overflow-hidden">
        <Peacock className="absolute -top-4 left-8 w-32 text-[#D4A017]/20" />
        <Peacock className="absolute -top-4 right-8 w-32 text-[#D4A017]/20 scale-x-[-1]" />
        <Lotus className="w-14 h-12 text-[#E8839E] mx-auto mb-4" />
        <div className="font-serif italic text-3xl text-[#FBF6E9] mb-2">
          {wedding.brideName} <span className="text-[#D4A017] not-italic">&amp;</span> {wedding.groomName}
        </div>
        <div className="text-xs tracking-[0.3em] text-[#D4A017] uppercase mb-6">{fmtDate(wedding.weddingDate)}</div>
        {wedding.advancedSettings?.socialMedia?.instagram && (
          <a href={wedding.advancedSettings.socialMedia.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#D4A017] mb-6"><Instagram size={18} /></a>
        )}
        <div className="text-[10px] text-[#FBF6E9]/50 tracking-[0.3em] uppercase">
          Painted with love · <a href="/" className="underline hover:text-[#D4A017]">Vivoha</a>
        </div>
      </footer>
    </main>
  )
}

function SectionHeader({ eyebrow, title, tone = 'light' }) {
  const eyebrowColor = 'text-[#D4A017]'
  const titleColor = tone === 'dark' ? 'text-[#FBF6E9]' : 'text-[#1E3A5F]'
  return (
    <>
      <div className={`tracking-[0.4em] text-[10px] md:text-xs uppercase mb-4 ${eyebrowColor}`}>{eyebrow}</div>
      <h2 className={`font-serif font-light italic text-4xl md:text-6xl ${titleColor}`}>{title}</h2>
    </>
  )
}

function Divider() {
  return (
    <div className="py-10 px-4 bg-[#FBF6E9] flex items-center justify-center gap-6">
      <div className="h-px bg-[#D4A017]/40 flex-1 max-w-xs" />
      <Lotus className="w-10 h-9 text-[#E8839E]" />
      <div className="h-px bg-[#D4A017]/40 flex-1 max-w-xs" />
    </div>
  )
}

function RSVPSection({ wedding }) {
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
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setSuccess(true)
    } catch (err) { toast.error(err.message) } finally { setSubmitting(false) }
  }

  return (
    <section id="rsvp" className="relative py-20 md:py-32 px-4 bg-gradient-to-b from-[#1E3A5F] via-[#2A4A75] to-[#1E3A5F] text-[#FBF6E9] overflow-hidden">
      <LotusPetals />
      <Peacock className="absolute -top-6 -left-12 w-56 text-[#D4A017]/15" />
      <Peacock className="absolute -bottom-6 -right-12 w-56 text-[#D4A017]/15 scale-x-[-1]" />
      <div className="container mx-auto max-w-2xl relative">
        <div className="text-center mb-12">
          <Lotus className="w-14 h-12 text-[#E8839E] mx-auto mb-4" />
          <div className="text-[#D4A017] tracking-[0.4em] text-xs uppercase mb-3">RSVP</div>
          <h2 className="font-serif italic font-light text-4xl md:text-6xl">Bloom with us</h2>
          {wedding.rsvpSettings?.deadline && (
            <p className="mt-4 text-[#D4A017] text-sm italic">Kindly respond by {fmtDate(wedding.rsvpSettings.deadline)}</p>
          )}
        </div>

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-[#FBF6E9] text-[#1E3A5F] p-12 text-center" style={{ borderRadius: '40px' }}>
            <Lotus className="w-14 h-12 text-[#E8839E] mx-auto mb-3" />
            <h3 className="font-serif italic text-3xl mb-3 text-[#1E3A5F]">Thank you</h3>
            <p className="text-[#1E3A5F]/85">Your bloom has been received. We can't wait to celebrate with you.</p>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="relative bg-[#FBF6E9] text-[#1E3A5F] p-6 md:p-10 space-y-6 border-2 border-[#D4A017]" style={{ borderRadius: '32px' }}>
            <div>
              <label className="text-[10px] tracking-[0.3em] uppercase text-[#D4A017] block mb-2">Your name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent border-b-2 border-[#D4A017]/40 py-3 focus:outline-none focus:border-[#D4A017] text-[#1E3A5F]" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#D4A017] block mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border-b-2 border-[#D4A017]/40 py-3 focus:outline-none focus:border-[#D4A017] text-[#1E3A5F]" />
              </div>
              <div>
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#D4A017] block mb-2">WhatsApp Number *</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-transparent border-b-2 border-[#D4A017]/40 py-3 focus:outline-none focus:border-[#D4A017] text-[#1E3A5F]" />
              </div>
            </div>
            <div>
              <label className="text-[10px] tracking-[0.3em] uppercase text-[#D4A017] block mb-3">Will you bloom with us? *</label>
              <div className="grid grid-cols-3 gap-3">
                {[{ v: 'yes', l: 'Joyfully' }, { v: 'maybe', l: 'Maybe' }, { v: 'no', l: 'Regretfully' }].map((o) => (
                  <button type="button" key={o.v} onClick={() => setAttending(o.v)}
                    className={`py-3 sm:py-4 px-1 text-[10px] leading-tight tracking-[0.18em] sm:tracking-[0.3em] uppercase border-2 transition break-words rounded-full ${attending === o.v ? 'bg-[#1E3A5F] text-[#D4A017] border-[#1E3A5F]' : 'border-[#D4A017]/40 hover:border-[#D4A017] text-[#1E3A5F]'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            {attending === 'yes' && (
              <>
                <div>
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#D4A017] block mb-2">Guests (incl. you)</label>
                  <input type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(e.target.value)} className="w-full bg-transparent border-b-2 border-[#D4A017]/40 py-3 focus:outline-none focus:border-[#D4A017] text-[#1E3A5F]" />
                </div>
                {mealOptions.length > 0 && (
                  <div>
                    <label className="text-[10px] tracking-[0.3em] uppercase text-[#D4A017] block mb-3">Meal preference</label>
                    <div className="flex flex-wrap gap-2">
                      {mealOptions.map((m) => (
                        <button type="button" key={m} onClick={() => setMeal(m)}
                          className={`px-5 py-2 text-[10px] tracking-[0.3em] uppercase border-2 transition rounded-full ${meal === m ? 'bg-[#E8839E] text-[#1E3A5F] border-[#E8839E]' : 'border-[#D4A017]/40 hover:border-[#D4A017] text-[#1E3A5F]'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div>
              <label className="text-[10px] tracking-[0.3em] uppercase text-[#D4A017] block mb-2">A note for the couple</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full bg-transparent border-b-2 border-[#D4A017]/40 py-3 focus:outline-none focus:border-[#D4A017] resize-none text-[#1E3A5F]" />
            </div>
            <button type="submit" disabled={submitting} className="w-full bg-[#1E3A5F] hover:bg-[#D4A017] hover:text-[#1E3A5F] text-[#D4A017] py-5 tracking-[0.4em] text-xs uppercase transition rounded-full">
              {submitting ? 'Sending…' : 'Send RSVP'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Clock, Calendar, Check, ChevronLeft, ChevronRight, X, Gift, Instagram } from 'lucide-react'
import { toast } from 'sonner'

function useCountdown(target) {
  const [now, setNow] = useState(0); const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true); setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
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

// ===== ART DECO ORNAMENTS =====
const DecoSunburst = ({ className = '', size = 200 }) => (
  <svg viewBox="0 0 200 200" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1">
    <circle cx="100" cy="100" r="20" fill="currentColor" opacity="0.15" />
    <circle cx="100" cy="100" r="10" fill="currentColor" opacity="0.4" />
    {[...Array(36)].map((_, i) => {
      const a = i * 10
      const inner = i % 3 === 0 ? 22 : 26
      const outer = i % 3 === 0 ? 95 : (i % 2 === 0 ? 80 : 60)
      const rad = (a * Math.PI) / 180
      return (
        <line key={i}
          x1={100 + Math.cos(rad) * inner}
          y1={100 + Math.sin(rad) * inner}
          x2={100 + Math.cos(rad) * outer}
          y2={100 + Math.sin(rad) * outer}
          opacity={i % 3 === 0 ? 0.9 : 0.4}
        />
      )
    })}
  </svg>
)

const DecoFan = ({ className = '', size = 120 }) => (
  <svg viewBox="0 0 120 80" width={size} height={(size * 80) / 120} className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M60 75 Q15 75 10 30 Q12 22 18 22 Q24 22 26 30 Q30 75 60 75" opacity="0.5" />
    <path d="M60 75 Q40 75 35 35 Q37 27 42 27 Q48 27 50 35 Q52 75 60 75" opacity="0.7" />
    <path d="M60 75 Q60 35 58 25 Q60 22 62 25 Q60 35 60 75" opacity="0.9" />
    <path d="M60 75 Q80 75 85 35 Q83 27 78 27 Q72 27 70 35 Q68 75 60 75" opacity="0.7" />
    <path d="M60 75 Q105 75 110 30 Q108 22 102 22 Q96 22 94 30 Q90 75 60 75" opacity="0.5" />
    <line x1="60" y1="75" x2="60" y2="78" />
    <circle cx="60" cy="78" r="2" fill="currentColor" />
  </svg>
)

const DecoCorner = ({ className = '', size = 80, rotate = 0 }) => (
  <svg viewBox="0 0 80 80" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.2" style={{ transform: `rotate(${rotate}deg)` }}>
    <path d="M0 80 V20 Q0 0 20 0 H80" />
    <path d="M8 80 V24 Q8 8 24 8 H80" opacity="0.6" />
    <path d="M16 80 V28 Q16 16 28 16 H80" opacity="0.3" />
    <line x1="0" y1="80" x2="80" y2="0" opacity="0.4" />
  </svg>
)

const DecoDiamond = ({ className = '', size = 30 }) => (
  <svg viewBox="0 0 30 30" width={size} height={size} className={className} fill="currentColor">
    <path d="M15 2 L26 15 L15 28 L4 15 Z" opacity="0.85" />
    <path d="M15 7 L21 15 L15 23 L9 15 Z" fill="#1F3A2E" opacity="0.8" />
  </svg>
)

const DecoDivider = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-3 ${className}`}>
    <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, #D4B896, #8B6F47)' }} />
    <DecoDiamond className="text-[#D4B896]" size={14} />
    <div className="h-px w-8 bg-[#D4B896]" />
    <DecoFan className="text-[#D4B896]" size={50} />
    <div className="h-px w-8 bg-[#D4B896]" />
    <DecoDiamond className="text-[#D4B896]" size={14} />
    <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, transparent, #D4B896, #8B6F47)' }} />
  </div>
)

// Shimmer gradient text
const shimmerGradient = 'linear-gradient(110deg, #D4B896 0%, #F5EDE0 25%, #FFF8E8 50%, #F5EDE0 75%, #D4B896 100%)'

export default function PearlVelvetTemplate({ wedding }) {
  const [lightbox, setLightbox] = useState(null)
  const cd = useCountdown(wedding.weddingDate)
  const heroUrl = wedding.heroImage?.url
  const gallery = wedding.gallery || []
  const events = wedding.events || []

  return (
    <main className="min-h-screen text-[#F5EDE0]" style={{ background: '#1A1A1A' }}>
      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {heroUrl ? (
          <>
            <motion.img initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 2.8, ease: 'easeOut' }}
              src={heroUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'sepia(0.2) brightness(0.55) contrast(1.1)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(26,26,26,0.55) 0%, rgba(26,26,26,0.4) 50%, rgba(26,26,26,0.92) 100%)' }} />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, #1F3A2E, #1A1A1A 70%)' }} />
        )}

        {/* Background sunburst */}
        <motion.div initial={{ opacity: 0, rotate: 0 }} animate={{ opacity: 0.18, rotate: 360 }} transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <DecoSunburst className="text-[#D4B896]" size={700} />
        </motion.div>

        {/* Frame corners */}
        <DecoCorner className="absolute top-8 left-8 text-[#D4B896]" size={90} rotate={0} />
        <DecoCorner className="absolute top-8 right-8 text-[#D4B896]" size={90} rotate={90} />
        <DecoCorner className="absolute bottom-8 right-8 text-[#D4B896]" size={90} rotate={180} />
        <DecoCorner className="absolute bottom-8 left-8 text-[#D4B896]" size={90} rotate={270} />

        {/* Outer geometric frame */}
        <div className="absolute inset-12 md:inset-20 pointer-events-none" style={{ border: '1px solid rgba(212,184,150,0.4)' }} />
        <div className="absolute inset-14 md:inset-24 pointer-events-none" style={{ border: '1px solid rgba(212,184,150,0.15)' }} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4, delay: 0.4 }}
          className="relative z-10 text-center px-8 max-w-5xl">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 1, delay: 0.3 }}>
            <DecoFan className="mx-auto mb-6 text-[#D4B896]" size={90} />
          </motion.div>
          <div className="text-[#D4B896] tracking-[0.6em] text-[10px] md:text-xs uppercase mb-4">An Affair to Remember</div>
          <motion.h1 initial={{ backgroundPosition: '200% 0' }} animate={{ backgroundPosition: '-100% 0' }} transition={{ duration: 4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            className="font-serif font-light leading-[0.95] mb-2"
            style={{
              fontSize: 'clamp(3.5rem, 9vw, 8.5rem)',
              background: shimmerGradient,
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
            {wedding.brideName}
          </motion.h1>
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, delay: 1.1 }}
            className="my-4 flex items-center justify-center gap-4">
            <div className="h-px w-16 md:w-24" style={{ background: 'linear-gradient(to right, transparent, #D4B896)' }} />
            <DecoDiamond className="text-[#D4B896]" size={18} />
            <div className="h-px w-16 md:w-24" style={{ background: 'linear-gradient(to left, transparent, #D4B896)' }} />
          </motion.div>
          <motion.h1 initial={{ backgroundPosition: '-100% 0' }} animate={{ backgroundPosition: '200% 0' }} transition={{ duration: 4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            className="font-serif font-light leading-[0.95] mb-8"
            style={{
              fontSize: 'clamp(3.5rem, 9vw, 8.5rem)',
              background: shimmerGradient,
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
            {wedding.groomName}
          </motion.h1>
          {wedding.tagline && (
            <p className="font-serif italic text-xl md:text-2xl text-[#F5EDE0]/80 max-w-2xl mx-auto mb-8">"{wedding.tagline}"</p>
          )}
          <DecoDivider className="max-w-2xl mx-auto mb-8 text-[#D4B896]" />
          <div className="inline-flex items-center gap-3 tracking-[0.4em] text-sm uppercase px-6 py-3" style={{ border: '1px solid #D4B896', color: '#D4B896' }}>
            <Calendar className="w-4 h-4" />
            <span>{fmt(wedding.weddingDate)}</span>
          </div>
        </motion.div>
      </section>

      {/* COUNTDOWN */}
      {!cd.done && (
        <section className="py-20 md:py-28 px-4 relative" style={{ background: '#1F3A2E' }}>
          <DecoSunburst className="absolute -left-32 top-1/2 -translate-y-1/2 text-[#D4B896]/10" size={400} />
          <DecoSunburst className="absolute -right-32 top-1/2 -translate-y-1/2 text-[#D4B896]/10" size={400} />
          <div className="container mx-auto max-w-5xl relative z-10">
            <div className="text-center mb-12">
              <DecoFan className="mx-auto mb-4 text-[#D4B896]" size={70} />
              <div className="text-[#D4B896] tracking-[0.5em] text-xs uppercase mb-3">Anticipation</div>
              <h2 className="font-serif font-light text-4xl md:text-6xl text-[#F5EDE0]">Until the grand affair</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[{ v: cd.days, l: 'Days' }, { v: cd.hours, l: 'Hours' }, { v: cd.minutes, l: 'Minutes' }, { v: cd.seconds, l: 'Seconds' }].map((u, i) => (
                <motion.div key={u.l}
                  initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="relative aspect-square flex flex-col items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(212,184,150,0.08), rgba(31,58,46,0.4))',
                    border: '1px solid rgba(212,184,150,0.4)',
                  }}>
                  <DecoDiamond className="absolute top-2 left-2 text-[#D4B896]" size={12} />
                  <DecoDiamond className="absolute top-2 right-2 text-[#D4B896]" size={12} />
                  <DecoDiamond className="absolute bottom-2 left-2 text-[#D4B896]" size={12} />
                  <DecoDiamond className="absolute bottom-2 right-2 text-[#D4B896]" size={12} />
                  <div className="font-serif font-light text-5xl md:text-7xl"
                    style={{ background: shimmerGradient, backgroundSize: '200% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {String(u.v).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] md:text-xs tracking-[0.4em] uppercase mt-2 text-[#D4B896]">{u.l}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* STORY */}
      {wedding.story && (
        <section className="py-20 md:py-32 px-4" style={{ background: '#1A1A1A' }}>
          <div className="container mx-auto max-w-3xl text-center relative">
            <DecoFan className="mx-auto mb-6 text-[#D4B896]" size={90} />
            <div className="text-[#D4B896] tracking-[0.5em] text-xs uppercase mb-4">Chapter I</div>
            <h2 className="font-serif font-light text-5xl md:text-6xl text-[#F5EDE0] mb-2">An affair began</h2>
            <DecoDivider className="my-10 text-[#D4B896]" />
            <div className="relative p-8 md:p-14"
              style={{
                background: 'linear-gradient(180deg, rgba(31,58,46,0.5), rgba(26,26,26,0.6))',
                border: '1px solid rgba(212,184,150,0.4)',
              }}>
              <DecoCorner className="absolute -top-px -left-px text-[#D4B896]" size={50} rotate={0} />
              <DecoCorner className="absolute -top-px -right-px text-[#D4B896]" size={50} rotate={90} />
              <DecoCorner className="absolute -bottom-px -right-px text-[#D4B896]" size={50} rotate={180} />
              <DecoCorner className="absolute -bottom-px -left-px text-[#D4B896]" size={50} rotate={270} />
              <div className="font-serif text-lg md:text-xl text-[#F5EDE0]/90 leading-relaxed whitespace-pre-line text-left">
                <span className="float-left font-serif text-7xl leading-none mr-3 mt-1 text-[#D4B896]">{wedding.story.charAt(0)}</span>
                {wedding.story.slice(1)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* GALLERY */}
      {gallery.length > 0 && (
        <section className="py-20 md:py-32 px-4" style={{ background: '#1F3A2E' }}>
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <DecoFan className="mx-auto mb-4 text-[#D4B896]" size={80} />
              <div className="text-[#D4B896] tracking-[0.5em] text-xs uppercase mb-3">Portraits</div>
              <h2 className="font-serif font-light text-5xl md:text-6xl text-[#F5EDE0]">Vintage frames</h2>
              <DecoDivider className="mt-8 text-[#D4B896]" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gallery.map((g, i) => (
                <motion.button key={g.publicId || i}
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: (i % 8) * 0.05 }}
                  onClick={() => setLightbox(i)}
                  className={`relative overflow-hidden group ${i % 5 === 0 ? 'md:row-span-2 aspect-square md:aspect-[3/4]' : 'aspect-square'}`}
                  style={{
                    padding: '6px',
                    background: 'linear-gradient(135deg, #D4B896, #8B6F47, #D4B896)',
                  }}>
                  <div className="relative w-full h-full overflow-hidden" style={{ border: '1px solid #1F3A2E' }}>
                    <img src={g.url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" style={{ filter: 'sepia(0.15) contrast(1.05)' }} />
                    <div className="absolute inset-0 bg-[#1F3A2E]/0 group-hover:bg-[#1F3A2E]/30 transition" />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
          <AnimatePresence>
            {lightbox !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-[#1A1A1A]/98 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
                <button className="absolute top-6 right-6 text-[#D4B896]" onClick={() => setLightbox(null)}><X /></button>
                <button className="absolute left-4 md:left-12 text-[#D4B896] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length) }}><ChevronLeft size={32} /></button>
                <button className="absolute right-4 md:right-12 text-[#D4B896] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length) }}><ChevronRight size={32} /></button>
                <motion.img key={lightbox} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  src={gallery[lightbox].url} alt="" className="max-w-[90vw] max-h-[85vh] object-contain"
                  style={{ border: '8px solid #D4B896' }} onClick={(e) => e.stopPropagation()} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* EVENTS */}
      {events.length > 0 && (
        <section className="py-20 md:py-32 px-4" style={{ background: '#1A1A1A' }}>
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <DecoFan className="mx-auto mb-4 text-[#D4B896]" size={80} />
              <div className="text-[#D4B896] tracking-[0.5em] text-xs uppercase mb-3">The Programme</div>
              <h2 className="font-serif font-light text-5xl md:text-6xl text-[#F5EDE0]">An evening to behold</h2>
              <DecoDivider className="mt-8 text-[#D4B896]" />
            </div>
            <div className="space-y-6">
              {events.map((ev, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
                  className="relative grid md:grid-cols-12 gap-6 items-center p-6 md:p-10"
                  style={{
                    background: 'linear-gradient(135deg, rgba(31,58,46,0.5), rgba(26,26,26,0.6))',
                    border: '1px solid rgba(212,184,150,0.3)',
                  }}>
                  <DecoCorner className="absolute -top-px -left-px text-[#D4B896]" size={40} rotate={0} />
                  <DecoCorner className="absolute -top-px -right-px text-[#D4B896]" size={40} rotate={90} />
                  <DecoCorner className="absolute -bottom-px -right-px text-[#D4B896]" size={40} rotate={180} />
                  <DecoCorner className="absolute -bottom-px -left-px text-[#D4B896]" size={40} rotate={270} />
                  <div className="md:col-span-3 text-center">
                    <div className="text-xs tracking-[0.4em] uppercase text-[#D4B896]">{fmtMo(ev.date)}</div>
                    <div className="font-serif text-6xl md:text-7xl font-light my-1"
                      style={{ background: shimmerGradient, backgroundSize: '200% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      {fmtDay(ev.date)}
                    </div>
                    <div className="text-xs tracking-[0.3em] uppercase text-[#D4B896]/80">{new Date(ev.date).getFullYear()}</div>
                  </div>
                  <div className="md:col-span-9">
                    <div className="text-xs tracking-[0.4em] uppercase text-[#D4B896] mb-1">Act {String(i + 1).padStart(2, '0')}</div>
                    <h3 className="font-serif text-3xl md:text-4xl text-[#F5EDE0] mb-3 font-light">{ev.name}</h3>
                    <div className="space-y-1 mb-3 text-sm text-[#F5EDE0]/80">
                      {ev.startTime && <div className="flex items-center gap-2"><Clock size={14} className="text-[#D4B896]" /> {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}</div>}
                      {ev.venue && <div className="flex items-center gap-2"><MapPin size={14} className="text-[#D4B896]" /> {ev.venue}</div>}
                    </div>
                    {ev.address && <p className="text-[#F5EDE0]/60 text-sm mb-3 italic">{ev.address}</p>}
                    {ev.description && <p className="text-[#F5EDE0]/85 leading-relaxed mb-4">{ev.description}</p>}
                    {ev.mapsLink && (
                      <a href={ev.mapsLink} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs tracking-widest uppercase px-5 py-2 hover:bg-[#D4B896] hover:text-[#1F3A2E] transition"
                        style={{ border: '1px solid #D4B896', color: '#D4B896' }}>
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
      {wedding.rsvpSettings?.enabled !== false && <PearlRSVP wedding={wedding} />}

      {/* GIFT REGISTRY */}
      {wedding.advancedSettings?.giftRegistryLink && (
        <section className="py-20 px-4 text-center" style={{ background: '#1F3A2E' }}>
          <Gift className="w-8 h-8 text-[#D4B896] mx-auto mb-4" />
          <h2 className="font-serif font-light text-4xl md:text-5xl text-[#F5EDE0] mb-4">A token of velvet</h2>
          <p className="text-[#F5EDE0]/75 mb-10 max-w-xl mx-auto italic">Your presence is the finest gift. Should you wish to indulge, our registry awaits.</p>
          <a href={wedding.advancedSettings.giftRegistryLink} target="_blank" rel="noreferrer"
            className="inline-block px-10 py-4 text-xs tracking-widest uppercase text-[#1F3A2E] hover:bg-[#F5EDE0]"
            style={{ background: '#D4B896' }}>
            View Registry
          </a>
        </section>
      )}

      {/* FOOTER */}
      <footer className="py-16 px-4 text-center relative overflow-hidden" style={{ background: '#1A1A1A' }}>
        <DecoFan className="mx-auto mb-4 text-[#D4B896]" size={60} />
        <div className="font-serif text-3xl mb-2"
          style={{ background: shimmerGradient, backgroundSize: '200% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {wedding.brideName} &amp; {wedding.groomName}
        </div>
        <div className="text-sm tracking-[0.4em] text-[#D4B896] uppercase mb-8">{fmt(wedding.weddingDate)}</div>
        {wedding.advancedSettings?.socialMedia?.instagram && (
          <a href={wedding.advancedSettings.socialMedia.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#D4B896] mb-8"><Instagram size={18} /></a>
        )}
        <DecoDivider className="max-w-xs mx-auto mb-6 text-[#D4B896]" />
        <div className="text-xs text-[#D4B896]/80 tracking-wider italic">An affair to remember · <a href="/" className="underline">Powered by Vivoha</a></div>
      </footer>
    </main>
  )
}

function PearlRSVP({ wedding }) {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState('')
  const [attending, setAttending] = useState(''); const [guests, setGuests] = useState(1)
  const [meal, setMeal] = useState(''); const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false); const [success, setSuccess] = useState(false)
  const mealOptions = wedding.rsvpSettings?.mealOptions || []

  async function submit(e) {
    e.preventDefault()
    if (!attending) { toast.error('Please respond'); return }
    if (!phone.trim()) { toast.error('WhatsApp number is required'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weddingSlug: wedding.slug, name, email, phone, attending, guests: Number(guests), mealPreferences: meal ? [meal] : [], message })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setSuccess(true)
    } catch (err) { toast.error(err.message) } finally { setSubmitting(false) }
  }

  return (
    <section id="rsvp" className="py-20 md:py-32 px-4 relative" style={{ background: 'linear-gradient(180deg, #1F3A2E, #1A1A1A)' }}>
      <DecoSunburst className="absolute -top-32 left-1/2 -translate-x-1/2 text-[#D4B896]/10" size={500} />
      <div className="container mx-auto max-w-2xl relative z-10">
        <div className="text-center mb-12">
          <DecoFan className="mx-auto mb-4 text-[#D4B896]" size={70} />
          <div className="text-[#D4B896] tracking-[0.5em] text-xs uppercase mb-3">RSVP</div>
          <h2 className="font-serif font-light text-5xl md:text-6xl text-[#F5EDE0]">Reply, if you please</h2>
          {wedding.rsvpSettings?.deadline && (
            <p className="mt-4 text-[#D4B896] text-sm italic">Kindly respond by {fmt(wedding.rsvpSettings.deadline)}</p>
          )}
        </div>

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="p-12 text-center relative"
            style={{
              background: 'linear-gradient(180deg, rgba(31,58,46,0.6), rgba(26,26,26,0.8))',
              border: '1px solid #D4B896',
            }}>
            <DecoCorner className="absolute -top-px -left-px text-[#D4B896]" size={50} rotate={0} />
            <DecoCorner className="absolute -top-px -right-px text-[#D4B896]" size={50} rotate={90} />
            <DecoCorner className="absolute -bottom-px -right-px text-[#D4B896]" size={50} rotate={180} />
            <DecoCorner className="absolute -bottom-px -left-px text-[#D4B896]" size={50} rotate={270} />
            <Check className="w-12 h-12 text-[#D4B896] mx-auto mb-4" />
            <h3 className="font-serif text-4xl text-[#F5EDE0] mb-3 font-light">Wonderfully received</h3>
            <p className="text-[#F5EDE0]/85">Your reply is logged in the book. Until the affair.</p>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="space-y-6 p-6 md:p-10 relative"
            style={{
              background: 'linear-gradient(180deg, rgba(31,58,46,0.6), rgba(26,26,26,0.8))',
              border: '1px solid rgba(212,184,150,0.4)',
            }}>
            <DecoCorner className="absolute -top-px -left-px text-[#D4B896]" size={40} rotate={0} />
            <DecoCorner className="absolute -top-px -right-px text-[#D4B896]" size={40} rotate={90} />
            <DecoCorner className="absolute -bottom-px -right-px text-[#D4B896]" size={40} rotate={180} />
            <DecoCorner className="absolute -bottom-px -left-px text-[#D4B896]" size={40} rotate={270} />
            <div>
              <label className="text-xs tracking-[0.3em] uppercase text-[#D4B896] block mb-2">Your name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b border-[#D4B896]/40 py-3 focus:outline-none focus:border-[#D4B896] text-[#F5EDE0]" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs tracking-[0.3em] uppercase text-[#D4B896] block mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-[#D4B896]/40 py-3 focus:outline-none focus:border-[#D4B896] text-[#F5EDE0]" />
              </div>
              <div>
                <label className="text-xs tracking-[0.3em] uppercase text-[#D4B896] block mb-2">WhatsApp Number *</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent border-b border-[#D4B896]/40 py-3 focus:outline-none focus:border-[#D4B896] text-[#F5EDE0]" />
              </div>
            </div>
            <div>
              <label className="text-xs tracking-[0.3em] uppercase text-[#D4B896] block mb-3">Will you attend? *</label>
              <div className="grid grid-cols-3 gap-3">
                {[{ v: 'yes', l: 'Delighted' }, { v: 'maybe', l: 'Perhaps' }, { v: 'no', l: 'Regretfully' }].map((o) => (
                  <button type="button" key={o.v} onClick={() => setAttending(o.v)}
                    className="py-3 sm:py-4 px-1 text-[10px] sm:text-xs leading-tight tracking-wider sm:tracking-widest uppercase transition break-words"
                    style={{
                      background: attending === o.v ? '#D4B896' : 'transparent',
                      color: attending === o.v ? '#1F3A2E' : '#F5EDE0',
                      border: `1px solid ${attending === o.v ? '#D4B896' : 'rgba(212,184,150,0.4)'}`,
                    }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            {attending === 'yes' && (
              <>
                <div>
                  <label className="text-xs tracking-[0.3em] uppercase text-[#D4B896] block mb-2">Guests</label>
                  <input type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(e.target.value)}
                    className="w-full bg-transparent border-b border-[#D4B896]/40 py-3 focus:outline-none focus:border-[#D4B896] text-[#F5EDE0]" />
                </div>
                {mealOptions.length > 0 && (
                  <div>
                    <label className="text-xs tracking-[0.3em] uppercase text-[#D4B896] block mb-3">Course preference</label>
                    <div className="flex flex-wrap gap-2">
                      {mealOptions.map((m) => (
                        <button type="button" key={m} onClick={() => setMeal(m)}
                          className="px-5 py-2 text-xs tracking-widest uppercase transition"
                          style={{
                            background: meal === m ? '#D4B896' : 'transparent',
                            color: meal === m ? '#1F3A2E' : '#F5EDE0',
                            border: `1px solid ${meal === m ? '#D4B896' : 'rgba(212,184,150,0.4)'}`,
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
              <label className="text-xs tracking-[0.3em] uppercase text-[#D4B896] block mb-2">A note for the host</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                className="w-full bg-transparent border-b border-[#D4B896]/40 py-3 focus:outline-none focus:border-[#D4B896] resize-none text-[#F5EDE0]" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-5 tracking-widest text-xs uppercase transition hover:opacity-90"
              style={{ background: '#D4B896', color: '#1F3A2E' }}>
              {submitting ? 'Posting…' : 'Reply by Telegram'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

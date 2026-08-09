'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Clock, Calendar, Check, ChevronLeft, ChevronRight, X, Gift, Instagram } from 'lucide-react'
import { toast } from 'sonner'

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
const fmt = (d) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
const fmtMo = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
const fmtDay = (d) => new Date(d).getDate()

// ===== CATHEDRAL POINTED ARCH (gothic) =====
const GothicArch = ({ className = '', size = 200, stroke = 1.4 }) => (
  <svg viewBox="0 0 100 160" width={size} height={(size * 160) / 100} className={className} fill="none" stroke="currentColor" strokeWidth={stroke} preserveAspectRatio="xMidYMid meet">
    {/* Outer pointed arch */}
    <path d="M8 160 V70 Q8 28 50 8 Q92 28 92 70 V160" />
    {/* Inner arch */}
    <path d="M18 160 V74 Q18 38 50 22 Q82 38 82 74 V160" opacity="0.5" />
    {/* Small cross at apex */}
    <line x1="50" y1="2" x2="50" y2="-2" />
    <g transform="translate(50 8)">
      <line x1="0" y1="-6" x2="0" y2="2" />
      <line x1="-3" y1="-3" x2="3" y2="-3" />
    </g>
  </svg>
)

// ===== DOVE =====
const Dove = ({ className = '', size = 60 }) => (
  <svg viewBox="0 0 80 60" width={size} height={(size * 60) / 80} className={className} fill="currentColor">
    <path d="M10 35 Q15 28 25 26 Q35 24 42 28 Q48 30 55 28 Q62 24 68 26 Q75 28 72 34 Q68 38 60 36 L52 38 Q48 42 42 42 Q34 44 28 40 Q20 42 14 38 Q8 36 10 35 Z" opacity="0.95" />
    <path d="M28 24 Q34 14 44 16 Q42 22 38 26" opacity="0.8" />
    <circle cx="64" cy="30" r="1" fill="#3A3226" />
    <path d="M68 32 L72 33 L68 34" stroke="currentColor" strokeWidth="0.5" fill="none" />
  </svg>
)

// ===== OLIVE BRANCH =====
const OliveBranch = ({ className = '', size = 100 }) => (
  <svg viewBox="0 0 120 40" width={size} height={(size * 40) / 120} className={className} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <path d="M10 20 Q40 14 70 18 T115 22" />
    <ellipse cx="22" cy="16" rx="5" ry="2.5" transform="rotate(-25 22 16)" fill="currentColor" opacity="0.7" />
    <ellipse cx="35" cy="14" rx="6" ry="3" transform="rotate(-15 35 14)" fill="currentColor" opacity="0.7" />
    <ellipse cx="50" cy="14" rx="6" ry="3" transform="rotate(-5 50 14)" fill="currentColor" opacity="0.7" />
    <ellipse cx="68" cy="14" rx="6" ry="3" transform="rotate(8 68 14)" fill="currentColor" opacity="0.7" />
    <ellipse cx="85" cy="16" rx="6" ry="3" transform="rotate(15 85 16)" fill="currentColor" opacity="0.7" />
    <ellipse cx="100" cy="18" rx="5" ry="2.5" transform="rotate(20 100 18)" fill="currentColor" opacity="0.7" />
    <ellipse cx="28" cy="26" rx="5" ry="2.5" transform="rotate(15 28 26)" fill="currentColor" opacity="0.7" />
    <ellipse cx="45" cy="26" rx="6" ry="3" transform="rotate(10 45 26)" fill="currentColor" opacity="0.7" />
    <ellipse cx="62" cy="26" rx="6" ry="3" transform="rotate(-5 62 26)" fill="currentColor" opacity="0.7" />
    <ellipse cx="78" cy="26" rx="5" ry="2.5" transform="rotate(-15 78 26)" fill="currentColor" opacity="0.7" />
    <ellipse cx="95" cy="28" rx="5" ry="2.5" transform="rotate(-20 95 28)" fill="currentColor" opacity="0.7" />
  </svg>
)

// ===== STAINED GLASS PATTERN =====
const RoseWindow = ({ className = '', size = 100 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className={className}>
    <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    <circle cx="50" cy="50" r="6" fill="currentColor" opacity="0.6" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => (
      <g key={i} transform={`rotate(${a} 50 50)`}>
        <path d="M50 12 L56 24 L50 30 L44 24 Z" fill="currentColor" opacity={i % 2 === 0 ? 0.45 : 0.3} />
        <line x1="50" y1="32" x2="50" y2="44" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
      </g>
    ))}
    {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((a, i) => (
      <circle key={i} cx="50" cy="20" r="2.5" fill="currentColor" opacity="0.4" transform={`rotate(${a} 50 50)`} />
    ))}
  </svg>
)

// ===== LIGHT RAYS =====
function LightRays() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(7)].map((_, i) => (
        <motion.div key={i}
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.05, 0.18, 0.05] }}
          transition={{ duration: 6 + i, repeat: Infinity, delay: i * 0.6 }}
          className="absolute top-0"
          style={{
            left: `${10 + i * 13}%`,
            width: '1px',
            height: '100%',
            background: 'linear-gradient(180deg, rgba(201,169,97,0.5), transparent 80%)',
            transform: `rotate(${-8 + i * 2}deg) translateY(-20%)`,
            transformOrigin: 'top center',
          }}
        />
      ))}
    </div>
  )
}

const SacredDivider = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-3 ${className}`}>
    <OliveBranch className="text-[#A8B89C]" size={60} />
    <div className="w-2 h-2 rounded-full bg-[#C9A961]" />
    <OliveBranch className="text-[#A8B89C] -scale-x-100" size={60} />
  </div>
)

export default function SanctumVeilTemplate({ wedding }) {
  const [lightbox, setLightbox] = useState(null)
  const cd = useCountdown(wedding.weddingDate)
  const heroUrl = wedding.heroImage?.url
  const gallery = wedding.gallery || []
  const events = wedding.events || []

  return (
    <main className="min-h-screen text-[#2B3A52]" style={{
      background: 'linear-gradient(180deg, #FAF7F2 0%, #F2EBE0 100%)',
    }}>
      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {heroUrl ? (
          <>
            <motion.img initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: 3, ease: 'easeOut' }}
              src={heroUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'brightness(0.85) saturate(0.9)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(250,247,242,0.4) 0%, rgba(250,247,242,0.55) 50%, rgba(250,247,242,0.85) 100%)' }} />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at top, #FAF7F2, #E8DDC8 70%)' }} />
        )}

        <LightRays />

        {/* Large gothic arch silhouette behind text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <GothicArch className="text-[#C9A961]/25" size={420} stroke={1.4} />
        </div>

        {/* Animated dove flying across */}
        <motion.div
          initial={{ x: '-15vw', y: '15vh', opacity: 0 }}
          animate={{ x: '115vw', y: '8vh', opacity: [0, 1, 1, 0] }}
          transition={{ duration: 18, delay: 2, repeat: Infinity, repeatDelay: 8, ease: 'linear' }}
          className="absolute pointer-events-none z-10"
        >
          <Dove className="text-[#FAF7F2]" size={48} />
        </motion.div>

        {/* Corner olive branches */}
        <OliveBranch className="absolute top-8 left-4 md:top-12 md:left-12 text-[#A8B89C] hidden md:block" size={140} />
        <OliveBranch className="absolute top-8 right-4 md:top-12 md:right-12 text-[#A8B89C] -scale-x-100 hidden md:block" size={140} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4, delay: 0.4 }}
          className="relative z-10 text-center px-8 max-w-4xl">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 1, delay: 0.3 }}>
            <RoseWindow className="mx-auto mb-6 text-[#C9A961]" size={70} />
          </motion.div>
          <div className="text-[#C9A961] tracking-[0.5em] text-[10px] md:text-xs uppercase mb-3 font-medium">~ A Sacred Union ~</div>
          <div className="font-serif italic text-base text-[#8B9DAF] mb-6">"Two hearts, one love, forever blessed"</div>
          <h1 className="font-serif font-light leading-[0.95] mb-3 text-[#2B3A52]"
            style={{ fontSize: 'clamp(3.5rem, 9vw, 8.5rem)' }}>
            {wedding.brideName}
          </h1>
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, delay: 1.1 }}
            className="my-2 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-[#C9A961]" />
            <span className="font-serif italic text-2xl md:text-4xl text-[#C9A961]">&amp;</span>
            <div className="h-px w-12 bg-[#C9A961]" />
          </motion.div>
          <h1 className="font-serif font-light leading-[0.95] mb-8 text-[#2B3A52]"
            style={{ fontSize: 'clamp(3.5rem, 9vw, 8.5rem)' }}>
            {wedding.groomName}
          </h1>
          {wedding.tagline && (
            <p className="font-serif italic text-xl md:text-2xl text-[#2B3A52]/80 max-w-2xl mx-auto mb-8">"{wedding.tagline}"</p>
          )}
          <SacredDivider className="my-6" />
          <div className="inline-flex items-center gap-3 text-[#C9A961] tracking-widest text-sm uppercase">
            <Calendar className="w-4 h-4" />
            <span>{fmt(wedding.weddingDate)}</span>
          </div>
        </motion.div>
      </section>

      {/* COUNTDOWN */}
      {!cd.done && (
        <section className="py-20 md:py-28 px-4" style={{ background: 'linear-gradient(180deg, #FAF7F2, #F2EBE0)' }}>
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <Dove className="mx-auto mb-4 text-[#C9A961]" size={40} />
              <div className="text-[#C9A961] tracking-[0.4em] text-xs uppercase mb-3">Awaiting blessings</div>
              <h2 className="font-serif font-light text-4xl md:text-6xl text-[#2B3A52]">Until we say "I do"</h2>
            </div>
            <div className="grid grid-cols-4 gap-3 md:gap-6">
              {[{ v: cd.days, l: 'Days' }, { v: cd.hours, l: 'Hours' }, { v: cd.minutes, l: 'Minutes' }, { v: cd.seconds, l: 'Seconds' }].map((u, i) => (
                <motion.div key={u.l}
                  initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="relative pt-10 pb-6 px-2 text-center bg-white/60 backdrop-blur"
                  style={{ borderRadius: '50% 50% 8px 8px / 30% 30% 8px 8px', border: '1px solid rgba(201,169,97,0.3)' }}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[#C9A961]">
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor"><path d="M5 0 H7 V5 H12 V7 H7 V12 H5 V7 H0 V5 H5 Z" /></svg>
                  </div>
                  <div className="font-serif font-light text-4xl md:text-6xl text-[#2B3A52]">{String(u.v).padStart(2, '0')}</div>
                  <div className="text-[10px] md:text-xs tracking-[0.3em] uppercase mt-2 text-[#C9A961]">{u.l}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* STORY */}
      {wedding.story && (
        <section className="py-20 md:py-32 px-4 relative">
          <div className="container mx-auto max-w-3xl text-center relative">
            <RoseWindow className="mx-auto mb-6 text-[#C9A961]" size={80} />
            <div className="text-[#C9A961] tracking-[0.4em] text-xs uppercase mb-4">Our covenant</div>
            <h2 className="font-serif font-light text-5xl md:text-6xl text-[#2B3A52] mb-2">How we found grace</h2>
            <p className="font-serif italic text-[#8B9DAF] mb-10">"And the two shall become one."</p>
            <SacredDivider className="mb-12" />
            <div className="relative bg-white/70 backdrop-blur p-8 md:p-14 border border-[#C9A961]/30" style={{
              borderRadius: '120px 120px 8px 8px',
            }}>
              <GothicArch className="absolute -top-6 left-1/2 -translate-x-1/2 text-[#C9A961]/40" size={60} />
              <div className="font-serif text-lg md:text-xl text-[#2B3A52]/85 leading-relaxed whitespace-pre-line text-left mt-10">
                <span className="float-left font-serif text-7xl leading-none mr-3 mt-1 text-[#C9A961] italic">{wedding.story.charAt(0)}</span>
                {wedding.story.slice(1)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* GALLERY */}
      {gallery.length > 0 && (
        <section className="py-20 md:py-32 px-4 relative" style={{ background: 'linear-gradient(180deg, #F2EBE0, #E8DDC8)' }}>
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <OliveBranch className="mx-auto mb-4 text-[#A8B89C]" size={100} />
              <div className="text-[#C9A961] tracking-[0.4em] text-xs uppercase mb-3">Blessed moments</div>
              <h2 className="font-serif font-light text-5xl md:text-6xl text-[#2B3A52]">Our scripture</h2>
              <SacredDivider className="mt-8" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {gallery.map((g, i) => (
                <motion.button key={g.publicId || i}
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: (i % 8) * 0.05 }}
                  onClick={() => setLightbox(i)}
                  className={`relative overflow-hidden group ${i % 5 === 0 ? 'md:row-span-2 aspect-square md:aspect-[3/4]' : 'aspect-square'}`}
                  style={{
                    borderRadius: i % 5 === 0 ? '80px 80px 8px 8px' : '60px 60px 8px 8px',
                    border: '1px solid rgba(201,169,97,0.4)',
                    boxShadow: '0 10px 30px -10px rgba(43,58,82,0.2)',
                  }}>
                  <img src={g.url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-[#2B3A52]/0 group-hover:bg-[#2B3A52]/20 transition" />
                </motion.button>
              ))}
            </div>
          </div>
          <AnimatePresence>
            {lightbox !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-[#2B3A52]/95 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
                <button className="absolute top-6 right-6 text-[#FAF7F2]" onClick={() => setLightbox(null)}><X /></button>
                <button className="absolute left-4 md:left-12 text-[#FAF7F2] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length) }}><ChevronLeft size={32} /></button>
                <button className="absolute right-4 md:right-12 text-[#FAF7F2] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length) }}><ChevronRight size={32} /></button>
                <motion.img key={lightbox} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  src={gallery[lightbox].url} alt="" className="max-w-[90vw] max-h-[85vh] object-contain"
                  style={{ borderRadius: '16px' }} onClick={(e) => e.stopPropagation()} />
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
              <Dove className="mx-auto mb-4 text-[#C9A961]" size={50} />
              <div className="text-[#C9A961] tracking-[0.4em] text-xs uppercase mb-3">The order of service</div>
              <h2 className="font-serif font-light text-5xl md:text-6xl text-[#2B3A52]">Join us in worship &amp; joy</h2>
              <SacredDivider className="mt-8" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {events.map((ev, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.1 }}
                  className="relative bg-white/70 backdrop-blur p-8 pt-16 text-center border border-[#C9A961]/30"
                  style={{
                    borderRadius: '160px 160px 8px 8px',
                    boxShadow: '0 15px 40px -15px rgba(43,58,82,0.15)',
                  }}>
                  <GothicArch className="absolute top-4 left-1/2 -translate-x-1/2 text-[#C9A961]/35" size={100} stroke={1} />
                  <div className="relative z-10 pt-4">
                    <div className="text-xs tracking-[0.4em] uppercase text-[#C9A961] mb-2">Hymn {String(i + 1).padStart(2, '0')}</div>
                    <h3 className="font-serif text-3xl md:text-4xl text-[#2B3A52] mb-3 font-light">{ev.name}</h3>
                    <div className="inline-block px-4 py-1 mb-4 text-xs tracking-[0.3em] uppercase text-[#2B3A52] border border-[#C9A961]/50">
                      {fmtDay(ev.date)} {fmtMo(ev.date)} {new Date(ev.date).getFullYear()}
                    </div>
                    <div className="space-y-2 mb-4 text-sm text-[#2B3A52]/80">
                      {ev.startTime && (
                        <div className="flex items-center justify-center gap-2">
                          <Clock size={14} className="text-[#C9A961]" />
                          {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}
                        </div>
                      )}
                      {ev.venue && (
                        <div className="flex items-center justify-center gap-2">
                          <MapPin size={14} className="text-[#C9A961]" />
                          {ev.venue}
                        </div>
                      )}
                    </div>
                    {ev.address && <p className="text-[#2B3A52]/65 text-sm mb-3 italic">{ev.address}</p>}
                    {ev.description && <p className="text-[#2B3A52]/80 leading-relaxed mb-4">{ev.description}</p>}
                    {ev.mapsLink && (
                      <a href={ev.mapsLink} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs tracking-widest uppercase px-5 py-2 text-[#2B3A52] border border-[#2B3A52] hover:bg-[#2B3A52] hover:text-[#FAF7F2] transition">
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
      {wedding.rsvpSettings?.enabled !== false && <SanctumRSVP wedding={wedding} />}

      {/* GIFT REGISTRY */}
      {wedding.advancedSettings?.giftRegistryLink && (
        <section className="py-20 px-4 text-center" style={{ background: '#F2EBE0' }}>
          <Gift className="w-8 h-8 text-[#C9A961] mx-auto mb-4" />
          <h2 className="font-serif font-light text-4xl md:text-5xl text-[#2B3A52] mb-4">A blessing from you</h2>
          <p className="text-[#2B3A52]/70 mb-10 max-w-xl mx-auto italic">Your prayers are gift enough. Should you wish to bless further, our registry awaits.</p>
          <a href={wedding.advancedSettings.giftRegistryLink} target="_blank" rel="noreferrer"
            className="inline-block bg-[#2B3A52] text-[#FAF7F2] px-10 py-4 text-xs tracking-widest uppercase hover:bg-[#1F2B3D]">
            View Registry
          </a>
        </section>
      )}

      {/* FOOTER */}
      <footer className="py-16 px-4 text-center" style={{ background: '#FAF7F2' }}>
        <Dove className="mx-auto mb-4 text-[#C9A961]" size={56} />
        <div className="font-serif text-3xl text-[#2B3A52] mb-2">{wedding.brideName} <span className="italic text-[#C9A961]">&amp;</span> {wedding.groomName}</div>
        <div className="text-sm tracking-widest text-[#C9A961] uppercase mb-6">{fmt(wedding.weddingDate)}</div>
        <div className="font-serif italic text-[#2B3A52]/70 mb-8">"What God has joined together, let no one separate."</div>
        {wedding.advancedSettings?.socialMedia?.instagram && (
          <a href={wedding.advancedSettings.socialMedia.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#C9A961] mb-8"><Instagram size={18} /></a>
        )}
        <SacredDivider className="max-w-xs mx-auto mb-6 opacity-70" />
        <div className="text-xs text-[#C9A961]/80 tracking-wider italic">In grace · <a href="/" className="underline">Powered by Vivoha</a></div>
      </footer>
    </main>
  )
}

function SanctumRSVP({ wedding }) {
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
    <section id="rsvp" className="py-20 md:py-32 px-4 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #2B3A52 0%, #1F2B3D 100%)' }}>
      <LightRays />
      <RoseWindow className="absolute -top-20 -right-20 text-[#C9A961]/15" size={300} />
      <RoseWindow className="absolute -bottom-20 -left-20 text-[#C9A961]/15" size={300} />
      <div className="container mx-auto max-w-2xl relative z-10">
        <div className="text-center mb-12 text-[#FAF7F2]">
          <Dove className="mx-auto mb-4 text-[#C9A961]" size={50} />
          <div className="text-[#C9A961] tracking-[0.4em] text-xs uppercase mb-3">~ RSVP ~</div>
          <h2 className="font-serif font-light text-5xl md:text-6xl">Be with us in spirit</h2>
          {wedding.rsvpSettings?.deadline && (
            <p className="mt-4 text-[#C9A961] text-sm italic">Kindly respond by {fmt(wedding.rsvpSettings.deadline)}</p>
          )}
        </div>

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur p-12 text-center text-[#FAF7F2] border border-[#C9A961]/40">
            <Dove className="mx-auto mb-4 text-[#C9A961]" size={70} />
            <h3 className="font-serif text-4xl mb-3 font-light">Amen, beloved</h3>
            <p className="text-[#FAF7F2]/85">Your response is received in love. We await you with open arms.</p>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="space-y-6 bg-white/8 backdrop-blur p-6 md:p-10 border border-[#C9A961]/30">
            <div>
              <label className="text-xs tracking-widest uppercase text-[#C9A961] block mb-2">Your name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b border-[#C9A961]/40 py-3 focus:outline-none focus:border-[#C9A961] text-[#FAF7F2]" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs tracking-widest uppercase text-[#C9A961] block mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-[#C9A961]/40 py-3 focus:outline-none focus:border-[#C9A961] text-[#FAF7F2]" />
              </div>
              <div>
                <label className="text-xs tracking-widest uppercase text-[#C9A961] block mb-2">WhatsApp Number *</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent border-b border-[#C9A961]/40 py-3 focus:outline-none focus:border-[#C9A961] text-[#FAF7F2]" />
              </div>
            </div>
            <div>
              <label className="text-xs tracking-widest uppercase text-[#C9A961] block mb-3">Will you join us? *</label>
              <div className="grid grid-cols-3 gap-3">
                {[{ v: 'yes', l: 'Joyfully' }, { v: 'maybe', l: 'Maybe' }, { v: 'no', l: 'Regretfully' }].map((o) => (
                  <button type="button" key={o.v} onClick={() => setAttending(o.v)}
                    className="py-3 sm:py-4 px-1 text-[10px] sm:text-xs leading-tight tracking-wider sm:tracking-widest uppercase transition break-words border"
                    style={{
                      background: attending === o.v ? '#C9A961' : 'transparent',
                      color: attending === o.v ? '#2B3A52' : '#FAF7F2',
                      borderColor: attending === o.v ? '#C9A961' : 'rgba(201,169,97,0.4)',
                    }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            {attending === 'yes' && (
              <>
                <div>
                  <label className="text-xs tracking-widest uppercase text-[#C9A961] block mb-2">Guests</label>
                  <input type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(e.target.value)}
                    className="w-full bg-transparent border-b border-[#C9A961]/40 py-3 focus:outline-none focus:border-[#C9A961] text-[#FAF7F2]" />
                </div>
                {mealOptions.length > 0 && (
                  <div>
                    <label className="text-xs tracking-widest uppercase text-[#C9A961] block mb-3">Meal</label>
                    <div className="flex flex-wrap gap-2">
                      {mealOptions.map((m) => (
                        <button type="button" key={m} onClick={() => setMeal(m)}
                          className="px-5 py-2 text-xs tracking-widest uppercase border transition"
                          style={{
                            background: meal === m ? '#C9A961' : 'transparent',
                            color: meal === m ? '#2B3A52' : '#FAF7F2',
                            borderColor: meal === m ? '#C9A961' : 'rgba(201,169,97,0.4)',
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
              <label className="text-xs tracking-widest uppercase text-[#C9A961] block mb-2">A blessing or wish</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                className="w-full bg-transparent border-b border-[#C9A961]/40 py-3 focus:outline-none focus:border-[#C9A961] resize-none text-[#FAF7F2]" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-5 tracking-widest text-xs uppercase transition hover:opacity-90 bg-[#C9A961] text-[#2B3A52]">
              {submitting ? 'Sending love…' : 'Send Blessings'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

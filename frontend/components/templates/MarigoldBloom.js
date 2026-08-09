'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Clock, Calendar, Check, ChevronLeft, ChevronRight, X, Gift, Instagram, Music } from 'lucide-react'
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

// ===== MARIGOLD FLOWER =====
const Marigold = ({ className = '', size = 50, color = '#F2A93B' }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} className={className}>
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a, i) => (
      <ellipse key={i} cx="20" cy="10" rx="3" ry="6" transform={`rotate(${a} 20 20)`} fill={color} opacity={0.85} />
    ))}
    {[15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345].map((a, i) => (
      <ellipse key={i} cx="20" cy="13" rx="2.5" ry="4.5" transform={`rotate(${a} 20 20)`} fill={color} opacity={0.95} />
    ))}
    <circle cx="20" cy="20" r="4" fill="#8B4513" />
    <circle cx="20" cy="20" r="2.5" fill="#F2A93B" />
  </svg>
)

// ===== TORAN (garland) =====
const Toran = ({ className = '', count = 24 }) => (
  <div className={`flex items-end justify-around ${className}`} style={{ pointerEvents: 'none' }}>
    {Array.from({ length: count }).map((_, i) => {
      const isLeaf = i % 3 === 0
      const isOrange = i % 2 === 0
      return (
        <motion.div key={i}
          initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.04, duration: 0.6 }}
          style={{ transform: `translateY(${Math.sin(i * 0.8) * 10}px)` }}>
          {isLeaf ? (
            <svg width="20" height="40" viewBox="0 0 20 40">
              <path d="M10 0 L10 20" stroke="#2D6A4F" strokeWidth="1" />
              <ellipse cx="10" cy="28" rx="7" ry="10" fill="#2D6A4F" />
              <path d="M10 20 Q10 25 10 32" stroke="#1B4332" strokeWidth="0.5" />
            </svg>
          ) : (
            <svg width="24" height="44" viewBox="0 0 24 44">
              <path d="M12 0 L12 18" stroke="#2D6A4F" strokeWidth="1" />
              <g transform="translate(12 28)">
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a, j) => (
                  <ellipse key={j} cx="0" cy="-8" rx="2.5" ry="5" transform={`rotate(${a})`} fill={isOrange ? '#F26430' : '#F2A93B'} opacity={0.9} />
                ))}
                <circle cx="0" cy="0" r="3" fill="#8B4513" />
              </g>
            </svg>
          )}
        </motion.div>
      )
    })}
  </div>
)

// ===== FALLING PETALS =====
function FallingMarigolds({ count = 10 }) {
  const petals = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 10,
    duration: 12 + Math.random() * 8,
    size: 24 + Math.random() * 18,
    rotate: Math.random() * 360,
    color: ['#F2A93B', '#F26430', '#E8901C'][Math.floor(Math.random() * 3)],
    drift: -20 + Math.random() * 40,
  })), [count])
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {petals.map((p) => (
        <motion.div key={p.id}
          initial={{ x: `${p.x}vw`, y: '-10vh', rotate: p.rotate, opacity: 0 }}
          animate={{
            y: '110vh',
            x: [`${p.x}vw`, `${p.x + p.drift}vw`, `${p.x + p.drift / 2}vw`],
            rotate: p.rotate + 540,
            opacity: [0, 0.85, 0.85, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
          className="absolute"
        >
          <Marigold size={p.size} color={p.color} />
        </motion.div>
      ))}
    </div>
  )
}

const Paisley = ({ className = '', size = 40 }) => (
  <svg viewBox="0 0 40 40" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M20 4 Q12 8 12 16 Q12 24 20 32 Q28 24 28 16 Q28 8 20 4 Z" />
    <circle cx="20" cy="22" r="2" fill="currentColor" />
  </svg>
)

const MarigoldDivider = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-3 ${className}`}>
    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#F2A93B] to-[#F2A93B]" />
    <Marigold size={26} color="#F26430" />
    <Marigold size={32} />
    <Marigold size={26} color="#F26430" />
    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#F2A93B] to-[#F2A93B]" />
  </div>
)

export default function MarigoldBloomTemplate({ wedding }) {
  const [lightbox, setLightbox] = useState(null)
  const cd = useCountdown(wedding.weddingDate)
  const heroUrl = wedding.heroImage?.url
  const gallery = wedding.gallery || []
  const events = wedding.events || []

  return (
    <main className="min-h-screen text-[#3B4E2F]" style={{ background: 'linear-gradient(180deg, #FFF8E8 0%, #FFEFCF 100%)' }}>
      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {heroUrl ? (
          <>
            <motion.img initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 2.5, ease: 'easeOut' }}
              src={heroUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'saturate(1.15) brightness(0.95)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,239,207,0.3) 0%, rgba(255,239,207,0.4) 50%, rgba(255,248,232,0.85) 100%)' }} />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 30%, #FFEFCF, #F2A93B 60%, #F26430 100%)' }} />
        )}

        {/* Toran garland at top */}
        <div className="absolute top-0 left-0 right-0 z-20 pt-2">
          <Toran count={28} />
        </div>

        <FallingMarigolds count={10} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.6 }}
          className="relative z-10 text-center px-8 max-w-4xl pt-16">
          <motion.div initial={{ rotate: -180, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ duration: 1.2, delay: 0.4 }}>
            <Marigold size={70} className="mx-auto mb-6" />
          </motion.div>
          <div className="text-[#F26430] tracking-[0.5em] text-[10px] md:text-xs uppercase mb-4 font-bold">~ शुभ विवाह ~ Joyous Union</div>
          <h1 className="font-serif font-light leading-[0.95] mb-2"
            style={{ fontSize: 'clamp(3.5rem, 9vw, 8.5rem)', color: '#3B4E2F', textShadow: '0 2px 10px rgba(242,169,59,0.3)' }}>
            {wedding.brideName}
          </h1>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.6, delay: 1.2 }}
            className="my-3 flex items-center justify-center gap-3">
            <Marigold size={20} color="#F26430" />
            <span className="font-serif italic text-3xl md:text-5xl text-[#F2A93B]">&amp;</span>
            <Marigold size={20} color="#F26430" />
          </motion.div>
          <h1 className="font-serif font-light leading-[0.95] mb-8"
            style={{ fontSize: 'clamp(3.5rem, 9vw, 8.5rem)', color: '#3B4E2F', textShadow: '0 2px 10px rgba(242,169,59,0.3)' }}>
            {wedding.groomName}
          </h1>
          {wedding.tagline && (
            <p className="font-serif italic text-xl md:text-2xl text-[#3B4E2F]/85 max-w-2xl mx-auto mb-8">"{wedding.tagline}"</p>
          )}
          <MarigoldDivider className="max-w-md mx-auto mb-8" />
          <motion.div whileHover={{ scale: 1.05 }} className="inline-flex items-center gap-3 text-[#3B4E2F] tracking-widest text-sm px-6 py-3 bg-gradient-to-r from-[#F2A93B] to-[#F26430] text-white">
            <Calendar className="w-4 h-4" />
            <span>{fmt(wedding.weddingDate)}</span>
          </motion.div>
        </motion.div>
      </section>

      {/* COUNTDOWN */}
      {!cd.done && (
        <section className="py-20 md:py-28 px-4 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #2D6A4F, #1B4332)' }}>
          <Marigold className="absolute top-10 -left-10 opacity-30" size={180} />
          <Marigold className="absolute bottom-10 -right-10 opacity-30" size={180} color="#F26430" />
          <div className="container mx-auto max-w-4xl relative z-10">
            <div className="text-center mb-12 text-[#FFF8E8]">
              <Marigold className="mx-auto mb-4" size={40} />
              <div className="text-[#F2A93B] tracking-[0.4em] text-xs uppercase mb-3">Festive countdown</div>
              <h2 className="font-serif font-light text-4xl md:text-6xl">Until the celebrations</h2>
            </div>
            <div className="grid grid-cols-4 gap-3 md:gap-6">
              {[{ v: cd.days, l: 'Days' }, { v: cd.hours, l: 'Hours' }, { v: cd.minutes, l: 'Min' }, { v: cd.seconds, l: 'Sec' }].map((u, i) => (
                <motion.div key={u.l}
                  initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="aspect-square relative flex flex-col items-center justify-center text-[#3B4E2F]"
                  style={{
                    background: 'linear-gradient(135deg, #F2A93B, #F26430)',
                    boxShadow: '0 12px 30px -10px rgba(242,100,48,0.5)',
                  }}>
                  <div className="absolute top-1 left-1"><Paisley className="text-[#FFF8E8]/50" size={20} /></div>
                  <div className="absolute top-1 right-1"><Paisley className="text-[#FFF8E8]/50" size={20} /></div>
                  <div className="absolute bottom-1 left-1"><Paisley className="text-[#FFF8E8]/50" size={20} /></div>
                  <div className="absolute bottom-1 right-1"><Paisley className="text-[#FFF8E8]/50" size={20} /></div>
                  <div className="font-serif text-5xl md:text-7xl font-light">{String(u.v).padStart(2, '0')}</div>
                  <div className="text-[10px] md:text-xs tracking-[0.3em] uppercase mt-1 text-[#3B4E2F]/80">{u.l}</div>
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
            <Marigold className="mx-auto mb-6" size={70} />
            <div className="text-[#F26430] tracking-[0.4em] text-xs uppercase mb-4 font-bold">Our story</div>
            <h2 className="font-serif italic font-light text-5xl md:text-6xl text-[#3B4E2F] mb-2">A festive love</h2>
            <MarigoldDivider className="max-w-md mx-auto my-10" />
            <div className="relative p-8 md:p-14 bg-[#FFF8E8] border-2 border-[#F2A93B]">
              <Marigold className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#FFF8E8] rounded-full p-1" size={55} />
              <div className="absolute top-2 left-2"><Paisley className="text-[#F2A93B]/40" size={26} /></div>
              <div className="absolute top-2 right-2"><Paisley className="text-[#F2A93B]/40" size={26} /></div>
              <div className="absolute bottom-2 left-2"><Paisley className="text-[#F2A93B]/40" size={26} /></div>
              <div className="absolute bottom-2 right-2"><Paisley className="text-[#F2A93B]/40" size={26} /></div>
              <div className="font-serif text-lg md:text-xl text-[#3B4E2F]/85 leading-relaxed whitespace-pre-line text-left mt-6">
                <span className="float-left font-serif text-7xl leading-none mr-3 mt-1 text-[#F26430]">{wedding.story.charAt(0)}</span>
                {wedding.story.slice(1)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* GALLERY */}
      {gallery.length > 0 && (
        <section className="py-20 md:py-32 px-4 relative" style={{ background: 'linear-gradient(180deg, #FFEFCF, #FFE6B5)' }}>
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <Marigold className="mx-auto mb-4" size={50} color="#F26430" />
              <div className="text-[#F26430] tracking-[0.4em] text-xs uppercase mb-3 font-bold">Joyful frames</div>
              <h2 className="font-serif italic font-light text-5xl md:text-6xl text-[#3B4E2F]">Our album</h2>
              <MarigoldDivider className="mt-8" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {gallery.map((g, i) => (
                <motion.button key={g.publicId || i}
                  initial={{ opacity: 0, rotate: -3, y: 20 }} whileInView={{ opacity: 1, rotate: i % 2 === 0 ? 1 : -1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: (i % 8) * 0.05 }}
                  whileHover={{ rotate: 0, scale: 1.03 }}
                  onClick={() => setLightbox(i)}
                  className={`relative overflow-hidden group ${i % 5 === 0 ? 'md:row-span-2 aspect-square md:aspect-[3/4]' : 'aspect-square'}`}
                  style={{ border: '4px solid #FFF8E8', boxShadow: '0 8px 24px -8px rgba(242,100,48,0.3)' }}>
                  <img src={g.url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                </motion.button>
              ))}
            </div>
          </div>
          <AnimatePresence>
            {lightbox !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-[#1B4332]/95 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
                <button className="absolute top-6 right-6 text-[#F2A93B]" onClick={() => setLightbox(null)}><X /></button>
                <button className="absolute left-4 md:left-12 text-[#F2A93B] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length) }}><ChevronLeft size={32} /></button>
                <button className="absolute right-4 md:right-12 text-[#F2A93B] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length) }}><ChevronRight size={32} /></button>
                <motion.img key={lightbox} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  src={gallery[lightbox].url} alt="" className="max-w-[90vw] max-h-[85vh] object-contain"
                  style={{ border: '6px solid #FFF8E8' }} onClick={(e) => e.stopPropagation()} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* EVENTS */}
      {events.length > 0 && (
        <section className="py-20 md:py-32 px-4 relative">
          <div className="container mx-auto max-w-5xl">
            <div className="text-center mb-16">
              <Marigold className="mx-auto mb-4" size={50} />
              <div className="text-[#F26430] tracking-[0.4em] text-xs uppercase mb-3 font-bold">Festivities</div>
              <h2 className="font-serif italic font-light text-5xl md:text-6xl text-[#3B4E2F]">Celebrate with us</h2>
              <MarigoldDivider className="mt-8" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {events.map((ev, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.1 }}
                  className="relative bg-[#FFF8E8] p-6 md:p-8 border-l-8 border-[#F26430]"
                  style={{ boxShadow: '0 12px 30px -12px rgba(242,100,48,0.25)' }}>
                  <Marigold className="absolute -top-5 -right-5" size={50} color="#F26430" />
                  <div className="flex items-start gap-4 mb-4">
                    <div className="bg-gradient-to-br from-[#F2A93B] to-[#F26430] text-[#FFF8E8] p-4 text-center min-w-[80px]">
                      <div className="text-xs tracking-[0.2em]">{fmtMo(ev.date)}</div>
                      <div className="font-serif text-3xl font-light my-1">{fmtDay(ev.date)}</div>
                      <div className="text-[10px] tracking-[0.2em] opacity-80">{new Date(ev.date).getFullYear()}</div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-serif text-2xl md:text-3xl text-[#3B4E2F] mb-2">{ev.name}</h3>
                      <div className="space-y-1 text-sm text-[#3B4E2F]/80">
                        {ev.startTime && <div className="flex items-center gap-2"><Clock size={14} className="text-[#F26430]" /> {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}</div>}
                        {ev.venue && <div className="flex items-center gap-2"><MapPin size={14} className="text-[#F26430]" /> {ev.venue}</div>}
                      </div>
                    </div>
                  </div>
                  {ev.address && <p className="text-[#3B4E2F]/65 text-sm mb-3 italic">{ev.address}</p>}
                  {ev.description && <p className="text-[#3B4E2F]/80 leading-relaxed mb-4">{ev.description}</p>}
                  {ev.mapsLink && (
                    <a href={ev.mapsLink} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs tracking-widest uppercase px-5 py-2 bg-[#3B4E2F] text-[#FFF8E8] hover:bg-[#2D6A4F] transition">
                      Get directions <MapPin size={12} />
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* RSVP */}
      {wedding.rsvpSettings?.enabled !== false && <MarigoldRSVP wedding={wedding} />}

      {/* GIFT REGISTRY */}
      {wedding.advancedSettings?.giftRegistryLink && (
        <section className="py-20 px-4 text-center" style={{ background: 'linear-gradient(180deg, #FFEFCF, #FFE6B5)' }}>
          <Gift className="w-8 h-8 text-[#F26430] mx-auto mb-4" />
          <h2 className="font-serif italic font-light text-4xl md:text-5xl text-[#3B4E2F] mb-4">A flower from you</h2>
          <p className="text-[#3B4E2F]/70 mb-10 max-w-xl mx-auto italic">Your laughter is our greatest gift. Should you wish to add a bloom, our registry awaits.</p>
          <a href={wedding.advancedSettings.giftRegistryLink} target="_blank" rel="noreferrer"
            className="inline-block bg-gradient-to-r from-[#F2A93B] to-[#F26430] text-white px-10 py-4 text-xs tracking-widest uppercase hover:opacity-90">
            View Registry
          </a>
        </section>
      )}

      {/* FOOTER */}
      <footer className="py-16 px-4 text-center" style={{ background: '#FFF8E8' }}>
        <div className="mb-2"><Toran count={20} /></div>
        <Marigold className="mx-auto my-6" size={60} />
        <div className="font-serif text-3xl text-[#3B4E2F] mb-2">
          {wedding.brideName} <span className="italic text-[#F26430]">&amp;</span> {wedding.groomName}
        </div>
        <div className="text-sm tracking-widest text-[#F26430] uppercase mb-8 font-bold">{fmt(wedding.weddingDate)}</div>
        {wedding.advancedSettings?.socialMedia?.instagram && (
          <a href={wedding.advancedSettings.socialMedia.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#F26430] mb-8"><Instagram size={18} /></a>
        )}
        <MarigoldDivider className="max-w-xs mx-auto mb-6" />
        <div className="text-xs text-[#3B4E2F]/70 tracking-wider italic">With joy &amp; marigolds · <a href="/" className="underline">Powered by Vivoha</a></div>
      </footer>
    </main>
  )
}

function MarigoldRSVP({ wedding }) {
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
    <section id="rsvp" className="py-20 md:py-32 px-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #F2A93B, #F26430)' }}>
      <FallingMarigolds count={8} />
      <Marigold className="absolute top-10 -left-10 text-[#FFF8E8]/30" size={200} color="#FFF8E8" />
      <Marigold className="absolute bottom-10 -right-10 text-[#FFF8E8]/30" size={200} color="#FFF8E8" />
      <div className="container mx-auto max-w-2xl relative z-10">
        <div className="text-center mb-12 text-[#FFF8E8]">
          <Marigold className="mx-auto mb-4" size={50} color="#FFF8E8" />
          <div className="text-[#FFF8E8] tracking-[0.4em] text-xs uppercase mb-3 font-bold">RSVP</div>
          <h2 className="font-serif italic font-light text-5xl md:text-6xl">Bloom with us</h2>
          {wedding.rsvpSettings?.deadline && (
            <p className="mt-4 text-[#FFF8E8] text-sm italic">Kindly reply by {fmt(wedding.rsvpSettings.deadline)}</p>
          )}
        </div>

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#FFF8E8] p-12 text-center text-[#3B4E2F]">
            <Marigold className="mx-auto mb-4" size={70} color="#F26430" />
            <h3 className="font-serif text-4xl mb-3 italic">Your bloom is received!</h3>
            <p>We cannot wait to celebrate with you in colour and joy.</p>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="space-y-6 bg-[#FFF8E8] p-6 md:p-10 border-4 border-[#3B4E2F]">
            <div>
              <label className="text-xs tracking-widest uppercase text-[#F26430] block mb-2 font-bold">Your name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b-2 border-[#F2A93B] py-3 focus:outline-none focus:border-[#F26430] text-[#3B4E2F]" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs tracking-widest uppercase text-[#F26430] block mb-2 font-bold">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-[#F2A93B] py-3 focus:outline-none focus:border-[#F26430] text-[#3B4E2F]" />
              </div>
              <div>
                <label className="text-xs tracking-widest uppercase text-[#F26430] block mb-2 font-bold">WhatsApp Number *</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent border-b-2 border-[#F2A93B] py-3 focus:outline-none focus:border-[#F26430] text-[#3B4E2F]" />
              </div>
            </div>
            <div>
              <label className="text-xs tracking-widest uppercase text-[#F26430] block mb-3 font-bold">Joining the joy? *</label>
              <div className="grid grid-cols-3 gap-3">
                {[{ v: 'yes', l: 'Joyfully' }, { v: 'maybe', l: 'Maybe' }, { v: 'no', l: 'Regretfully' }].map((o) => (
                  <button type="button" key={o.v} onClick={() => setAttending(o.v)}
                    className="py-3 sm:py-4 px-1 text-[10px] sm:text-xs leading-tight tracking-wider sm:tracking-widest uppercase border-2 transition break-words"
                    style={{
                      background: attending === o.v ? 'linear-gradient(135deg, #F2A93B, #F26430)' : 'transparent',
                      color: attending === o.v ? '#FFF8E8' : '#3B4E2F',
                      borderColor: attending === o.v ? '#F26430' : '#F2A93B',
                    }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            {attending === 'yes' && (
              <>
                <div>
                  <label className="text-xs tracking-widest uppercase text-[#F26430] block mb-2 font-bold">Guests</label>
                  <input type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(e.target.value)}
                    className="w-full bg-transparent border-b-2 border-[#F2A93B] py-3 focus:outline-none focus:border-[#F26430] text-[#3B4E2F]" />
                </div>
                {mealOptions.length > 0 && (
                  <div>
                    <label className="text-xs tracking-widest uppercase text-[#F26430] block mb-3 font-bold">Meal</label>
                    <div className="flex flex-wrap gap-2">
                      {mealOptions.map((m) => (
                        <button type="button" key={m} onClick={() => setMeal(m)}
                          className="px-5 py-2 text-xs tracking-widest uppercase border-2 transition"
                          style={{
                            background: meal === m ? 'linear-gradient(135deg, #F2A93B, #F26430)' : 'transparent',
                            color: meal === m ? '#FFF8E8' : '#3B4E2F',
                            borderColor: meal === m ? '#F26430' : '#F2A93B',
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
              <label className="text-xs tracking-widest uppercase text-[#F26430] block mb-2 font-bold">A wish for the couple</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                className="w-full bg-transparent border-b-2 border-[#F2A93B] py-3 focus:outline-none focus:border-[#F26430] resize-none text-[#3B4E2F]" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-5 tracking-widest text-xs uppercase transition hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #F2A93B, #F26430)', color: '#FFF8E8' }}>
              {submitting ? 'Sending blooms…' : 'Send Marigolds'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

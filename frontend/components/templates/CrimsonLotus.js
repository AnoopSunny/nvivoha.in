'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MapPin, Clock, Calendar, Check, ChevronLeft, ChevronRight, X, Gift, Instagram, Flower2 } from 'lucide-react'
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

// ===== SVG FLORAL ORNAMENTS =====
const Peony = ({ className = '', size = 80 }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} className={className} fill="none">
    <g stroke="currentColor" strokeWidth="1" strokeLinecap="round">
      <circle cx="50" cy="50" r="6" fill="currentColor" opacity="0.4" />
      {[0, 60, 120, 180, 240, 300].map((a, i) => (
        <ellipse key={i} cx="50" cy="30" rx="10" ry="18" transform={`rotate(${a} 50 50)`} fill="currentColor" opacity="0.15" />
      ))}
      {[30, 90, 150, 210, 270, 330].map((a, i) => (
        <ellipse key={i} cx="50" cy="34" rx="8" ry="14" transform={`rotate(${a} 50 50)`} fill="currentColor" opacity="0.25" />
      ))}
      {[0, 60, 120, 180, 240, 300].map((a, i) => (
        <ellipse key={i} cx="50" cy="42" rx="5" ry="8" transform={`rotate(${a} 50 50)`} fill="currentColor" opacity="0.4" />
      ))}
    </g>
  </svg>
)
const Sprig = ({ className = '', size = 100 }) => (
  <svg viewBox="0 0 120 100" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
    <path d="M10 50 Q40 30 60 50 T110 50" />
    <ellipse cx="22" cy="42" rx="6" ry="3" transform="rotate(-30 22 42)" fill="currentColor" opacity="0.4" />
    <ellipse cx="35" cy="36" rx="7" ry="3.5" transform="rotate(-20 35 36)" fill="currentColor" opacity="0.4" />
    <ellipse cx="50" cy="38" rx="6" ry="3" transform="rotate(10 50 38)" fill="currentColor" opacity="0.4" />
    <ellipse cx="70" cy="46" rx="7" ry="3.5" transform="rotate(20 70 46)" fill="currentColor" opacity="0.4" />
    <ellipse cx="85" cy="40" rx="6" ry="3" transform="rotate(30 85 40)" fill="currentColor" opacity="0.4" />
    <ellipse cx="98" cy="46" rx="5" ry="2.5" transform="rotate(40 98 46)" fill="currentColor" opacity="0.4" />
    <ellipse cx="28" cy="58" rx="6" ry="3" transform="rotate(30 28 58)" fill="currentColor" opacity="0.4" />
    <ellipse cx="58" cy="62" rx="7" ry="3.5" transform="rotate(-15 58 62)" fill="currentColor" opacity="0.4" />
    <ellipse cx="78" cy="60" rx="6" ry="3" transform="rotate(-25 78 60)" fill="currentColor" opacity="0.4" />
  </svg>
)
const FloralDivider = ({ className = '' }) => (
  <div className={`flex items-center justify-center gap-4 ${className}`}>
    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#C97B82]/60 to-[#C97B82]/60" />
    <Peony className="text-[#C97B82]" size={36} />
    <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#C97B82]/60 to-[#C97B82]/60" />
  </div>
)

// ===== FLOATING PETALS =====
function FloatingPetals({ count = 14 }) {
  const petals = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 12,
    duration: 14 + Math.random() * 10,
    size: 12 + Math.random() * 18,
    rotate: Math.random() * 360,
    color: ['#F5C9CD', '#E5A7AD', '#C97B82', '#F2D5C4'][Math.floor(Math.random() * 4)],
    drift: -30 + Math.random() * 60,
  })), [count])
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {petals.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: '-10vh', rotate: p.rotate, opacity: 0 }}
          animate={{
            y: '110vh',
            x: [`${p.x}vw`, `${p.x + p.drift}vw`, `${p.x + p.drift / 2}vw`],
            rotate: p.rotate + 360,
            opacity: [0, 0.9, 0.9, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
          className="absolute"
        >
          <svg width={p.size} height={p.size} viewBox="0 0 20 20" fill={p.color}>
            <path d="M10 1 Q14 4 14 10 Q14 16 10 19 Q6 16 6 10 Q6 4 10 1" />
          </svg>
        </motion.div>
      ))}
    </div>
  )
}

export default function CrimsonLotusTemplate({ wedding }) {
  const [lightbox, setLightbox] = useState(null)
  const cd = useCountdown(wedding.weddingDate)
  const heroUrl = wedding.heroImage?.url
  const gallery = wedding.gallery || []
  const events = wedding.events || []

  return (
    <main className="min-h-screen text-[#5A2A30]" style={{
      background: 'linear-gradient(180deg, #FFF5F2 0%, #FDEDE9 100%)',
    }}>
      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {heroUrl ? (
          <>
            <motion.img initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 2.5, ease: 'easeOut' }}
              src={heroUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#FFF5F2]/40 via-[#FFF5F2]/30 to-[#FFF5F2]/85" />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, transparent 30%, #FFF5F2 100%)', opacity: 0.6 }} />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 20%, #FBDCD3, transparent 50%), radial-gradient(circle at 70% 80%, #E5A7AD, transparent 60%), #FFF5F2' }} />
        )}

        <FloatingPetals count={14} />

        {/* Corner sprigs */}
        <Sprig className="absolute top-8 left-4 md:top-12 md:left-12 text-[#7A8F70] rotate-180 hidden md:block" size={140} />
        <Sprig className="absolute top-8 right-4 md:top-12 md:right-12 text-[#7A8F70] -scale-y-100 hidden md:block" size={140} />
        <Sprig className="absolute bottom-12 left-12 text-[#7A8F70] -scale-x-100 hidden md:block" size={140} />
        <Sprig className="absolute bottom-12 right-12 text-[#7A8F70] hidden md:block" size={140} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4, delay: 0.4 }}
          className="relative z-10 text-center px-8 max-w-4xl">
          <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}>
            <Peony className="mx-auto mb-6 text-[#C97B82]" size={70} />
          </motion.div>
          <div className="text-[#C97B82] tracking-[0.45em] text-xs uppercase mb-5 font-light">A garden in bloom</div>
          <h1 className="font-serif italic font-light leading-[0.95] mb-2 text-[#5A2A30]" style={{ fontSize: 'clamp(3.5rem, 9vw, 8rem)' }}>
            {wedding.brideName}
          </h1>
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, delay: 1.2 }}
            className="my-3 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-[#C97B82]" />
            <Heart className="text-[#C97B82]" size={18} fill="currentColor" />
            <div className="h-px w-12 bg-[#C97B82]" />
          </motion.div>
          <h1 className="font-serif italic font-light leading-[0.95] mb-8 text-[#5A2A30]" style={{ fontSize: 'clamp(3.5rem, 9vw, 8rem)' }}>
            {wedding.groomName}
          </h1>
          {wedding.tagline && (
            <p className="font-serif italic text-xl md:text-2xl text-[#5A2A30]/80 max-w-2xl mx-auto mb-8">"{wedding.tagline}"</p>
          )}
          <FloralDivider className="max-w-md mx-auto mb-8" />
          <div className="inline-flex items-center gap-3 text-[#C97B82] tracking-widest text-sm">
            <Calendar className="w-4 h-4" />
            <span>{fmt(wedding.weddingDate)}</span>
          </div>
        </motion.div>

        {/* Bottom wave */}
        <svg className="absolute bottom-0 left-0 right-0 w-full pointer-events-none" viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0 60 Q360 20 720 60 T1440 60 V80 H0 Z" fill="#FDEDE9" />
        </svg>
      </section>

      {/* COUNTDOWN */}
      {!cd.done && (
        <section className="py-20 md:py-28 px-4 relative overflow-hidden">
          <Peony className="absolute -left-12 top-1/2 -translate-y-1/2 text-[#E5A7AD]/30 hidden md:block" size={250} />
          <Peony className="absolute -right-12 top-1/4 text-[#E5A7AD]/30 hidden md:block" size={200} />
          <div className="container mx-auto max-w-4xl relative z-10">
            <div className="text-center mb-12">
              <Sprig className="mx-auto mb-4 text-[#7A8F70]" size={80} />
              <div className="text-[#C97B82] tracking-[0.4em] text-xs uppercase mb-3">Counting moments</div>
              <h2 className="font-serif italic font-light text-4xl md:text-6xl text-[#5A2A30]">Until we bloom together</h2>
            </div>
            <div className="grid grid-cols-4 gap-3 md:gap-6">
              {[{ v: cd.days, l: 'Days' }, { v: cd.hours, l: 'Hours' }, { v: cd.minutes, l: 'Min' }, { v: cd.seconds, l: 'Sec' }].map((u, i) => (
                <motion.div key={u.l}
                  initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="aspect-square flex flex-col items-center justify-center relative" style={{
                    background: 'linear-gradient(135deg, #FFF5F2, #FBDCD3)',
                    boxShadow: '0 10px 30px -10px rgba(201,123,130,0.25)',
                    borderRadius: '60% 40% 50% 50% / 50%',
                  }}>
                  <div className="font-serif italic text-5xl md:text-7xl text-[#5A2A30] font-light">{String(u.v).padStart(2, '0')}</div>
                  <div className="text-[10px] md:text-xs tracking-[0.3em] uppercase mt-2 text-[#C97B82]">{u.l}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* STORY */}
      {wedding.story && (
        <section className="py-20 md:py-32 px-4 relative">
          <div className="container mx-auto max-w-3xl text-center">
            <motion.div initial={{ scale: 0, rotate: 180 }} whileInView={{ scale: 1, rotate: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
              <Peony className="mx-auto mb-6 text-[#C97B82]" size={80} />
            </motion.div>
            <div className="text-[#C97B82] tracking-[0.4em] text-xs uppercase mb-4">Our garden</div>
            <h2 className="font-serif italic font-light text-5xl md:text-6xl text-[#5A2A30] mb-4">How we grew</h2>
            <FloralDivider className="max-w-md mx-auto mb-12" />
            <motion.div initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
              className="relative">
              <div className="absolute -top-6 -left-6 hidden md:block">
                <Sprig className="text-[#7A8F70]" size={80} />
              </div>
              <div className="absolute -bottom-6 -right-6 hidden md:block">
                <Sprig className="text-[#7A8F70] rotate-180" size={80} />
              </div>
              <div className="font-serif text-lg md:text-xl text-[#5A2A30]/85 leading-relaxed whitespace-pre-line text-left bg-white/70 backdrop-blur p-8 md:p-14 relative" style={{ borderRadius: '40px 8px 40px 8px' }}>
                <span className="float-left font-serif italic text-7xl leading-none mr-3 mt-1 text-[#C97B82]">{wedding.story.charAt(0)}</span>
                {wedding.story.slice(1)}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* GALLERY */}
      {gallery.length > 0 && (
        <section className="py-20 md:py-32 px-4 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #FDEDE9, #F8E0D8)' }}>
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <Sprig className="mx-auto mb-4 text-[#7A8F70]" size={80} />
              <div className="text-[#C97B82] tracking-[0.4em] text-xs uppercase mb-3">Petals of memory</div>
              <h2 className="font-serif italic font-light text-5xl md:text-6xl text-[#5A2A30]">Our bouquet</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gallery.map((g, i) => (
                <motion.button key={g.publicId || i}
                  initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: (i % 8) * 0.05 }}
                  onClick={() => setLightbox(i)}
                  className={`relative overflow-hidden group ${i % 5 === 0 ? 'md:row-span-2 aspect-square md:aspect-[3/4]' : 'aspect-square'}`}
                  style={{ borderRadius: i % 2 === 0 ? '50% 8px 50% 8px' : '8px 50% 8px 50%', boxShadow: '0 8px 24px -8px rgba(201,123,130,0.3)' }}>
                  <img src={g.url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#C97B82]/30 to-transparent opacity-0 group-hover:opacity-100 transition" />
                </motion.button>
              ))}
            </div>
          </div>
          <AnimatePresence>
            {lightbox !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-[#5A2A30]/95 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
                <button className="absolute top-6 right-6 text-[#FFF5F2]" onClick={() => setLightbox(null)}><X /></button>
                <button className="absolute left-4 md:left-12 text-[#FFF5F2] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length) }}><ChevronLeft size={32} /></button>
                <button className="absolute right-4 md:right-12 text-[#FFF5F2] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length) }}><ChevronRight size={32} /></button>
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
        <section className="py-20 md:py-32 px-4 relative">
          <Peony className="absolute top-20 -left-10 text-[#E5A7AD]/20 hidden md:block" size={200} />
          <Peony className="absolute bottom-20 -right-10 text-[#E5A7AD]/20 hidden md:block" size={200} />
          <div className="container mx-auto max-w-5xl relative z-10">
            <div className="text-center mb-16">
              <Peony className="mx-auto mb-4 text-[#C97B82]" size={60} />
              <div className="text-[#C97B82] tracking-[0.4em] text-xs uppercase mb-3">Festivities</div>
              <h2 className="font-serif italic font-light text-5xl md:text-6xl text-[#5A2A30]">Bloom with us</h2>
              <FloralDivider className="max-w-md mx-auto mt-8" />
            </div>
            <div className="space-y-10 relative">
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#C97B82]/40 to-transparent hidden md:block" />
              {events.map((ev, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
                  className={`md:grid md:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? 'md:[&>div:first-child]:order-2' : ''}`}>
                  <div className={`flex ${i % 2 === 1 ? 'md:justify-start' : 'md:justify-end'}`}>
                    <div className="bg-white/80 backdrop-blur p-6 md:p-8 max-w-sm w-full relative" style={{
                      borderRadius: i % 2 === 0 ? '40px 8px 40px 8px' : '8px 40px 8px 40px',
                      boxShadow: '0 15px 40px -15px rgba(201,123,130,0.3)',
                    }}>
                      <Peony className="absolute -top-6 -right-6 text-[#C97B82] bg-[#FFF5F2] rounded-full p-1" size={50} />
                      <div className="text-xs tracking-[0.4em] uppercase text-[#C97B82] mb-2">Scene {String(i + 1).padStart(2, '0')}</div>
                      <h3 className="font-serif italic text-3xl md:text-4xl text-[#5A2A30] mb-3">{ev.name}</h3>
                      <div className="text-[#7A8F70] text-sm tracking-wider mb-4">
                        {fmtDay(ev.date)} {fmtMo(ev.date)} {new Date(ev.date).getFullYear()}
                      </div>
                      <div className="space-y-2 mb-4">
                        {ev.startTime && (
                          <div className="flex items-center gap-2 text-sm text-[#5A2A30]/80">
                            <Clock size={14} className="text-[#C97B82]" /> {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}
                          </div>
                        )}
                        {ev.venue && (
                          <div className="flex items-start gap-2 text-sm text-[#5A2A30]/80">
                            <MapPin size={14} className="text-[#C97B82] mt-0.5 flex-shrink-0" />
                            <span><strong>{ev.venue}</strong>{ev.address && <span className="block text-[#5A2A30]/60">{ev.address}</span>}</span>
                          </div>
                        )}
                      </div>
                      {ev.description && <p className="text-[#5A2A30]/75 leading-relaxed italic mb-4">{ev.description}</p>}
                      {ev.mapsLink && (
                        <a href={ev.mapsLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-[#C97B82] hover:text-[#5A2A30] transition">
                          Get directions <MapPin size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="hidden md:flex justify-center">
                    <div className="w-3 h-3 rounded-full bg-[#C97B82] ring-4 ring-[#FFF5F2]" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* RSVP */}
      {wedding.rsvpSettings?.enabled !== false && <CrimsonRSVP wedding={wedding} />}

      {/* GIFT REGISTRY */}
      {wedding.advancedSettings?.giftRegistryLink && (
        <section className="py-20 px-4 text-center" style={{ background: 'linear-gradient(180deg, #FDEDE9, #FFF5F2)' }}>
          <Gift className="w-8 h-8 text-[#C97B82] mx-auto mb-4" />
          <h2 className="font-serif italic font-light text-4xl md:text-5xl text-[#5A2A30] mb-4">A bloom from you</h2>
          <p className="text-[#5A2A30]/70 mb-8 max-w-xl mx-auto italic">Your presence is petal-perfect. Should you wish to gift, our registry awaits.</p>
          <a href={wedding.advancedSettings.giftRegistryLink} target="_blank" rel="noreferrer"
            className="inline-block bg-[#C97B82] text-[#FFF5F2] px-10 py-4 text-xs tracking-widest uppercase hover:bg-[#5A2A30] transition" style={{ borderRadius: '40px' }}>
            View Registry
          </a>
        </section>
      )}

      {/* FOOTER */}
      <footer className="py-16 px-4 text-center relative overflow-hidden" style={{ background: '#FFF5F2' }}>
        <Sprig className="mx-auto mb-4 text-[#7A8F70]" size={100} />
        <div className="font-serif italic text-3xl text-[#5A2A30] mb-2">{wedding.brideName} <Heart className="inline w-4 h-4 mx-1 text-[#C97B82]" fill="currentColor" /> {wedding.groomName}</div>
        <div className="text-sm tracking-widest text-[#C97B82] uppercase mb-8">{fmt(wedding.weddingDate)}</div>
        {wedding.advancedSettings?.socialMedia?.instagram && (
          <a href={wedding.advancedSettings.socialMedia.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#C97B82] mb-8"><Instagram size={18} /></a>
        )}
        <FloralDivider className="max-w-xs mx-auto mb-6" />
        <div className="text-xs text-[#C97B82]/70 tracking-wider italic">Made with love · <a href="/" className="underline">Powered by Vivoha</a></div>
      </footer>
    </main>
  )
}

function CrimsonRSVP({ wedding }) {
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
    <section id="rsvp" className="py-20 md:py-32 px-4 relative overflow-hidden" style={{
      background: 'linear-gradient(135deg, #F8E0D8 0%, #FBDCD3 50%, #F5C9CD 100%)',
    }}>
      <Peony className="absolute top-10 -left-10 text-[#C97B82]/20" size={200} />
      <Peony className="absolute bottom-10 -right-10 text-[#C97B82]/20" size={200} />
      <FloatingPetals count={8} />
      <div className="container mx-auto max-w-2xl relative z-10">
        <div className="text-center mb-12">
          <Heart className="mx-auto mb-4 text-[#C97B82]" size={36} fill="currentColor" />
          <div className="text-[#C97B82] tracking-[0.4em] text-xs uppercase mb-3">RSVP</div>
          <h2 className="font-serif italic font-light text-5xl md:text-6xl text-[#5A2A30]">Bloom with us?</h2>
          {wedding.rsvpSettings?.deadline && (
            <p className="mt-4 text-[#C97B82] text-sm italic">Kindly reply by {fmt(wedding.rsvpSettings.deadline)}</p>
          )}
        </div>

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="p-12 text-center bg-white/80 backdrop-blur" style={{ borderRadius: '40px' }}>
            <Peony className="mx-auto mb-4 text-[#C97B82]" size={80} />
            <h3 className="font-serif italic text-4xl text-[#5A2A30] mb-3">Petals received</h3>
            <p className="text-[#5A2A30]/70">We cannot wait to bloom with you on our special day.</p>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="space-y-6 bg-white/70 backdrop-blur p-6 md:p-10" style={{ borderRadius: '40px 8px 40px 8px' }}>
            <div>
              <label className="text-xs tracking-widest uppercase text-[#C97B82] block mb-2">Your name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b border-[#C97B82]/40 py-3 focus:outline-none focus:border-[#5A2A30] text-[#5A2A30]" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs tracking-widest uppercase text-[#C97B82] block mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-[#C97B82]/40 py-3 focus:outline-none focus:border-[#5A2A30] text-[#5A2A30]" />
              </div>
              <div>
                <label className="text-xs tracking-widest uppercase text-[#C97B82] block mb-2">WhatsApp Number *</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-transparent border-b border-[#C97B82]/40 py-3 focus:outline-none focus:border-[#5A2A30] text-[#5A2A30]" />
              </div>
            </div>
            <div>
              <label className="text-xs tracking-widest uppercase text-[#C97B82] block mb-3">Will you attend? *</label>
              <div className="grid grid-cols-3 gap-3">
                {[{ v: 'yes', l: 'Joyfully' }, { v: 'maybe', l: 'Maybe' }, { v: 'no', l: 'Regretfully' }].map((o) => (
                  <button type="button" key={o.v} onClick={() => setAttending(o.v)}
                    className={`py-3 sm:py-4 px-1 text-[10px] sm:text-xs leading-tight tracking-wider sm:tracking-widest uppercase transition break-words ${attending === o.v ? 'bg-[#C97B82] text-white' : 'bg-white/60 text-[#5A2A30] hover:bg-white'}`}
                    style={{ borderRadius: '30px' }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            {attending === 'yes' && (
              <>
                <div>
                  <label className="text-xs tracking-widest uppercase text-[#C97B82] block mb-2">Guests</label>
                  <input type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(e.target.value)}
                    className="w-full bg-transparent border-b border-[#C97B82]/40 py-3 focus:outline-none focus:border-[#5A2A30] text-[#5A2A30]" />
                </div>
                {mealOptions.length > 0 && (
                  <div>
                    <label className="text-xs tracking-widest uppercase text-[#C97B82] block mb-3">Meal</label>
                    <div className="flex flex-wrap gap-2">
                      {mealOptions.map((m) => (
                        <button type="button" key={m} onClick={() => setMeal(m)}
                          className={`px-5 py-2 text-xs tracking-widest uppercase transition ${meal === m ? 'bg-[#C97B82] text-white' : 'bg-white/60 text-[#5A2A30] hover:bg-white'}`}
                          style={{ borderRadius: '20px' }}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div>
              <label className="text-xs tracking-widest uppercase text-[#C97B82] block mb-2">A wish for the couple</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                className="w-full bg-transparent border-b border-[#C97B82]/40 py-3 focus:outline-none focus:border-[#5A2A30] resize-none text-[#5A2A30]" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full bg-[#C97B82] hover:bg-[#5A2A30] text-white py-5 tracking-widest text-xs uppercase transition" style={{ borderRadius: '40px' }}>
              {submitting ? 'Sending love…' : 'Send Wishes'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

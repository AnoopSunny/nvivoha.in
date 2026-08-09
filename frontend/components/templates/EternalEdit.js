'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { Heart, MapPin, Clock, Calendar, Check, ChevronLeft, ChevronRight, X, Gift, Instagram, ArrowDown, Sun, Moon } from 'lucide-react'
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

export default function EternalEditTemplate({ wedding }) {
  const [dark, setDark] = useState(true)
  const [lightbox, setLightbox] = useState(null)
  const cd = useCountdown(wedding.weddingDate)
  const heroUrl = wedding.heroImage?.url
  const gallery = wedding.gallery || []
  const events = wedding.events || []
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '40%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  const bg = dark ? '#0A0A0A' : '#F5F5F0'
  const text = dark ? '#F5F5F0' : '#0A0A0A'
  const muted = dark ? '#A0A0A0' : '#555'
  const accent = '#D4A574'
  const surface = dark ? '#141414' : '#FFFFFF'

  return (
    <main style={{ background: bg, color: text }} className="min-h-screen transition-colors duration-500">
      {/* THEME TOGGLE */}
      <button onClick={() => setDark(!dark)} aria-label="Toggle theme"
        className="fixed top-6 right-6 z-50 p-3 backdrop-blur-md border transition hover:scale-105"
        style={{ borderColor: text + '40', background: bg + 'cc', color: text }}>
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* HERO — full-bleed cinematic */}
      <section ref={heroRef} className="relative h-screen overflow-hidden">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0">
          {heroUrl ? (
            <>
              <motion.img initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ duration: 3, ease: 'easeOut' }}
                src={heroUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/30 to-black/90" />
              <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 50%, transparent 0%, ${dark ? '#0A0A0A' : '#000'}80 100%)` }} />
            </>
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(135deg, #1a1a1a, #2a2a2a, #1a1a1a)` }} />
          )}
        </motion.div>

        {/* Letterbox bars */}
        <div className="absolute top-0 left-0 right-0 h-16 md:h-20 bg-black z-10" />
        <div className="absolute bottom-0 left-0 right-0 h-16 md:h-20 bg-black z-10" />

        {/* Top meta */}
        <div className="absolute top-0 left-0 right-0 z-20 h-16 md:h-20 flex items-center justify-between px-6 md:px-12 text-white/70 text-[10px] md:text-xs tracking-[0.4em] uppercase">
          <span>Vivoha · Eternal</span>
          <span className="hidden md:inline">Chapter One</span>
          <span>{new Date(wedding.weddingDate).getFullYear()}</span>
        </div>

        {/* Center title */}
        <div className="relative z-20 h-full flex items-end pb-24 md:pb-32 px-6 md:px-16">
          <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4, delay: 0.6 }}
            className="max-w-6xl">
            <div className="text-white/60 tracking-[0.5em] text-[10px] md:text-xs uppercase mb-6">A film about us</div>
            <h1 className="font-serif font-light text-white leading-[0.9] mb-6"
              style={{ fontSize: 'clamp(3.5rem, 11vw, 11rem)' }}>
              {wedding.brideName}
              <span className="block italic font-extralight" style={{ color: accent }}>&amp;</span>
              {wedding.groomName}
            </h1>
            {wedding.tagline && (
              <p className="font-serif italic text-xl md:text-3xl text-white/85 max-w-3xl mb-6">"{wedding.tagline}"</p>
            )}
            <div className="flex items-center gap-6 text-white/80">
              <div className="h-px w-12" style={{ background: accent }} />
              <span className="tracking-widest text-sm uppercase">{fmt(wedding.weddingDate)}</span>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 2 }}
          className="absolute bottom-24 right-6 md:right-12 z-20 flex flex-col items-center gap-2 text-white/60 text-[10px] tracking-widest uppercase">
          <span>Scroll</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <ArrowDown size={14} />
          </motion.div>
        </motion.div>
      </section>

      {/* COUNTDOWN — clean bold cards */}
      {!cd.done && (
        <section className="py-24 md:py-32 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-baseline gap-6 mb-16">
              <div className="text-xs tracking-[0.5em] uppercase" style={{ color: muted }}>01 / Countdown</div>
              <div className="flex-1 h-px" style={{ background: text + '20' }} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: text + '20' }}>
              {[{ v: cd.days, l: 'Days' }, { v: cd.hours, l: 'Hours' }, { v: cd.minutes, l: 'Minutes' }, { v: cd.seconds, l: 'Seconds' }].map((u) => (
                <div key={u.l} className="p-8 md:p-12" style={{ background: bg }}>
                  <div className="font-serif font-light leading-none" style={{ fontSize: 'clamp(3rem, 7vw, 6rem)' }}>
                    {String(u.v).padStart(2, '0')}
                  </div>
                  <div className="text-xs tracking-[0.4em] uppercase mt-4" style={{ color: muted }}>{u.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* STORY */}
      {wedding.story && (
        <section className="py-24 md:py-40 px-6" style={{ background: surface }}>
          <div className="max-w-5xl mx-auto">
            <div className="flex items-baseline gap-6 mb-16">
              <div className="text-xs tracking-[0.5em] uppercase" style={{ color: muted }}>02 / The Story</div>
              <div className="flex-1 h-px" style={{ background: text + '20' }} />
            </div>
            <h2 className="font-serif font-light mb-12" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', lineHeight: 1.1 }}>
              How it began<span style={{ color: accent }}>.</span>
            </h2>
            <div className="grid md:grid-cols-12 gap-8">
              <div className="md:col-span-2">
                <div className="font-serif italic text-lg" style={{ color: accent }}>Chapter 02</div>
              </div>
              <div className="md:col-span-10">
                <p className="text-xl md:text-2xl leading-relaxed whitespace-pre-line font-light">
                  {wedding.story}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* GALLERY — edge-to-edge */}
      {gallery.length > 0 && (
        <section className="py-24 md:py-32">
          <div className="px-6 max-w-7xl mx-auto mb-16">
            <div className="flex items-baseline gap-6 mb-8">
              <div className="text-xs tracking-[0.5em] uppercase" style={{ color: muted }}>03 / Frames</div>
              <div className="flex-1 h-px" style={{ background: text + '20' }} />
            </div>
            <h2 className="font-serif font-light" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', lineHeight: 1.1 }}>
              In moving images<span style={{ color: accent }}>.</span>
            </h2>
          </div>
          {/* Horizontal scroll strip */}
          <div className="overflow-x-auto pb-4 px-6 scrollbar-thin" style={{ scrollbarWidth: 'thin' }}>
            <div className="flex gap-2 w-max">
              {gallery.map((g, i) => (
                <motion.button key={g.publicId || i}
                  initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.05 }}
                  onClick={() => setLightbox(i)}
                  className="flex-shrink-0 relative overflow-hidden group"
                  style={{ height: '70vh', maxHeight: '600px', width: i % 3 === 0 ? '50vw' : '32vw', minWidth: '280px' }}>
                  <img src={g.url} alt="" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                  <div className="absolute bottom-4 left-4 text-white/0 group-hover:text-white/80 text-xs tracking-widest uppercase transition">
                    {String(i + 1).padStart(2, '0')} / {String(gallery.length).padStart(2, '0')}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
          <div className="px-6 mt-4 text-xs uppercase tracking-widest" style={{ color: muted }}>← Scroll horizontally →</div>

          <AnimatePresence>
            {lightbox !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
                <button className="absolute top-6 right-6 text-white/80 hover:text-white" onClick={() => setLightbox(null)}><X /></button>
                <div className="absolute top-6 left-6 text-white/60 text-xs tracking-widest uppercase">
                  Frame {String(lightbox + 1).padStart(2, '0')} / {String(gallery.length).padStart(2, '0')}
                </div>
                <button className="absolute left-4 md:left-12 text-white/80 hover:text-white p-2"
                  onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length) }}><ChevronLeft size={32} /></button>
                <button className="absolute right-4 md:right-12 text-white/80 hover:text-white p-2"
                  onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length) }}><ChevronRight size={32} /></button>
                <motion.img key={lightbox} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
                  src={gallery[lightbox].url} alt="" className="max-w-[92vw] max-h-[88vh] object-contain"
                  onClick={(e) => e.stopPropagation()} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* EVENTS — bold cinematic timeline */}
      {events.length > 0 && (
        <section className="py-24 md:py-40 px-6" style={{ background: surface }}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-baseline gap-6 mb-16">
              <div className="text-xs tracking-[0.5em] uppercase" style={{ color: muted }}>04 / The Scenes</div>
              <div className="flex-1 h-px" style={{ background: text + '20' }} />
            </div>
            <h2 className="font-serif font-light mb-16" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', lineHeight: 1.1 }}>
              Join us<span style={{ color: accent }}>.</span>
            </h2>
            <div className="space-y-0">
              {events.map((ev, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
                  className="grid md:grid-cols-12 gap-6 py-10 border-t" style={{ borderColor: text + '20' }}>
                  <div className="md:col-span-2 text-xs tracking-[0.4em] uppercase" style={{ color: accent }}>
                    Scene {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="md:col-span-3">
                    <div className="font-serif font-light leading-none" style={{ fontSize: 'clamp(3rem, 5vw, 5rem)' }}>{fmtDay(ev.date)}</div>
                    <div className="text-xs tracking-[0.4em] uppercase mt-2" style={{ color: muted }}>{fmtMo(ev.date)} {new Date(ev.date).getFullYear()}</div>
                  </div>
                  <div className="md:col-span-7">
                    <h3 className="font-serif text-3xl md:text-5xl mb-4 font-light">{ev.name}</h3>
                    <div className="space-y-2 mb-5">
                      {ev.startTime && (
                        <div className="flex items-center gap-3 text-sm" style={{ color: muted }}>
                          <Clock size={14} style={{ color: accent }} />
                          {ev.startTime}{ev.endTime ? ` — ${ev.endTime}` : ''}
                        </div>
                      )}
                      {ev.venue && (
                        <div className="flex items-center gap-3 text-sm" style={{ color: muted }}>
                          <MapPin size={14} style={{ color: accent }} />
                          {ev.venue}
                        </div>
                      )}
                    </div>
                    {ev.address && <p className="mb-3 leading-relaxed" style={{ color: muted }}>{ev.address}</p>}
                    {ev.description && <p className="mb-5 leading-relaxed text-lg font-light">{ev.description}</p>}
                    {ev.mapsLink && (
                      <a href={ev.mapsLink} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 text-xs tracking-widest uppercase py-3 px-6 border transition hover:bg-current hover:text-white"
                        style={{ borderColor: text, color: text }}>
                        Get directions
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
      {wedding.rsvpSettings?.enabled !== false && (
        <EternalRSVP wedding={wedding} bg={bg} text={text} muted={muted} accent={accent} surface={surface} dark={dark} />
      )}

      {/* GIFT REGISTRY */}
      {wedding.advancedSettings?.giftRegistryLink && (
        <section className="py-24 px-6 text-center" style={{ background: surface }}>
          <Gift className="w-8 h-8 mx-auto mb-6" style={{ color: accent }} />
          <h2 className="font-serif font-light text-4xl md:text-5xl mb-4">With gratitude<span style={{ color: accent }}>.</span></h2>
          <p className="mb-10 max-w-xl mx-auto text-lg font-light" style={{ color: muted }}>Your presence is the only gift we need.</p>
          <a href={wedding.advancedSettings.giftRegistryLink} target="_blank" rel="noreferrer"
            className="inline-block px-10 py-3 sm:py-4 px-1 text-[10px] sm:text-xs leading-tight tracking-wider sm:tracking-widest uppercase border transition break-words hover:opacity-80"
            style={{ borderColor: text, color: text }}>
            View Registry
          </a>
        </section>
      )}

      {/* FOOTER */}
      <footer className="py-20 px-6 text-center">
        <div className="font-serif text-3xl md:text-4xl mb-2 font-light">{wedding.brideName} <span className="italic" style={{ color: accent }}>&amp;</span> {wedding.groomName}</div>
        <div className="text-xs tracking-[0.4em] uppercase mb-8" style={{ color: muted }}>{fmt(wedding.weddingDate)}</div>
        {wedding.advancedSettings?.socialMedia?.instagram && (
          <a href={wedding.advancedSettings.socialMedia.instagram} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 mb-8 transition hover:opacity-70" style={{ color: accent }}><Instagram size={18} /></a>
        )}
        <div className="text-xs tracking-widest uppercase opacity-50">Fin. · <a href="/" className="underline">Powered by Vivoha</a></div>
      </footer>
    </main>
  )
}

function EternalRSVP({ wedding, bg, text, muted, accent, surface, dark }) {
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

  const inputCls = 'w-full bg-transparent border-b py-3 focus:outline-none transition'
  const borderC = text + '30'
  const borderCFocus = accent

  return (
    <section id="rsvp" className="py-24 md:py-40 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-baseline gap-6 mb-16">
          <div className="text-xs tracking-[0.5em] uppercase" style={{ color: muted }}>05 / RSVP</div>
          <div className="flex-1 h-px" style={{ background: text + '20' }} />
        </div>
        <h2 className="font-serif font-light mb-12" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', lineHeight: 1.1 }}>
          Will you join the cast<span style={{ color: accent }}>?</span>
        </h2>
        {wedding.rsvpSettings?.deadline && (
          <p className="mb-10 text-sm tracking-widest uppercase" style={{ color: muted }}>Please respond by {fmt(wedding.rsvpSettings.deadline)}</p>
        )}

        {success ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="border p-12 text-center" style={{ borderColor: accent }}>
            <Check className="w-12 h-12 mx-auto mb-4" style={{ color: accent }} />
            <h3 className="font-serif text-3xl mb-3 font-light">Scene confirmed<span style={{ color: accent }}>.</span></h3>
            <p style={{ color: muted }}>We can't wait to share this story with you.</p>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="space-y-8">
            <div>
              <label className="text-xs tracking-widest uppercase block mb-3" style={{ color: muted }}>Your name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls}
                style={{ borderColor: borderC, color: text }} onFocus={(e) => e.target.style.borderColor = borderCFocus} onBlur={(e) => e.target.style.borderColor = borderC} />
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <label className="text-xs tracking-widest uppercase block mb-3" style={{ color: muted }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls}
                  style={{ borderColor: borderC, color: text }} />
              </div>
              <div>
                <label className="text-xs tracking-widest uppercase block mb-3" style={{ color: muted }}>WhatsApp Number *</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls}
                  style={{ borderColor: borderC, color: text }} />
              </div>
            </div>
            <div>
              <label className="text-xs tracking-widest uppercase block mb-4" style={{ color: muted }}>Attending? *</label>
              <div className="grid grid-cols-3 gap-2">
                {[{ v: 'yes', l: 'Joyfully' }, { v: 'maybe', l: 'Maybe' }, { v: 'no', l: 'Regretfully' }].map((o) => (
                  <button type="button" key={o.v} onClick={() => setAttending(o.v)}
                    className="py-3 sm:py-4 px-1 text-[10px] sm:text-xs leading-tight tracking-wider sm:tracking-widest uppercase border transition break-words"
                    style={{
                      borderColor: attending === o.v ? accent : borderC,
                      background: attending === o.v ? accent : 'transparent',
                      color: attending === o.v ? bg : text,
                    }}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            {attending === 'yes' && (
              <>
                <div>
                  <label className="text-xs tracking-widest uppercase block mb-3" style={{ color: muted }}>Number of guests</label>
                  <input type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(e.target.value)} className={inputCls}
                    style={{ borderColor: borderC, color: text }} />
                </div>
                {mealOptions.length > 0 && (
                  <div>
                    <label className="text-xs tracking-widest uppercase block mb-4" style={{ color: muted }}>Meal</label>
                    <div className="flex flex-wrap gap-2">
                      {mealOptions.map((m) => (
                        <button type="button" key={m} onClick={() => setMeal(m)}
                          className="px-5 py-2 text-xs tracking-widest uppercase border transition"
                          style={{
                            borderColor: meal === m ? accent : borderC,
                            background: meal === m ? accent : 'transparent',
                            color: meal === m ? bg : text,
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
              <label className="text-xs tracking-widest uppercase block mb-3" style={{ color: muted }}>A line for the couple</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className={`${inputCls} resize-none`}
                style={{ borderColor: borderC, color: text }} />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full py-5 tracking-widest text-xs uppercase border transition hover:opacity-80"
              style={{ background: accent, color: bg, borderColor: accent }}>
              {submitting ? 'Sending…' : 'Confirm Scene'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

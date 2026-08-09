'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MapPin, Clock, Calendar, Check, ChevronLeft, ChevronRight, X, Music, Gift, Instagram } from 'lucide-react'
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
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return { days, hours, minutes, seconds, done: mounted && ms === 0 }
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return d }
}
function formatMonth(d) {
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short' }).toUpperCase() } catch { return '' }
}
function formatDay(d) {
  try { return new Date(d).getDate() } catch { return '' }
}

export default function MoonveilTemplate({ wedding }) {
  const [lightbox, setLightbox] = useState(null) // index
  const cd = useCountdown(wedding.weddingDate)
  const heroUrl = wedding.heroImage?.url
  const gallery = wedding.gallery || []
  const events = wedding.events || []

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#1F2937]">
      {/* HERO */}
      <section className="relative h-screen flex items-end justify-center overflow-hidden">
        {heroUrl ? (
          <>
            <motion.img
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              src={heroUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#3A3226] via-[#8B7355] to-[#C9B896]" />
        )}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="relative z-10 text-center text-white pb-24 px-6"
        >
          <div className="tracking-[0.4em] text-xs uppercase mb-8 text-white/80">Save our date</div>
          <h1 className="font-serif font-light text-6xl md:text-8xl lg:text-9xl leading-[0.95] mb-8">
            {wedding.brideName}
            <br />
            <span className="italic text-white/90 text-5xl md:text-7xl lg:text-8xl">&amp;</span>
            <br />
            {wedding.groomName}
          </h1>
          {wedding.tagline && (
            <p className="font-serif italic text-xl md:text-2xl text-white/90 max-w-2xl mx-auto mb-8">"{wedding.tagline}"</p>
          )}
          <div className="inline-flex items-center gap-4 border border-white/40 px-8 py-3 backdrop-blur-sm">
            <Calendar className="w-4 h-4" />
            <span className="tracking-widest text-sm">{formatDate(wedding.weddingDate)}</span>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/70 text-xs tracking-widest"
        >
          SCROLL
          <div className="w-px h-12 bg-white/40 mx-auto mt-2 animate-pulse" />
        </motion.div>
      </section>

      {/* COUNTDOWN */}
      {!cd.done && (
        <section className="py-20 md:py-28 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <div className="text-[#8B7355] tracking-[0.4em] text-xs uppercase mb-4">Counting the days</div>
              <h2 className="font-serif font-light text-4xl md:text-5xl text-[#3A3226]">Until forever begins</h2>
            </div>
            <div className="grid grid-cols-4 gap-3 md:gap-6">
              {[
                { v: cd.days, l: 'Days' },
                { v: cd.hours, l: 'Hours' },
                { v: cd.minutes, l: 'Minutes' },
                { v: cd.seconds, l: 'Seconds' },
              ].map((u) => (
                <div key={u.l} className="aspect-square flex flex-col items-center justify-center bg-[#3A3226] text-[#FDFBF7]">
                  <div className="font-serif text-4xl md:text-6xl font-light">{String(u.v).padStart(2, '0')}</div>
                  <div className="text-[10px] md:text-xs tracking-[0.3em] uppercase mt-2 text-[#C9B896]">{u.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* STORY */}
      {wedding.story && (
        <section className="py-20 md:py-32 px-4">
          <div className="container mx-auto max-w-3xl text-center">
            <Heart className="w-6 h-6 text-[#8B7355] mx-auto mb-6" />
            <div className="text-[#8B7355] tracking-[0.4em] text-xs uppercase mb-6">Our story</div>
            <h2 className="font-serif font-light text-4xl md:text-6xl text-[#3A3226] mb-12">How it all began</h2>
            <div className="font-serif text-lg md:text-xl text-[#3A3226]/85 leading-relaxed whitespace-pre-line text-left">
              <span className="float-left font-serif text-7xl leading-none mr-3 mt-1 text-[#8B7355]">
                {wedding.story.charAt(0)}
              </span>
              {wedding.story.slice(1)}
            </div>
            <div className="mt-16 flex items-center justify-center gap-3 text-[#C9B896]">
              <div className="h-px w-12 bg-[#C9B896]" />
              <Heart className="w-3 h-3" fill="currentColor" />
              <div className="h-px w-12 bg-[#C9B896]" />
            </div>
          </div>
        </section>
      )}

      {/* GALLERY */}
      {gallery.length > 0 && (
        <section className="py-20 md:py-32 px-4 bg-[#F5EFE4]">
          <div className="container mx-auto">
            <div className="text-center mb-16">
              <div className="text-[#8B7355] tracking-[0.4em] text-xs uppercase mb-4">Moments</div>
              <h2 className="font-serif font-light text-4xl md:text-6xl text-[#3A3226]">A glimpse of us</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {gallery.map((g, i) => (
                <motion.button
                  key={g.publicId || i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: (i % 8) * 0.05 }}
                  onClick={() => setLightbox(i)}
                  className={`relative overflow-hidden group ${i % 5 === 0 ? 'md:row-span-2 aspect-square md:aspect-[3/4]' : 'aspect-square'}`}
                >
                  <img src={g.url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-[#3A3226]/0 group-hover:bg-[#3A3226]/20 transition" />
                </motion.button>
              ))}
            </div>
          </div>
          <AnimatePresence>
            {lightbox !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
                onClick={() => setLightbox(null)}
              >
                <button className="absolute top-6 right-6 text-white" onClick={() => setLightbox(null)}><X /></button>
                <button className="absolute left-4 md:left-12 text-white p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length) }}><ChevronLeft size={32} /></button>
                <button className="absolute right-4 md:right-12 text-white p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length) }}><ChevronRight size={32} /></button>
                <motion.img
                  key={lightbox}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={gallery[lightbox].url}
                  alt=""
                  className="max-w-[90vw] max-h-[85vh] object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
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
              <div className="text-[#8B7355] tracking-[0.4em] text-xs uppercase mb-4">Wedding events</div>
              <h2 className="font-serif font-light text-4xl md:text-6xl text-[#3A3226]">Join us in celebration</h2>
            </div>
            <div className="space-y-8">
              {events.map((ev, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7 }}
                  className="flex flex-col md:flex-row gap-6 border-l-2 border-[#C9B896] pl-6 md:border-l-0 md:pl-0"
                >
                  <div className="md:w-40 flex-shrink-0">
                    <div className="bg-[#3A3226] text-[#FDFBF7] aspect-square flex flex-col items-center justify-center p-4">
                      <div className="text-xs tracking-[0.3em] text-[#C9B896]">{formatMonth(ev.date)}</div>
                      <div className="font-serif text-5xl font-light my-1">{formatDay(ev.date)}</div>
                      <div className="text-xs tracking-[0.3em] text-[#C9B896]">{new Date(ev.date).getFullYear()}</div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-3xl md:text-4xl text-[#3A3226] mb-2">{ev.name}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-[#8B7355] mb-3">
                      {ev.startTime && (
                        <span className="flex items-center gap-2"><Clock size={14} /> {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}</span>
                      )}
                      {ev.venue && (
                        <span className="flex items-center gap-2"><MapPin size={14} /> {ev.venue}</span>
                      )}
                    </div>
                    {ev.address && <p className="text-[#3A3226]/75 mb-3">{ev.address}</p>}
                    {ev.description && <p className="text-[#3A3226]/70 leading-relaxed mb-4">{ev.description}</p>}
                    {ev.mapsLink && (
                      <a href={ev.mapsLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs tracking-widest uppercase border border-[#3A3226] text-[#3A3226] px-5 py-2 hover:bg-[#3A3226] hover:text-[#FDFBF7] transition">
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
      {wedding.rsvpSettings?.enabled !== false && (
        <RSVPSection wedding={wedding} />
      )}

      {/* GIFT REGISTRY */}
      {wedding.advancedSettings?.giftRegistryLink && (
        <section className="py-20 px-4 bg-[#F5EFE4]">
          <div className="container mx-auto max-w-2xl text-center">
            <Gift className="w-8 h-8 text-[#8B7355] mx-auto mb-4" />
            <h2 className="font-serif text-3xl md:text-4xl text-[#3A3226] mb-4">With love</h2>
            <p className="text-[#3A3226]/70 mb-8">Your presence is our greatest gift. If you wish to celebrate further, our registry awaits.</p>
            <a href={wedding.advancedSettings.giftRegistryLink} target="_blank" rel="noreferrer" className="inline-block bg-[#3A3226] text-[#FDFBF7] px-10 py-4 text-xs tracking-widest uppercase hover:bg-[#1F1A14]">
              View Registry
            </a>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="py-16 px-4 text-center border-t border-[#C9B896]/30">
        <Heart className="w-5 h-5 text-[#8B7355] mx-auto mb-4" />
        <div className="font-serif text-3xl text-[#3A3226] mb-2">{wedding.brideName} <span className="italic text-[#8B7355]">&amp;</span> {wedding.groomName}</div>
        <div className="text-sm tracking-widest text-[#8B7355] uppercase mb-8">{formatDate(wedding.weddingDate)}</div>
        {wedding.advancedSettings?.socialMedia?.instagram && (
          <a href={wedding.advancedSettings.socialMedia.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#8B7355] mb-8"><Instagram size={18} /></a>
        )}
        <div className="text-xs text-[#8B7355]/70 tracking-wider">
          Made with love · <a href="/" className="underline">Powered by Vivoha</a>
        </div>
      </footer>
    </main>
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
    if (!attending) { toast.error('Please let us know if you can attend'); return }
    if (!phone.trim()) { toast.error('WhatsApp number is required'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingSlug: wedding.slug,
          name, email, phone, attending,
          guests: Number(guests),
          mealPreferences: meal ? [meal] : [],
          message,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setSuccess(true)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="rsvp" className="py-20 md:py-32 px-4 bg-[#3A3226] text-[#FDFBF7]">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-12">
          <div className="text-[#C9B896] tracking-[0.4em] text-xs uppercase mb-4">RSVP</div>
          <h2 className="font-serif font-light text-4xl md:text-6xl">Will you be there?</h2>
          {wedding.rsvpSettings?.deadline && (
            <p className="mt-4 text-[#C9B896] text-sm">Please respond by {formatDate(wedding.rsvpSettings.deadline)}</p>
          )}
        </div>

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="border border-[#C9B896] p-12 text-center">
            <Check className="w-12 h-12 text-[#C9B896] mx-auto mb-4" />
            <h3 className="font-serif text-3xl mb-3">Thank you</h3>
            <p className="text-[#FDFBF7]/80">Your response has been recorded. We can&apos;t wait to celebrate with you.</p>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="space-y-6">
            <div>
              <label className="text-xs tracking-widest uppercase text-[#C9B896] block mb-2">Your name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent border-b border-[#C9B896]/50 py-3 focus:outline-none focus:border-[#FDFBF7]" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs tracking-widest uppercase text-[#C9B896] block mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border-b border-[#C9B896]/50 py-3 focus:outline-none focus:border-[#FDFBF7]" />
              </div>
              <div>
                <label className="text-xs tracking-widest uppercase text-[#C9B896] block mb-2">WhatsApp Number *</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-transparent border-b border-[#C9B896]/50 py-3 focus:outline-none focus:border-[#FDFBF7]" />
              </div>
            </div>

            <div>
              <label className="text-xs tracking-widest uppercase text-[#C9B896] block mb-3">Can you attend? *</label>
              <div className="grid grid-cols-3 gap-3">
                {[{ v: 'yes', l: 'Joyfully' }, { v: 'maybe', l: 'Maybe' }, { v: 'no', l: 'Regretfully' }].map((o) => (
                  <button type="button" key={o.v} onClick={() => setAttending(o.v)}
                    className={`py-3 sm:py-4 px-1 text-[10px] sm:text-xs leading-tight tracking-wider sm:tracking-widest uppercase border transition break-words ${attending === o.v ? 'bg-[#C9B896] text-[#3A3226] border-[#C9B896]' : 'border-[#C9B896]/40 hover:border-[#C9B896]'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            {attending === 'yes' && (
              <>
                <div>
                  <label className="text-xs tracking-widest uppercase text-[#C9B896] block mb-2">Number of guests (including you)</label>
                  <input type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(e.target.value)} className="w-full bg-transparent border-b border-[#C9B896]/50 py-3 focus:outline-none focus:border-[#FDFBF7]" />
                </div>
                {mealOptions.length > 0 && (
                  <div>
                    <label className="text-xs tracking-widest uppercase text-[#C9B896] block mb-3">Meal preference</label>
                    <div className="flex flex-wrap gap-2">
                      {mealOptions.map((m) => (
                        <button type="button" key={m} onClick={() => setMeal(m)}
                          className={`px-5 py-2 text-xs tracking-widest uppercase border transition ${meal === m ? 'bg-[#C9B896] text-[#3A3226] border-[#C9B896]' : 'border-[#C9B896]/40 hover:border-[#C9B896]'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="text-xs tracking-widest uppercase text-[#C9B896] block mb-2">A note for the couple</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full bg-transparent border-b border-[#C9B896]/50 py-3 focus:outline-none focus:border-[#FDFBF7] resize-none" />
            </div>

            <button type="submit" disabled={submitting} className="w-full bg-[#C9B896] hover:bg-[#FDFBF7] text-[#3A3226] py-5 tracking-widest text-xs uppercase transition">
              {submitting ? 'Sending…' : 'Send RSVP'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Clock, Calendar, Check, ChevronLeft, ChevronRight, X, Gift, Instagram } from 'lucide-react'
import { toast } from 'sonner'

// ===== PALETTE =====
// maroon  #6B1F1F   sacred temple maroon
// brass   #B8860B   metallic brass gold
// cream   #FBF4E6   sandalwood cream
// teal    #1F5F5F   southern temple teal
// red     #A02020   bridal red

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
const Gopuram = ({ className = '', flip = false }) => (
  <svg viewBox="0 0 80 200" className={className} style={{ transform: flip ? 'scaleX(-1)' : 'none' }} fill="currentColor" aria-hidden>
    {/* Stepped temple tower */}
    <rect x="20" y="180" width="40" height="20" />
    <rect x="15" y="160" width="50" height="20" />
    <rect x="18" y="142" width="44" height="18" />
    <rect x="21" y="124" width="38" height="18" />
    <rect x="24" y="108" width="32" height="16" />
    <rect x="27" y="94" width="26" height="14" />
    <rect x="29" y="82" width="22" height="12" />
    <rect x="31" y="72" width="18" height="10" />
    <rect x="33" y="64" width="14" height="8" />
    <path d="M40 20 L46 64 L34 64 Z" />
    <circle cx="40" cy="14" r="6" />
    <rect x="38" y="0" width="4" height="14" />
  </svg>
)

const KalashIcon = ({ className = '' }) => (
  <svg viewBox="0 0 60 80" className={className} fill="currentColor" aria-hidden>
    {/* Sacred pot */}
    <ellipse cx="30" cy="60" rx="22" ry="16" />
    <path d="M10 60 Q10 30 30 26 Q50 30 50 60 Z" />
    <rect x="20" y="20" width="20" height="8" />
    <rect x="22" y="14" width="16" height="6" />
    {/* Mango leaves */}
    <path d="M30 14 Q14 4 8 18 Q18 14 30 14" />
    <path d="M30 14 Q46 4 52 18 Q42 14 30 14" />
    <path d="M30 14 Q26 0 30 2 Q34 0 30 14" />
    {/* Coconut on top */}
    <ellipse cx="30" cy="6" rx="5" ry="4" />
  </svg>
)

const Conch = ({ className = '' }) => (
  <svg viewBox="0 0 80 80" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path d="M14 56 Q14 24 40 18 Q66 14 68 36 Q70 56 50 60 Q40 62 38 54 Q36 46 46 44 Q56 42 54 50" />
    <path d="M14 56 Q22 70 40 70 Q56 70 62 60" />
  </svg>
)

const BananaLeaf = ({ className = '' }) => (
  <svg viewBox="0 0 200 60" className={className} fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
    <path d="M10 30 Q100 0 190 30 Q100 60 10 30 Z" />
    <path d="M10 30 L190 30" />
    {Array.from({ length: 18 }).map((_, i) => (
      <path key={i} d={`M${20 + i * 9} 30 L${24 + i * 9} ${30 - (Math.sin(i / 3) * 8 + 12)}`} />
    ))}
    {Array.from({ length: 18 }).map((_, i) => (
      <path key={`b${i}`} d={`M${20 + i * 9} 30 L${24 + i * 9} ${30 + (Math.sin(i / 3) * 8 + 12)}`} />
    ))}
  </svg>
)

const Kolam = ({ className = '' }) => (
  <svg viewBox="0 0 120 120" className={className} fill="currentColor" stroke="currentColor" strokeWidth="0.6" aria-hidden>
    {/* dot grid */}
    {[...Array(5)].map((_, r) =>
      [...Array(5)].map((__, c) => <circle key={`${r}${c}`} cx={20 + c * 20} cy={20 + r * 20} r="1.4" />)
    )}
    {/* curved connecting lines */}
    <path d="M20 20 Q40 0 60 20 Q80 40 100 20 Q120 0 100 -10" fill="none" strokeWidth="1.2" />
    <path d="M20 100 Q40 120 60 100 Q80 80 100 100" fill="none" strokeWidth="1.2" />
    <path d="M20 60 Q0 40 20 20" fill="none" strokeWidth="1.2" />
    <path d="M100 60 Q120 40 100 20" fill="none" strokeWidth="1.2" />
    <path d="M20 60 Q40 80 60 60 Q80 40 100 60" fill="none" strokeWidth="1.2" />
    <circle cx="60" cy="60" r="6" fill="none" strokeWidth="1.2" />
  </svg>
)

const CornerBracket = ({ className = '', rotate = 0 }) => (
  <svg viewBox="0 0 60 60" className={className} style={{ transform: `rotate(${rotate}deg)` }} fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
    <path d="M2 30 Q2 2 30 2" />
    <path d="M8 30 Q8 8 30 8" />
    <circle cx="30" cy="30" r="3" fill="currentColor" />
    <path d="M14 20 Q14 14 20 14 L24 14" strokeWidth="0.8" />
  </svg>
)

// ===== TEMPLATE =====
export default function BanyanBrassTemplate({ wedding }) {
  const [lightbox, setLightbox] = useState(null)
  const cd = useCountdown(wedding.weddingDate)
  const gallery = wedding.gallery || []
  const events = wedding.events || []

  return (
    <main className="min-h-screen bg-[#FBF4E6] text-[#3D1414] selection:bg-[#B8860B] selection:text-[#FBF4E6]" style={{ fontFamily: 'Georgia, "Cormorant Garamond", serif' }}>
      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {wedding.heroImage?.url && (
          <>
            <motion.img initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 2.4, ease: 'easeOut' }} src={wedding.heroImage.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#6B1F1F]/85 via-[#3D1414]/65 to-[#6B1F1F]/90" />
          </>
        )}
        {!wedding.heroImage?.url && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#6B1F1F] via-[#3D1414] to-[#6B1F1F]" />
        )}

        {/* Gopuram silhouettes at bottom */}
        <Gopuram className="absolute bottom-0 left-4 w-16 md:w-24 h-auto text-[#B8860B]/30" />
        <Gopuram flip className="absolute bottom-0 right-4 w-16 md:w-24 h-auto text-[#B8860B]/30" />

        {/* Brass double border frame */}
        <div className="absolute inset-6 md:inset-10 border border-[#B8860B]/50 pointer-events-none" />
        <div className="absolute inset-10 md:inset-14 border border-[#B8860B]/25 pointer-events-none" />

        {/* Brass corner brackets */}
        <CornerBracket className="absolute top-8 left-8 md:top-12 md:left-12 w-10 md:w-14 text-[#B8860B]" />
        <CornerBracket rotate={90} className="absolute top-8 right-8 md:top-12 md:right-12 w-10 md:w-14 text-[#B8860B]" />
        <CornerBracket rotate={-90} className="absolute bottom-8 left-8 md:bottom-12 md:left-12 w-10 md:w-14 text-[#B8860B]" />
        <CornerBracket rotate={180} className="absolute bottom-8 right-8 md:bottom-12 md:right-12 w-10 md:w-14 text-[#B8860B]" />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4, delay: 0.4 }} className="relative z-10 text-center px-6 max-w-4xl">
          <div className="font-serif text-[#B8860B] tracking-[0.5em] text-xs md:text-sm uppercase mb-6">॥ ॐ श्री गणेशाय नमः ॥</div>
          <div className="text-[#FBF4E6]/85 tracking-[0.4em] text-[10px] uppercase mb-8">A Sacred Union</div>
          <h1 className="text-[#FBF4E6] font-light italic leading-[0.95]">
            <span className="block text-5xl md:text-7xl lg:text-8xl">{wedding.brideName}</span>
            <span className="inline-flex items-center gap-6 my-4 md:my-6">
              <span className="h-px w-12 md:w-20 bg-[#B8860B]" />
              <span className="text-[#B8860B] text-3xl md:text-5xl">&amp;</span>
              <span className="h-px w-12 md:w-20 bg-[#B8860B]" />
            </span>
            <span className="block text-5xl md:text-7xl lg:text-8xl">{wedding.groomName}</span>
          </h1>
          {wedding.tagline && (
            <p className="mt-8 text-[#FBF4E6]/90 italic text-lg md:text-xl max-w-2xl mx-auto">"{wedding.tagline}"</p>
          )}
          <div className="mt-10 inline-flex flex-col items-center gap-2 px-8 py-4 border border-[#B8860B] text-[#B8860B]">
            <div className="flex items-center gap-3">
              <Calendar size={14} />
              <span className="tracking-[0.3em] text-xs md:text-sm uppercase">{fmtDate(wedding.weddingDate)}</span>
            </div>
            {hasTime(wedding.weddingDate) && (
              <div className="flex items-center gap-2 text-[#FBF4E6]">
                <span className="text-[10px] tracking-[0.3em] uppercase text-[#B8860B]">Muhurtham</span>
                <span className="font-serif italic text-base">{fmtTime(wedding.weddingDate)}</span>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[#FBF4E6]/60 text-[10px] tracking-[0.4em] uppercase">
          ↓ Scroll
        </motion.div>
      </section>

      {/* ===== KOLAM DIVIDER ===== */}
      <SectionDivider />

      {/* ===== COUNTDOWN ===== */}
      {!cd.done && (
        <section className="py-20 md:py-28 px-4 bg-[#FBF4E6]">
          <div className="container mx-auto max-w-4xl">
            <SectionHeader eyebrow="The Auspicious Day" title="Until our forever begins" />
            <div className="grid grid-cols-4 gap-3 md:gap-6 mt-12">
              {[
                { v: cd.days, l: 'Days' }, { v: cd.hours, l: 'Hours' },
                { v: cd.minutes, l: 'Minutes' }, { v: cd.seconds, l: 'Seconds' },
              ].map((u) => (
                <div key={u.l} className="relative aspect-square flex flex-col items-center justify-center bg-[#6B1F1F] text-[#FBF4E6] border border-[#B8860B]">
                  <CornerBracket className="absolute top-1 left-1 w-4 md:w-6 text-[#B8860B]/70" />
                  <CornerBracket rotate={90} className="absolute top-1 right-1 w-4 md:w-6 text-[#B8860B]/70" />
                  <CornerBracket rotate={-90} className="absolute bottom-1 left-1 w-4 md:w-6 text-[#B8860B]/70" />
                  <CornerBracket rotate={180} className="absolute bottom-1 right-1 w-4 md:w-6 text-[#B8860B]/70" />
                  <div className="font-serif text-4xl md:text-6xl text-[#B8860B] font-light">{String(u.v).padStart(2, '0')}</div>
                  <div className="text-[9px] md:text-[10px] tracking-[0.3em] uppercase mt-2 text-[#FBF4E6]/80">{u.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== STORY ===== */}
      {wedding.story && (
        <section className="relative py-20 md:py-32 px-4 bg-[#FBF4E6] overflow-hidden">
          <Kolam className="absolute -left-10 top-20 w-48 text-[#B8860B]/10" />
          <Kolam className="absolute -right-10 bottom-20 w-48 text-[#B8860B]/10" />
          <div className="container mx-auto max-w-3xl">
            <div className="text-center">
              <KalashIcon className="w-12 h-12 text-[#B8860B] mx-auto mb-6" />
              <SectionHeader eyebrow="Our Sacred Story" title="A union of two souls" />
            </div>
            <div className="relative mt-12 bg-[#6B1F1F]/[0.03] border border-[#B8860B]/40 p-8 md:p-14">
              <CornerBracket className="absolute -top-3 -left-3 w-8 text-[#B8860B] bg-[#FBF4E6]" />
              <CornerBracket rotate={90} className="absolute -top-3 -right-3 w-8 text-[#B8860B] bg-[#FBF4E6]" />
              <CornerBracket rotate={-90} className="absolute -bottom-3 -left-3 w-8 text-[#B8860B] bg-[#FBF4E6]" />
              <CornerBracket rotate={180} className="absolute -bottom-3 -right-3 w-8 text-[#B8860B] bg-[#FBF4E6]" />
              <div className="font-serif text-lg md:text-xl text-[#3D1414]/90 leading-relaxed whitespace-pre-line italic text-left">
                <span className="float-left font-serif text-7xl leading-none mr-3 mt-1 text-[#B8860B] not-italic">
                  {wedding.story.charAt(0)}
                </span>
                {wedding.story.slice(1)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== GALLERY ===== */}
      {gallery.length > 0 && (
        <section className="relative py-20 md:py-32 px-4 bg-[#6B1F1F] text-[#FBF4E6]">
          <BananaLeaf className="absolute top-6 left-0 w-72 md:w-96 text-[#B8860B]/30" />
          <BananaLeaf className="absolute bottom-6 right-0 w-72 md:w-96 text-[#B8860B]/30 rotate-180" />
          <div className="container mx-auto relative">
            <SectionHeader eyebrow="Moments Together" title="Memories woven in time" tone="dark" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 mt-12">
              {gallery.map((g, i) => (
                <motion.button
                  key={g.publicId || i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: (i % 8) * 0.04 }}
                  onClick={() => setLightbox(i)}
                  className={`relative overflow-hidden group border border-[#B8860B] ${i % 5 === 0 ? 'md:row-span-2 aspect-square md:aspect-[3/4]' : 'aspect-square'}`}
                >
                  <CornerBracket className="absolute top-1.5 left-1.5 w-5 text-[#B8860B] z-10" />
                  <CornerBracket rotate={90} className="absolute top-1.5 right-1.5 w-5 text-[#B8860B] z-10" />
                  <CornerBracket rotate={-90} className="absolute bottom-1.5 left-1.5 w-5 text-[#B8860B] z-10" />
                  <CornerBracket rotate={180} className="absolute bottom-1.5 right-1.5 w-5 text-[#B8860B] z-10" />
                  <img src={g.url} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-[#6B1F1F]/0 group-hover:bg-[#6B1F1F]/30 transition" />
                </motion.button>
              ))}
            </div>
          </div>
          <AnimatePresence>
            {lightbox !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(null)} className="fixed inset-0 z-50 bg-[#3D1414]/95 flex items-center justify-center p-4">
                <button className="absolute top-6 right-6 text-[#B8860B]" onClick={() => setLightbox(null)}><X /></button>
                <button className="absolute left-4 md:left-12 text-[#B8860B] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length) }}><ChevronLeft size={32} /></button>
                <button className="absolute right-4 md:right-12 text-[#B8860B] p-2" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length) }}><ChevronRight size={32} /></button>
                <motion.img key={lightbox} initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={gallery[lightbox].url} alt="" onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[85vh] object-contain border-2 border-[#B8860B]" />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* ===== EVENTS ===== */}
      {events.length > 0 && (
        <section className="relative py-20 md:py-32 px-4 bg-[#FBF4E6] overflow-hidden">
          <Kolam className="absolute -left-20 -top-10 w-60 text-[#1F5F5F]/10" />
          <Kolam className="absolute -right-20 -bottom-10 w-60 text-[#1F5F5F]/10" />
          <div className="container mx-auto max-w-5xl relative">
            <div className="text-center">
              <KalashIcon className="w-12 h-12 text-[#B8860B] mx-auto mb-4" />
              <SectionHeader eyebrow="Wedding Rituals" title="Join us in celebration" />
            </div>
            <div className="space-y-8 mt-14">
              {events.map((ev, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
                  className="relative flex flex-col md:flex-row gap-6 bg-white border border-[#B8860B]/50">
                  <CornerBracket className="absolute -top-2 -left-2 w-6 text-[#B8860B] bg-[#FBF4E6]" />
                  <CornerBracket rotate={90} className="absolute -top-2 -right-2 w-6 text-[#B8860B] bg-[#FBF4E6]" />
                  <CornerBracket rotate={-90} className="absolute -bottom-2 -left-2 w-6 text-[#B8860B] bg-[#FBF4E6]" />
                  <CornerBracket rotate={180} className="absolute -bottom-2 -right-2 w-6 text-[#B8860B] bg-[#FBF4E6]" />
                  <div className="md:w-44 flex-shrink-0 bg-[#6B1F1F] text-[#FBF4E6] flex flex-row md:flex-col items-center justify-center p-4 gap-2 md:gap-1">
                    <div className="text-[10px] tracking-[0.3em] text-[#B8860B]">{fmtMonth(ev.date)}</div>
                    <div className="font-serif text-5xl font-light text-[#B8860B]">{fmtDay(ev.date)}</div>
                    <div className="text-[10px] tracking-[0.3em] text-[#B8860B]">{new Date(ev.date).getFullYear()}</div>
                  </div>
                  <div className="flex-1 p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-2">
                      <KalashIcon className="w-5 h-5 text-[#B8860B]" />
                      <h3 className="font-serif italic text-3xl md:text-4xl text-[#6B1F1F]">{ev.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-[#1F5F5F] mb-3">
                      {ev.startTime && <span className="flex items-center gap-2"><Clock size={14} /> {ev.startTime}{ev.endTime ? ` – ${ev.endTime}` : ''}</span>}
                      {ev.venue && <span className="flex items-center gap-2"><MapPin size={14} /> {ev.venue}</span>}
                    </div>
                    {ev.address && <p className="text-[#3D1414]/75 mb-3">{ev.address}</p>}
                    {ev.description && <p className="text-[#3D1414]/70 leading-relaxed mb-4 italic">{ev.description}</p>}
                    {ev.mapsLink && (
                      <a href={ev.mapsLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs tracking-widest uppercase border border-[#6B1F1F] text-[#6B1F1F] px-5 py-2 hover:bg-[#6B1F1F] hover:text-[#FBF4E6] transition">
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
        <section className="py-20 px-4 bg-[#FBF4E6] border-t border-[#B8860B]/30 text-center">
          <Gift className="w-8 h-8 text-[#B8860B] mx-auto mb-4" />
          <h2 className="font-serif italic text-3xl md:text-4xl text-[#6B1F1F] mb-3">With love &amp; blessings</h2>
          <p className="text-[#3D1414]/70 max-w-xl mx-auto mb-8">Your presence is the greatest blessing. If you wish to gift, our registry awaits.</p>
          <a href={wedding.advancedSettings.giftRegistryLink} target="_blank" rel="noreferrer" className="inline-block bg-[#6B1F1F] text-[#FBF4E6] border border-[#B8860B] px-10 py-4 text-xs tracking-[0.3em] uppercase hover:bg-[#3D1414]">
            View Registry
          </a>
        </section>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="relative py-16 px-4 text-center bg-[#6B1F1F] text-[#FBF4E6] overflow-hidden">
        <Gopuram className="absolute bottom-0 left-6 w-12 md:w-16 text-[#B8860B]/30" />
        <Gopuram flip className="absolute bottom-0 right-6 w-12 md:w-16 text-[#B8860B]/30" />
        <Conch className="w-10 h-10 text-[#B8860B] mx-auto mb-4" />
        <div className="font-serif italic text-3xl text-[#FBF4E6] mb-2">
          {wedding.brideName} <span className="text-[#B8860B] not-italic">&amp;</span> {wedding.groomName}
        </div>
        <div className="text-xs tracking-[0.3em] text-[#B8860B] uppercase mb-6">{fmtDate(wedding.weddingDate)}</div>
        {wedding.advancedSettings?.socialMedia?.instagram && (
          <a href={wedding.advancedSettings.socialMedia.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#B8860B] mb-6"><Instagram size={18} /></a>
        )}
        <div className="text-[10px] text-[#FBF4E6]/50 tracking-[0.3em] uppercase">
          Crafted with reverence · <a href="/" className="underline hover:text-[#B8860B]">Vivoha</a>
        </div>
      </footer>
    </main>
  )
}

function SectionHeader({ eyebrow, title, tone = 'light' }) {
  const eyebrowColor = tone === 'dark' ? 'text-[#B8860B]' : 'text-[#B8860B]'
  const titleColor = tone === 'dark' ? 'text-[#FBF4E6]' : 'text-[#6B1F1F]'
  return (
    <>
      <div className={`tracking-[0.4em] text-[10px] md:text-xs uppercase mb-4 ${eyebrowColor}`}>॥ {eyebrow} ॥</div>
      <h2 className={`font-serif font-light italic text-4xl md:text-6xl ${titleColor}`}>{title}</h2>
    </>
  )
}

function SectionDivider() {
  return (
    <div className="py-10 px-4 bg-[#FBF4E6] flex items-center justify-center gap-6">
      <div className="h-px bg-[#B8860B]/40 flex-1 max-w-xs" />
      <Kolam className="w-12 text-[#B8860B]" />
      <div className="h-px bg-[#B8860B]/40 flex-1 max-w-xs" />
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    <section id="rsvp" className="relative py-20 md:py-32 px-4 bg-[#3D1414] text-[#FBF4E6] overflow-hidden">
      <Kolam className="absolute top-10 left-10 w-32 text-[#B8860B]/15" />
      <Kolam className="absolute bottom-10 right-10 w-32 text-[#B8860B]/15" />
      <div className="container mx-auto max-w-2xl relative">
        <div className="text-center mb-12">
          <Conch className="w-10 h-10 text-[#B8860B] mx-auto mb-4" />
          <div className="text-[#B8860B] tracking-[0.4em] text-xs uppercase mb-4">॥ RSVP ॥</div>
          <h2 className="font-serif italic font-light text-4xl md:text-6xl">Bless our union with your presence</h2>
          {wedding.rsvpSettings?.deadline && (
            <p className="mt-4 text-[#B8860B] text-sm italic">Kindly respond by {fmtDate(wedding.rsvpSettings.deadline)}</p>
          )}
        </div>

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative border border-[#B8860B] p-12 text-center bg-[#6B1F1F]/30">
            <CornerBracket className="absolute -top-2 -left-2 w-8 text-[#B8860B] bg-[#3D1414]" />
            <CornerBracket rotate={90} className="absolute -top-2 -right-2 w-8 text-[#B8860B] bg-[#3D1414]" />
            <CornerBracket rotate={-90} className="absolute -bottom-2 -left-2 w-8 text-[#B8860B] bg-[#3D1414]" />
            <CornerBracket rotate={180} className="absolute -bottom-2 -right-2 w-8 text-[#B8860B] bg-[#3D1414]" />
            <Check className="w-12 h-12 text-[#B8860B] mx-auto mb-4" />
            <h3 className="font-serif italic text-3xl mb-3 text-[#B8860B]">Thank you</h3>
            <p className="text-[#FBF4E6]/85">Your blessings are received. We can't wait to celebrate with you.</p>
          </motion.div>
        ) : (
          <form onSubmit={submit} className="relative border border-[#B8860B] p-6 md:p-10 bg-[#6B1F1F]/20 space-y-6">
            <CornerBracket className="absolute -top-2 -left-2 w-8 text-[#B8860B] bg-[#3D1414]" />
            <CornerBracket rotate={90} className="absolute -top-2 -right-2 w-8 text-[#B8860B] bg-[#3D1414]" />
            <CornerBracket rotate={-90} className="absolute -bottom-2 -left-2 w-8 text-[#B8860B] bg-[#3D1414]" />
            <CornerBracket rotate={180} className="absolute -bottom-2 -right-2 w-8 text-[#B8860B] bg-[#3D1414]" />
            <div>
              <label className="text-[10px] tracking-[0.3em] uppercase text-[#B8860B] block mb-2">Your name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent border-b border-[#B8860B]/60 py-3 focus:outline-none focus:border-[#FBF4E6] text-[#FBF4E6]" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#B8860B] block mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent border-b border-[#B8860B]/60 py-3 focus:outline-none focus:border-[#FBF4E6] text-[#FBF4E6]" />
              </div>
              <div>
                <label className="text-[10px] tracking-[0.3em] uppercase text-[#B8860B] block mb-2">WhatsApp Number *</label>
                <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-transparent border-b border-[#B8860B]/60 py-3 focus:outline-none focus:border-[#FBF4E6] text-[#FBF4E6]" />
              </div>
            </div>
            <div>
              <label className="text-[10px] tracking-[0.3em] uppercase text-[#B8860B] block mb-3">Can you bless us? *</label>
              <div className="grid grid-cols-3 gap-3">
                {[{ v: 'yes', l: 'Joyfully' }, { v: 'maybe', l: 'Maybe' }, { v: 'no', l: 'Regretfully' }].map((o) => (
                  <button type="button" key={o.v} onClick={() => setAttending(o.v)}
                    className={`py-3 sm:py-4 px-1 text-[10px] leading-tight tracking-[0.18em] sm:tracking-[0.3em] uppercase border transition break-words ${attending === o.v ? 'bg-[#B8860B] text-[#3D1414] border-[#B8860B]' : 'border-[#B8860B]/50 hover:border-[#B8860B] text-[#FBF4E6]'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            {attending === 'yes' && (
              <>
                <div>
                  <label className="text-[10px] tracking-[0.3em] uppercase text-[#B8860B] block mb-2">Guests (incl. you)</label>
                  <input type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(e.target.value)} className="w-full bg-transparent border-b border-[#B8860B]/60 py-3 focus:outline-none focus:border-[#FBF4E6] text-[#FBF4E6]" />
                </div>
                {mealOptions.length > 0 && (
                  <div>
                    <label className="text-[10px] tracking-[0.3em] uppercase text-[#B8860B] block mb-3">Meal preference</label>
                    <div className="flex flex-wrap gap-2">
                      {mealOptions.map((m) => (
                        <button type="button" key={m} onClick={() => setMeal(m)}
                          className={`px-5 py-2 text-[10px] tracking-[0.3em] uppercase border transition ${meal === m ? 'bg-[#B8860B] text-[#3D1414] border-[#B8860B]' : 'border-[#B8860B]/50 hover:border-[#B8860B] text-[#FBF4E6]'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div>
              <label className="text-[10px] tracking-[0.3em] uppercase text-[#B8860B] block mb-2">A blessing for the couple</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full bg-transparent border-b border-[#B8860B]/60 py-3 focus:outline-none focus:border-[#FBF4E6] resize-none text-[#FBF4E6]" />
            </div>
            <button type="submit" disabled={submitting} className="w-full bg-[#B8860B] hover:bg-[#FBF4E6] text-[#3D1414] py-5 tracking-[0.4em] text-xs uppercase transition">
              {submitting ? 'Sending…' : '॥ Send Blessings ॥'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}

'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, ChevronRight, Menu, X, Eye,
  Camera, Users, Calendar, Music, Crown, Globe, Heart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import ContactModal from '@/components/ContactModal'
import DemoBuilderModal from '@/components/DemoBuilderModal'
import TemplateCoverCard from '@/components/TemplateCoverCard'
import { CATEGORIES, TEMPLATES, filterByCategory } from '@/lib/templates'

const HERO_IMG = 'https://images.unsplash.com/photo-1756190564669-215843660e93'

const faqs = [
  { q: 'How does Vivoha work?', a: "Pick a template, see it with your names through a free preview, share your story and photos, and publish. Our studio reviews payment and your website goes live — usually within hours." },
  { q: 'Can I edit after publishing?', a: 'Yes. WhatsApp us anytime — updates usually go live within a few hours.' },
  { q: 'Will my website work on phones?', a: 'Every Vivoha site is meticulously crafted to be flawless on every device — phone, tablet, and desktop.' },
  { q: 'How do guests RSVP?', a: 'Guests visit your link and respond with attendance, meal preference, and a personal note. You see every response in real time on your couple dashboard.' },
  { q: 'Is my website private?', a: 'You can password-protect your invite so only invited guests can view it. The password activates after our studio approves your payment.' },
  { q: 'Will my guests need to download anything?', a: 'Nothing to download, nothing to install. Guests open a link — on any phone, any browser. It just works.' },
]

const PLAN_PRICE = 2999
const PLAN_TAGLINE = 'One experience · Every template · Studio-crafted'

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [demoTemplate, setDemoTemplate] = useState(null)
  const [activeCat, setActiveCat] = useState('all')
  const [previewsMap, setPreviewsMap] = useState({})

  useEffect(() => {
    let cancelled = false
    fetch('/api/public/previews')
      .then(r => (r.ok ? r.json() : { previews: {} }))
      .then(d => { if (!cancelled) setPreviewsMap(d.previews || {}) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const filteredTemplates = useMemo(() => filterByCategory(activeCat), [activeCat])

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#3A3226]" data-testid="landing-page">
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} source="landing" />
      <DemoBuilderModal open={!!demoTemplate} onClose={() => setDemoTemplate(null)} template={demoTemplate} />

      {/* NAV */}
      <nav data-testid="nav" className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[#FDFBF7]/90 border-b border-[#C9B896]/30">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <Link href="/" className="font-serif text-2xl tracking-wide text-[#3A3226]" data-testid="brand-link">
            Vivoha<span className="ml-1 text-[#8B7355]">·</span>
          </Link>
          <div className="hidden md:flex items-center gap-9 text-sm tracking-wide">
            <a href="#templates" className="hover:text-[#8B7355] transition" data-testid="nav-templates">Templates</a>
            <a href="#how" className="hover:text-[#8B7355] transition">How it works</a>
            <a href="#investment" className="hover:text-[#8B7355] transition">Investment</a>
            <a href="#faq" className="hover:text-[#8B7355] transition">FAQ</a>
            <Button
              onClick={() => setContactOpen(true)}
              data-testid="nav-contact-btn"
              variant="outline"
              className="border-[#3A3226] text-[#3A3226] hover:bg-[#3A3226] hover:text-[#FDFBF7] rounded-none px-5 py-4 tracking-widest text-[10px] uppercase bg-transparent"
            >
              Contact
            </Button>
          </div>
          <button className="md:hidden p-1" onClick={() => setMobileOpen(!mobileOpen)} aria-label="menu" data-testid="mobile-menu-btn">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-[#C9B896]/30 bg-[#FDFBF7] px-4 py-6 flex flex-col gap-4 text-sm">
            <a href="#templates" onClick={() => setMobileOpen(false)}>Templates</a>
            <a href="#how" onClick={() => setMobileOpen(false)}>How it works</a>
            <a href="#investment" onClick={() => setMobileOpen(false)}>Investment</a>
            <a href="#faq" onClick={() => setMobileOpen(false)}>FAQ</a>
            <Button onClick={() => { setContactOpen(true); setMobileOpen(false) }} className="bg-[#3A3226] text-[#FDFBF7] rounded-none">Contact</Button>
          </div>
        )}
      </nav>

      {/* ===== HERO — Clear, premium, action-first ===== */}
      <section data-testid="hero" className="relative min-h-[92vh] flex items-center pt-20 overflow-hidden">
        {/* Background image with a strong, premium dark overlay for legibility */}
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Luxury Indian wedding" className="w-full h-full object-cover" />
          {/* All-over readability layer for centered hero copy */}
          <div className="absolute inset-0 bg-[#0F0C08]/75" />
          {/* Subtle radial vignette to focus on the central copy */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at center, rgba(15,12,8,0.15) 0%, rgba(15,12,8,0.55) 70%, rgba(15,12,8,0.78) 100%)',
          }} />
          {/* Bottom soft fade to page bg */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#FDFBF7]" />
        </div>

        <div className="container mx-auto relative z-10 px-4 py-20 md:py-28 flex justify-center text-center">
          {/* Centered hero copy — single column, soft & cinematic */}
          <motion.div initial="hidden" animate="show" variants={fadeUp} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#FDFBF7]/95 backdrop-blur-sm px-3 py-1.5 mb-6 shadow-md">
              <Sparkles size={11} className="text-[#8B7355]" />
              <span className="text-[10px] tracking-[0.35em] uppercase text-[#1F1A14] font-medium">
                Indian Wedding Websites · RSVP · Invites
              </span>
            </div>

            <h1
              className="font-serif font-light text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.04] text-[#FDFBF7] mb-6"
              style={{ textShadow: '0 2px 28px rgba(0,0,0,0.85), 0 0 14px rgba(0,0,0,0.6)' }}
            >
              Your wedding, <em className="italic text-[#F0DDA8]">told beautifully</em>.
            </h1>

            <p
              className="text-base md:text-lg text-[#FDFBF7] font-medium leading-relaxed mb-9 max-w-xl mx-auto"
              style={{ textShadow: '0 2px 18px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.8)' }}
            >
              Cinematic wedding websites for Indian couples.
              <br className="hidden sm:block" />
              Beautiful invites, live RSVPs, and your love story —
              <br className="hidden sm:block" />
              in one link your guests will remember.
            </p>

            <div className="flex flex-wrap gap-3 justify-center">
              <a href="#templates">
                <Button
                  data-testid="hero-browse-btn"
                  className="bg-[#F0DDA8] hover:bg-[#FDFBF7] text-[#1F1A14] rounded-none px-7 sm:px-9 py-6 tracking-[0.22em] text-[11px] uppercase shadow-2xl font-semibold"
                >
                  <Sparkles size={14} className="mr-2" /> See It With Your Names — Free <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
              <a href="#how">
                <Button
                  variant="outline"
                  className="border-[#FDFBF7]/70 text-[#FDFBF7] hover:bg-[#FDFBF7] hover:text-[#1F1A14] rounded-none px-7 py-6 tracking-[0.22em] text-[11px] uppercase bg-transparent backdrop-blur-sm"
                >
                  How Vivoha Works
                </Button>
              </a>
            </div>

            {/* Soft centered trust line — replaces the checklist + rating bar */}
            <p
              className="mt-9 text-[11px] md:text-xs tracking-[0.28em] uppercase text-[#FDFBF7]"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}
              data-testid="hero-trust-line"
            >
              <span className="text-[#F0DDA8]">✦</span>&nbsp;&nbsp;No signup to preview&nbsp;&nbsp;
              <span className="text-[#F0DDA8]">✦</span>&nbsp;&nbsp;Live within hours&nbsp;&nbsp;
              <span className="text-[#F0DDA8]">✦</span>&nbsp;&nbsp;Loved by 200+ couples
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===== EMOTION ===== */}
      <section
        data-testid="emotion"
        className="relative py-24 md:py-36 px-6 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #FDFBF7 0%, #F5EFE4 100%)' }}
      >
        {/* whisper of texture */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 30% 40%, #C9B896 1px, transparent 1px), radial-gradient(circle at 70% 60%, #C9B896 1px, transparent 1px)',
          backgroundSize: '60px 60px, 60px 60px',
        }} />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          className="relative max-w-3xl mx-auto text-center"
        >
          <p className="font-serif font-light text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1.18] text-[#3A3226]">
            The moment your guests open the link,
            <br />
            the <em className="italic text-[#8B7355]">wedding begins</em>.
          </p>
          <div className="mt-10 inline-flex items-center gap-3 text-[10px] tracking-[0.45em] uppercase text-[#8B7355]">
            <span className="w-8 h-px bg-[#C9B896]" /> That&apos;s Vivoha <span className="w-8 h-px bg-[#C9B896]" />
          </div>
        </motion.div>
      </section>

      {/* ===== TEMPLATES ===== */}
      <section id="templates" className="py-20 md:py-28 bg-[#F5EFE4]">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="max-w-3xl mb-10 md:mb-14">
            <div className="text-[#8B7355] tracking-[0.3em] text-[10px] uppercase mb-3">Twelve signature designs · Free demo on each</div>
            <h2 className="font-serif font-light text-4xl md:text-5xl text-[#3A3226] leading-tight">
              Choose a <em className="italic">canvas</em> for your story.
            </h2>
            <p className="text-[#3A3226]/70 mt-3 text-sm md:text-base">Hover any template to peek at the real design. Click to try it FREE with your names — instantly.</p>
          </motion.div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2 mb-10 md:mb-12" data-testid="category-chips">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                data-testid={`cat-${c.id}`}
                className={`text-[11px] tracking-[0.18em] uppercase px-4 py-2 border transition ${
                  activeCat === c.id
                    ? 'bg-[#3A3226] border-[#3A3226] text-[#FDFBF7]'
                    : 'bg-transparent border-[#C9B896] text-[#3A3226] hover:border-[#3A3226]'
                }`}
              >
                {c.short}
              </button>
            ))}
          </div>

          {/* Grid */}
          <AnimatePresence mode="popLayout">
            <div data-testid="template-grid" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14" key={activeCat}>
              {filteredTemplates.map((t, i) => {
                const livePreview = previewsMap[t.name]
                const liveSlug = livePreview?.slug
                const coverTemplate = { ...t, slugId: t.slug, liveSlug, coverFontStack: t.coverFontStack }
                return (
                  <motion.article
                    key={t.slug}
                    layout
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: (i % 6) * 0.05, duration: 0.45 }}
                    data-testid={`template-card-${t.slug}`}
                    className="group"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setDemoTemplate(t)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDemoTemplate(t) } }}
                      className="block w-full text-left cursor-pointer"
                      aria-label={`Try ${t.name} free demo`}
                      data-testid={`template-open-demo-${t.slug}`}
                    >
                      <TemplateCoverCard template={coverTemplate} />
                    </div>
                    <h3 className="font-serif text-2xl text-[#3A3226] mt-2">{t.name}</h3>
                    <p className="text-[#8B7355] text-[11px] tracking-[0.2em] uppercase mt-1">{t.subtitle}</p>
                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => setDemoTemplate(t)}
                        data-testid={`template-view-demo-${t.slug}`}
                        className="inline-flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase bg-[#3A3226] hover:bg-[#0F5132] text-[#FDFBF7] px-5 py-2.5 transition"
                      >
                        <Sparkles size={12} /> Try Free Demo
                      </button>
                      {liveSlug && (
                        <a
                          href={`/wedding/${liveSlug}`}
                          target="_blank"
                          rel="noreferrer"
                          data-testid={`template-live-${t.slug}`}
                          className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.25em] uppercase text-[#8B7355] border-b border-transparent hover:border-[#8B7355] pb-0.5 transition"
                        >
                          Live sample <ChevronRight size={11} />
                        </a>
                      )}
                    </div>
                  </motion.article>
                )
              })}
            </div>
          </AnimatePresence>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-16 text-[#8B7355] italic" data-testid="no-templates">
              No designs in this category yet. Check back soon.
            </div>
          )}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="max-w-2xl mb-12">
            <div className="text-[#8B7355] tracking-[0.3em] text-[10px] uppercase mb-3">A simple path</div>
            <h2 className="font-serif font-light text-4xl md:text-5xl text-[#3A3226] leading-tight">
              Your story, <em className="italic">live in hours</em>.
            </h2>
          </motion.div>
          <ol className="grid md:grid-cols-4 gap-8 md:gap-6">
            {[
              { n: '01', t: 'Choose your canvas', d: 'Browse 12 cinematic templates, by tradition and mood.' },
              { n: '02', t: 'See it with your names', d: 'Your personalized preview loads instantly — no signup, no charge.' },
              { n: '03', t: 'Make it yours', d: 'Add your photos, events, venue, and love story.' },
              { n: '04', t: 'Share the moment', d: 'Your website goes live. Send the link. Watch your guests feel it.' },
            ].map((s, i) => (
              <motion.li
                key={s.n}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ delay: i * 0.08 }}
                className="border-t border-[#C9B896]/60 pt-5"
              >
                <div className="font-serif text-[#8B7355]/70 text-3xl mb-3">{s.n}</div>
                <div className="font-serif text-xl text-[#3A3226] mb-2">{s.t}</div>
                <div className="text-sm text-[#3A3226]/65 leading-relaxed">{s.d}</div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== INVESTMENT — single Vivoha experience ===== */}
      <section id="investment" data-testid="investment" className="py-20 md:py-28 bg-[#3A3226] text-[#FDFBF7] relative overflow-hidden">
        {/* Subtle textural backdrop */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 20% 30%, #C9B896 1px, transparent 1px), radial-gradient(circle at 80% 70%, #C9B896 1px, transparent 1px)',
          backgroundSize: '52px 52px, 52px 52px',
        }} />

        <div className="relative container mx-auto px-4 max-w-3xl text-center">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
            <div className="text-[#C9B896] tracking-[0.35em] text-[10px] uppercase mb-4 flex items-center justify-center gap-2">
              <Sparkles size={11} /> Investment
            </div>
            <h2 className="font-serif font-light text-4xl md:text-6xl leading-[1.05]">
              One <em className="italic text-[#C9B896]">Vivoha</em> experience.
            </h2>
            <p className="mt-5 text-[#FDFBF7]/75 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
              Every template. Every feature. One beautiful website.
              <br />
              No tiers. No limits. No subscriptions — ever.
            </p>

            <div className="mt-10 inline-flex flex-col items-center">
              <div className="font-serif text-6xl md:text-7xl text-[#FDFBF7] leading-none">
                ₹{PLAN_PRICE.toLocaleString('en-IN')}
              </div>
              <div className="mt-3 text-[10px] tracking-[0.35em] uppercase text-[#C9B896]">
                One-time · Hosted for your lifetime together · Nothing hidden
              </div>
            </div>

            <a href="#templates" className="inline-block mt-10">
              <Button
                data-testid="investment-cta"
                className="bg-[#C9B896] hover:bg-[#FDFBF7] text-[#3A3226] rounded-none px-9 py-6 tracking-[0.25em] text-[11px] uppercase shadow-2xl font-medium"
              >
                <Sparkles size={13} className="mr-2" /> Begin with a free demo <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </a>

            <div className="mt-10 pt-8 border-t border-[#FDFBF7]/15 grid grid-cols-2 md:grid-cols-4 gap-5 text-[10px] tracking-[0.3em] uppercase text-[#C9B896]/85">
              <div className="flex flex-col items-center gap-2"><Camera size={14} className="text-[#FDFBF7]/80" /> Cinematic gallery</div>
              <div className="flex flex-col items-center gap-2"><Users size={14} className="text-[#FDFBF7]/80" /> Live RSVPs</div>
              <div className="flex flex-col items-center gap-2"><Heart size={14} className="text-[#FDFBF7]/80" /> Guest photo wall</div>
              <div className="flex flex-col items-center gap-2"><Crown size={14} className="text-[#FDFBF7]/80" /> Studio concierge</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" data-testid="faq" className="py-20 md:py-28">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="mb-10">
            <div className="text-[#8B7355] tracking-[0.3em] text-[10px] uppercase mb-3">Questions</div>
            <h2 className="font-serif font-light text-4xl md:text-5xl text-[#3A3226]">Things to <em className="italic">know</em>.</h2>
          </motion.div>
          <Accordion type="single" collapsible className="space-y-1">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-b border-[#C9B896]/40">
                <AccordionTrigger className="font-serif text-base md:text-lg text-[#3A3226] hover:no-underline text-left py-5">{f.q}</AccordionTrigger>
                <AccordionContent className="text-[#3A3226]/70 leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer data-testid="footer" className="border-t border-[#C9B896]/30 py-10 bg-[#FDFBF7]">
        <div className="container mx-auto px-4 flex flex-col gap-5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-5">
            <div className="font-serif text-xl text-[#3A3226]">Vivoha<span className="text-[#8B7355]">·</span></div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-[#3A3226]/70">
              <a href="#templates" className="hover:text-[#8B7355]">Templates</a>
              <a href="#pricing" className="hover:text-[#8B7355]">Pricing</a>
              <Link href="/blog" className="hover:text-[#8B7355]">Journal</Link>
              <button onClick={() => setContactOpen(true)} className="hover:text-[#8B7355]">Contact</button>
              <Link href="/terms" className="hover:text-[#8B7355]">Terms</Link>
              <Link href="/privacy" className="hover:text-[#8B7355]">Privacy</Link>
              <Link href="/refund-policy" className="hover:text-[#8B7355]">Refund</Link>
            </div>
          </div>
          <div className="text-center text-[10px] text-[#8B7355] tracking-[0.25em] uppercase">© 2026 Vivoha · Made with love in India</div>
        </div>
      </footer>
    </main>
  )
}

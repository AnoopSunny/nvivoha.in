'use client'

import { useMemo, useState, useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Sparkles, ChevronRight, Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import MoonveilTemplate from '@/components/templates/Moonveil'
import RoyalHeritageTemplate from '@/components/templates/RoyalHeritage'
import EternalEditTemplate from '@/components/templates/EternalEdit'
import CrimsonLotusTemplate from '@/components/templates/CrimsonLotus'
import SapphireSagaTemplate from '@/components/templates/SapphireSaga'
import SanctumVeilTemplate from '@/components/templates/SanctumVeil'
import MarigoldBloomTemplate from '@/components/templates/MarigoldBloom'
import PearlVelvetTemplate from '@/components/templates/PearlVelvet'
import BanyanBrassTemplate from '@/components/templates/BanyanBrass'
import PichwaiBloomTemplate from '@/components/templates/PichwaiBloom'
import AlbionVowTemplate from '@/components/templates/AlbionVow'
import JannahVowTemplate from '@/components/templates/JannahVow'
import { getTemplateBySlug, DEMO_HERO_IMAGES, DEMO_GALLERY_IMAGES } from '@/lib/templates'
import { getDemoPhotoWall } from '@/lib/demo-photo-wall'
import { NoIndexMeta } from '@/components/PreviewBadge'
import WeddingPageWrapper from '@/components/WeddingPageWrapper'
import LivePhotoWall from '@/components/LivePhotoWall'

const TEMPLATE_COMPONENTS = {
  'moonveil': { name: 'Moonveil', C: MoonveilTemplate },
  'royal-heritage': { name: 'Royal Heritage', C: RoyalHeritageTemplate },
  'eternal-edit': { name: 'Eternal Edit', C: EternalEditTemplate },
  'crimson-lotus': { name: 'Crimson Lotus', C: CrimsonLotusTemplate },
  'sapphire-saga': { name: 'Sapphire Saga', C: SapphireSagaTemplate },
  'sanctum-veil': { name: 'Sanctum Veil', C: SanctumVeilTemplate },
  'marigold-bloom': { name: 'Marigold Bloom', C: MarigoldBloomTemplate },
  'pearl-velvet': { name: 'Pearl & Velvet', C: PearlVelvetTemplate },
  'banyan-brass': { name: 'Banyan & Brass', C: BanyanBrassTemplate },
  'pichwai-bloom': { name: 'Pichwai Bloom', C: PichwaiBloomTemplate },
  'albion-vow': { name: 'Albion Vow', C: AlbionVowTemplate },
  'jannah-vow': { name: 'Jannah Vow', C: JannahVowTemplate },
}

function defaultEvents(dateISO) {
  // Use a stable reference date to avoid SSR/CSR hydration mismatch.
  const ref = dateISO ? new Date(dateISO) : new Date('2027-02-14T18:00:00+05:30')
  const fmt = (offset) => {
    const x = new Date(ref.getTime() + offset * 86400000)
    return x.toISOString().slice(0, 10)
  }
  return [
    { name: 'Mehendi', date: fmt(-2), startTime: '4:00 PM', endTime: '8:00 PM', venue: 'Family Home · Mumbai', address: 'Bandra West', description: 'An intimate evening of henna, music and laughter.' },
    { name: 'Sangeet', date: fmt(-1), startTime: '7:00 PM', endTime: '11:00 PM', venue: 'The Taj Lands End', address: 'Bandstand Promenade, Bandra West', description: 'Songs, choreography, and a night full of joy.' },
    { name: 'Wedding Ceremony', date: fmt(0), startTime: '6:30 PM', endTime: '9:30 PM', venue: 'JW Marriott Sahar', address: 'IA Project Rd, Andheri East', description: 'The sacred vows under a canopy of marigolds.' },
  ]
}

export default function DemoPage() {
  const { templateSlug } = useParams()
  const sp = useSearchParams()
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [showRibbon, setShowRibbon] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const bride = (sp.get('bride') || 'Anaya').slice(0, 40)
  const groom = (sp.get('groom') || 'Vihaan').slice(0, 40)
  const dateIso = sp.get('date')
  const whatsapp = sp.get('whatsapp') || ''
  const meta = getTemplateBySlug(templateSlug)
  const renderer = TEMPLATE_COMPONENTS[templateSlug]

  const wedding = useMemo(() => {
    // Use a stable fallback date (60 days from a fixed reference) to avoid SSR/CSR mismatch.
    const fallbackDate = '2027-02-14T18:00:00+05:30'
    const weddingDate = dateIso
      ? (dateIso.length === 10 ? `${dateIso}T18:00:00+05:30` : dateIso)
      : fallbackDate
    return {
      id: 'demo',
      slug: `demo-${templateSlug}`,
      brideName: bride,
      groomName: groom,
      tagline: 'A sky full of stars, finally home.',
      weddingDate,
      story: `${bride} met ${groom} on a quiet evening in a city that never forgets. What began as a chance conversation turned into late-night walks, shared playlists, and a slow, certain knowing — that this was forever. Now, surrounded by the people who held them along the way, they invite you to the day they have been dreaming of.`,
      heroImage: { url: DEMO_HERO_IMAGES[templateSlug] || DEMO_HERO_IMAGES['moonveil'] },
      gallery: DEMO_GALLERY_IMAGES.map((url) => ({ url })),
      template: renderer?.name || 'Moonveil',
      status: 'published',
      events: defaultEvents(weddingDate),
      rsvpSettings: { enabled: true, mealOptions: ['Vegetarian', 'Non-Vegetarian'] },
      advancedSettings: { photoWall: { enabled: false } },
      isDemo: true,
      rsvpClosed: false,
    }
  }, [templateSlug, bride, groom, dateIso, renderer])

  async function createMyInvite() {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/onboard/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brideName: bride,
          groomName: groom,
          whatsapp,
          weddingDate: dateIso || '',
          template: renderer?.name || 'Moonveil',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start onboarding')
      try {
        localStorage.setItem('vivoha_onboard', JSON.stringify({ token: data.token, slug: data.slug }))
      } catch {}
      router.push(`/onboard/${data.token}`)
    } catch (e) {
      toast.error(e.message)
      setCreating(false)
    }
  }

  if (!renderer || !meta) {
    return (
      <main className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-center p-8">
        <div>
          <h1 className="font-serif text-3xl text-[#3A3226]">Template not found</h1>
          <a href="/" className="underline text-[#8B7355] mt-4 inline-block">Back to Vivoha</a>
        </div>
      </main>
    )
  }

  const Template = renderer.C

  return (
    <main className="relative" data-testid="demo-page">
      <NoIndexMeta />
      {/* TOP RIBBON */}
      {showRibbon && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-[#3A3226] text-[#FDFBF7] py-2.5 px-4 backdrop-blur-md"
          data-testid="demo-ribbon"
        >
          <div className="container mx-auto flex items-center justify-between gap-4 text-[11px] md:text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Sparkles size={13} className="text-[#C9B896] flex-shrink-0" />
              <span className="tracking-wide truncate">
                <span className="hidden sm:inline">You&apos;re viewing a personalized demo · </span>
                <em className="italic text-[#C9B896] not-italic md:italic">{renderer.name}</em>
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => router.push('/#templates')}
                data-testid="demo-back-templates"
                className="text-[#FDFBF7]/70 hover:text-[#FDFBF7] text-[10px] tracking-widest uppercase hidden sm:inline"
              >
                ← Change design
              </button>
              <button
                onClick={createMyInvite}
                disabled={creating}
                data-testid="demo-create-invite-top"
                className="bg-[#C9B896] hover:bg-[#FDFBF7] text-[#3A3226] px-3 md:px-5 py-1.5 text-[10px] md:text-[11px] tracking-[0.2em] uppercase transition whitespace-nowrap"
              >
                {creating ? <Loader2 size={12} className="animate-spin" /> : 'Create My Invite'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* The template renders here, fully personalized. We wrap it in
          WeddingPageWrapper so the wrapper's DOM-relocation logic moves the
          LivePhotoWall section to sit directly above the template's footer. */}
      <div className="pt-10">
        <WeddingPageWrapper isDemo={true}>
          <Template wedding={wedding} />
          <LivePhotoWall
            slug={wedding.slug}
            title="Guest Photo Wall"
            coupleNames={`${bride} & ${groom}`}
            template={renderer.name}
            isDemo={true}
            previewMode={true}
            demoPhotos={getDemoPhotoWall(`${templateSlug}::${bride}::${groom}`)}
          />
        </WeddingPageWrapper>
      </div>

      {/* Bottom CTA panel */}
      <section className="bg-[#FDFBF7] border-t border-[#C9B896]/40 py-16 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="text-[#8B7355] tracking-[0.3em] text-[10px] uppercase mb-4 flex items-center justify-center gap-2">
            <Sparkles size={12} /> Vivoha
          </div>
          <h2 className="font-serif font-light text-3xl md:text-4xl text-[#3A3226] leading-[1.15] mb-3" data-testid="demo-footer-cta-heading">
            This is just the beginning.<br />
            Your photos. Your story. <em className="italic" style={{ color: meta.coverAccent }}>Your wedding — live.</em>
          </h2>
          <p className="text-[#3A3226]/70 max-w-lg mx-auto mb-8 text-sm md:text-base">
            Add your photos, story, events and venues — and publish your live website in minutes.
          </p>
          <div className="flex justify-center">
            <button
              onClick={createMyInvite}
              disabled={creating}
              data-testid="demo-create-invite-bottom"
              className="bg-[#3A3226] hover:bg-[#1F1A14] text-[#FDFBF7] px-8 py-5 tracking-widest text-xs uppercase transition flex items-center gap-2 disabled:opacity-60"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />} Create My Invite
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

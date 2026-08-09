import { cookies } from 'next/headers'
import WeddingPageWrapper from '@/components/WeddingPageWrapper'
import DemoBookingWidget from '@/components/DemoBookingWidget'
import LivePhotoWall from '@/components/LivePhotoWall'
import InvitePasswordGate from '@/components/InvitePasswordGate'
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

const TEMPLATES = {
  'Moonveil': MoonveilTemplate,
  'Royal Heritage': RoyalHeritageTemplate,
  'Eternal Edit': EternalEditTemplate,
  'Crimson Lotus': CrimsonLotusTemplate,
  'Sapphire Saga': SapphireSagaTemplate,
  'Sanctum Veil': SanctumVeilTemplate,
  'Marigold Bloom': MarigoldBloomTemplate,
  'Pearl & Velvet': PearlVelvetTemplate,
  'Banyan & Brass': BanyanBrassTemplate,
  'Pichwai Bloom': PichwaiBloomTemplate,
  'Albion Vow': AlbionVowTemplate,
  'Jannah Vow': JannahVowTemplate,
}

async function getWedding(slug) {
  // Server-side fetch: forward cookies for invite-password gate
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const url = `${base}/api/public/wedding/${slug}`
  try {
    const cookieHeader = cookies().toString()
    const res = await fetch(url, { cache: 'no-store', headers: cookieHeader ? { cookie: cookieHeader } : {} })
    if (res.status === 423) {
      const gate = await res.json()
      return { __gate: gate }
    }
    if (!res.ok) return null
    const data = await res.json()
    return data.wedding
  } catch (e) {
    return null
  }
}

export async function generateMetadata({ params }) {
  const w = await getWedding(params.slug)
  if (!w || w.__gate) return { title: w?.__gate ? `${w.__gate.brideName} & ${w.__gate.groomName} · Private Invitation · Vivoha` : 'Wedding not found · Vivoha' }
  return {
    title: `${w.brideName} & ${w.groomName} · Wedding`,
    description: w.tagline || `Join us as we celebrate the wedding of ${w.brideName} and ${w.groomName}.`,
    openGraph: {
      title: `${w.brideName} & ${w.groomName} · Wedding`,
      description: w.tagline,
      images: w.heroImage ? [w.heroImage.url] : [],
    },
  }
}

export default async function WeddingPage({ params }) {
  const w = await getWedding(params.slug)
  if (w?.__gate) {
    return <InvitePasswordGate {...w.__gate} />
  }
  if (!w) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FDFBF7] text-[#3A3226] px-6">
        <div className="text-center max-w-md">
          <div className="text-[#8B7355] tracking-[0.3em] text-xs uppercase mb-4">404</div>
          <h1 className="font-serif text-4xl mb-4">Wedding not found</h1>
          <p className="text-[#3A3226]/70">This wedding page is either unpublished or doesn't exist. Please check your link.</p>
          <a href="/" className="inline-block mt-8 underline text-[#8B7355]">Back to Vivoha</a>
        </div>
      </main>
    )
  }
  const Template = TEMPLATES[w.template] || MoonveilTemplate
  const photoWallOn = !!w.advancedSettings?.photoWall?.enabled
  return (
    <WeddingPageWrapper isDemo={!!w.isDemo} theme={w.theme || null}>
      <Template wedding={w} />
      {photoWallOn && (
        <LivePhotoWall
          slug={w.slug}
          title={w.advancedSettings?.photoWall?.title || 'Guest Photo Wall'}
          coupleNames={`${w.brideName} & ${w.groomName}`}
          template={w.template}
          isDemo={!!w.isDemo}
        />
      )}
      {w.isDemo && <DemoBookingWidget templateName={w.template} />}
    </WeddingPageWrapper>
  )
}

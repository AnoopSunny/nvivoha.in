'use client'

/**
 * HubView — Vivoha's unified Wedding Hub.
 *
 * One URL, one experience: from "website crafted" all the way through
 * "live & loved + managing RSVPs & guest photos". The Hub adapts to the
 * couple's current stage instead of fragmenting into separate dashboard
 * pages. Pre-publish it focuses on the journey (timeline + Continue to
 * Publish). Post-publish it surfaces RSVPs, Guest Photos, Analytics and
 * Share tools — everything the couple needs to manage their wedding
 * website from any device.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  CheckCircle2, Loader2, ShieldCheck, ChevronRight, ExternalLink,
  MessageCircle, Eye, CreditCard, Copy, Download, Camera, Users, Heart,
  Sparkles, Calendar, BarChart3, Share2, Link2, Mail, AlertCircle, Pencil,
  Crown,
} from 'lucide-react'

const STUDIO_WHATSAPP = '917339557802'

export default function HubView({ data }) {
  const [tab, setTab] = useState('overview')
  if (!data) return null

  const isPublished = data.publishedStatus === 'published'
  // A published site is always paid/live — never gate the hub behind payment
  // once it's live.
  const isApproved = data.paymentStatus === 'approved' || isPublished

  // Tabs: pre-publish shows just Overview + Share. Post-publish unlocks
  // RSVPs, Photos and Analytics.
  const tabs = useMemo(() => {
    const base = [{ id: 'overview', label: 'Overview', icon: ShieldCheck }]
    if (isPublished && isApproved) {
      base.push({ id: 'rsvps', label: "Who's Coming", icon: Users })
      if (data.photoWallEnabled) base.push({ id: 'photos', label: 'Guest Photos', icon: Camera })
      base.push({ id: 'analytics', label: 'Insights', icon: BarChart3 })
    }
    base.push({ id: 'share', label: 'Share Your Link', icon: Share2 })
    return base
  }, [isPublished, isApproved, data.photoWallEnabled])

  return (
    <div className="max-w-4xl mx-auto py-12 px-4" data-testid="hub-view">
      <HubHeader data={data} />

      {/* Tab rail */}
      <div className="mt-8 flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" data-testid="hub-tabs">
        {tabs.map(t => {
          const TIcon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              data-testid={`hub-tab-${t.id}`}
              className={`flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-[10px] tracking-[0.25em] uppercase transition border ${
                active
                  ? 'bg-[#3A3226] border-[#3A3226] text-[#FDFBF7]'
                  : 'border-[#C9B896] text-[#3A3226]/70 hover:border-[#3A3226] hover:text-[#3A3226] bg-white/40'
              }`}
            >
              <TIcon size={11} /> {t.label}
            </button>
          )
        })}
      </div>

      <div className="mt-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {tab === 'overview' && <OverviewTab data={data} />}
            {tab === 'rsvps' && <RsvpsTab data={data} />}
            {tab === 'photos' && <PhotosTab data={data} />}
            {tab === 'analytics' && <AnalyticsTab data={data} />}
            {tab === 'share' && <ShareTab data={data} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-14 text-center text-[10px] text-[#8B7355] tracking-[0.25em] uppercase">
        Bookmark this hub · Your private link, always saved
      </div>
    </div>
  )
}

/* ─────────────── Header ─────────────── */

function HubHeader({ data }) {
  const isPublished = data.publishedStatus === 'published'
  const couple = `${data.brideName || ''} & ${data.groomName || ''}`.trim()
  return (
    <>
      <div className="text-[#8B7355] tracking-[0.3em] text-[10px] uppercase mb-2 flex items-center gap-2">
        <ShieldCheck size={12} /> {couple ? `${couple}'s Wedding` : 'Your Wedding'}
        {data.ownerWhatsappLast4 ? (
          <span className="text-[#8B7355]/60">· •••• {data.ownerWhatsappLast4}</span>
        ) : null}
      </div>
      <h1 className="font-serif font-light text-4xl md:text-5xl text-[#3A3226] leading-tight" data-testid="hub-couple-heading">
        {data.brideName} <em className="italic text-[#8B7355]">&amp;</em> {data.groomName}
      </h1>
      <div className="text-sm text-[#3A3226]/65 mt-2 flex flex-wrap items-center gap-2">
        <span>{data.template}</span>
        {data.weddingDate && (
          <>
            <span className="text-[#C9B896]">·</span>
            <span>{new Date(data.weddingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </>
        )}
        {isPublished && (
          <>
            <span className="text-[#C9B896]">·</span>
            <span className="inline-flex items-center gap-1 text-emerald-700" data-testid="hub-live-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> 🎊 You&apos;re live!
            </span>
          </>
        )}
      </div>
    </>
  )
}

/* ─────────────── Overview ─────────────── */

function OverviewTab({ data }) {
  return (
    <div>
      <HubTimeline data={data} />
      <PrimaryActions data={data} />
      {data.adminMessages?.length > 0 && <AdminMessages messages={data.adminMessages} />}
      {data.addons?.length > 0 && <SelectedAddons addons={data.addons} amount={data.addonsAmount} />}
      {data.paymentAttempts?.length > 0 && <PaymentHistory attempts={data.paymentAttempts} />}
    </div>
  )
}

function HubTimeline({ data }) {
  const ps = data.paymentStatus
  const isPublished = data.publishedStatus === 'published'
  const isApproved = ps === 'approved' || isPublished
  const isPaymentSubmitted = ['verification_pending', 'approved'].includes(ps) || isPublished

  const steps = [
    { id: 'created', label: 'Website crafted', done: true },
    { id: 'paid', label: 'Payment received', done: isPaymentSubmitted },
    { id: 'live', label: isApproved ? "🎊 You're live!" : "We're adding the finishing touches…", done: isApproved && isPublished, active: isApproved && !isPublished },
  ]

  return (
    <div className="border border-[#C9B896] bg-white/40 px-4 sm:px-6 py-5" data-testid="hub-timeline">
      <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355] mb-4">Your wedding journey</div>
      <ol className={`grid gap-1.5 sm:gap-3 ${steps.length <= 3 ? 'grid-cols-3' : 'grid-cols-5'}`}>
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1
          const state = s.done ? 'done' : s.active ? 'active' : 'pending'
          return (
            <li key={s.id} className="relative flex flex-col items-center text-center" data-testid={`hub-step-${s.id}-${state}`}>
              {!isLast && (
                <div className="absolute top-3 left-1/2 w-full h-px" style={{ background: state === 'done' ? '#3A3226' : '#C9B896', opacity: state === 'done' ? 0.6 : 0.5 }} aria-hidden />
              )}
              <div className={`relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                state === 'done' ? 'bg-[#3A3226] border-[#3A3226] text-[#C9B896]'
                : state === 'active' ? 'bg-[#FDFBF7] border-[#3A3226] text-[#3A3226]'
                : 'bg-[#FDFBF7] border-[#C9B896] text-[#C9B896]'
              }`}>
                {state === 'done' ? <CheckCircle2 size={11} />
                  : state === 'active' ? <Loader2 size={11} className="animate-spin" />
                  : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
              </div>
              <div className={`mt-3 text-[9px] sm:text-[10px] tracking-[0.18em] uppercase leading-tight ${
                state === 'pending' ? 'text-[#8B7355]/70' : 'text-[#3A3226]'
              } ${state === 'active' ? 'font-medium' : ''}`}>
                {s.label}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function PrimaryActions({ data }) {
  const ps = data.paymentStatus
  const isPublished = data.publishedStatus === 'published'
  const needsPayment = !['verification_pending', 'approved'].includes(ps) && !isPublished
  const isLive = isPublished
  const slugFromPreview = data.previewUrl ? data.previewUrl.split('/preview/')[1]?.split('?')[0] : data.slug
  const onboardTokenFromPreview = data.previewUrl?.includes('onboardToken=')
    ? data.previewUrl.split('onboardToken=')[1].split('&')[0]
    : null
  const publishHref = slugFromPreview
    ? `/publish/${slugFromPreview}${onboardTokenFromPreview ? `?onboardToken=${onboardTokenFromPreview}` : ''}`
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mt-6 grid sm:grid-cols-2 gap-3"
      data-testid="hub-actions"
    >
      {data.previewUrl && (
        <Link href={data.previewUrl} className="border border-[#C9B896] bg-white/40 px-5 py-4 hover:border-[#3A3226] transition flex items-center justify-between gap-3 group" data-testid="hub-action-preview">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355]">Preview</div>
            <div className="font-serif text-lg text-[#3A3226] mt-0.5">Open your invite</div>
          </div>
          <Eye size={16} className="text-[#8B7355] group-hover:text-[#3A3226]" />
        </Link>
      )}
      {needsPayment && publishHref && (
        <Link href={publishHref} className="border border-[#3A3226] bg-[#3A3226] text-[#FDFBF7] px-5 py-4 hover:bg-[#1F1A14] transition flex items-center justify-between gap-3 group" data-testid="hub-action-publish">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-[#C9B896]">Step in</div>
            <div className="font-serif text-lg mt-0.5">Continue to Publish</div>
          </div>
          <CreditCard size={16} className="text-[#C9B896] group-hover:text-[#FDFBF7]" />
        </Link>
      )}
      {isLive && data.publicUrl && (
        <a href={data.publicUrl} target="_blank" rel="noreferrer" className="border border-[#3A3226] bg-[#3A3226] text-[#FDFBF7] px-5 py-4 hover:bg-[#1F1A14] transition flex items-center justify-between gap-3 group sm:col-span-2" data-testid="hub-action-live">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-[#C9B896]">Live</div>
            <div className="font-serif text-lg mt-0.5">Open your wedding website</div>
          </div>
          <ChevronRight size={18} className="text-[#C9B896] group-hover:text-[#FDFBF7] group-hover:translate-x-1 transition" />
        </a>
      )}
      <a
        href={`https://wa.me/${STUDIO_WHATSAPP}?text=${encodeURIComponent('Hi Vivoha studio, I need help with my wedding website.')}`}
        target="_blank"
        rel="noreferrer"
        className="border border-[#C9B896] bg-white/40 px-5 py-4 hover:border-[#3A3226] transition flex items-center justify-between gap-3 group"
        data-testid="hub-action-whatsapp"
      >
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355]">Studio</div>
          <div className="font-serif text-lg text-[#3A3226] mt-0.5">Chat on WhatsApp</div>
        </div>
        <MessageCircle size={16} className="text-[#8B7355] group-hover:text-[#3A3226]" />
      </a>
    </motion.div>
  )
}

function AdminMessages({ messages }) {
  return (
    <section className="mt-8" data-testid="hub-admin-messages">
      <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355] mb-3 flex items-center gap-2">
        <Mail size={11} /> Messages from Vivoha Studio
      </div>
      <div className="space-y-2">
        {messages.slice().reverse().map(m => (
          <div key={m.id} className="border border-[#C9B896] bg-white/40 p-4">
            <div className="text-[10px] tracking-widest uppercase text-[#8B7355]">
              {m.type === 'changes_requested' ? 'Changes requested' : 'Note'} · {new Date(m.createdAt).toLocaleString()}
            </div>
            <div className="text-sm text-[#3A3226] mt-1.5 leading-relaxed whitespace-pre-wrap">{m.message}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function SelectedAddons({ addons, amount }) {
  return (
    <section className="mt-8 border border-[#C9B896] bg-white/40 p-5" data-testid="hub-addons">
      <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355] mb-3 flex items-center gap-2">
        <Crown size={11} /> Your selected upgrades
      </div>
      <ul className="space-y-1.5 text-sm">
        {addons.map(a => (
          <li key={a.id} className="flex items-center justify-between gap-3 text-[#3A3226]">
            <span className="truncate">{a.name}</span>
            <span className="font-serif tracking-normal text-[#8B7355] flex-shrink-0">+₹{(a.price || 0).toLocaleString('en-IN')}</span>
          </li>
        ))}
        {amount > 0 && (
          <li className="mt-1.5 pt-2 border-t border-[#C9B896]/40 flex items-center justify-between text-[#3A3226]">
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355]">Add-ons total</span>
            <span className="font-serif">₹{amount.toLocaleString('en-IN')}</span>
          </li>
        )}
      </ul>
    </section>
  )
}

function PaymentHistory({ attempts }) {
  return (
    <section className="mt-8" data-testid="hub-payment-history">
      <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355] mb-3">Payment timeline</div>
      <div className="space-y-2">
        {attempts.slice().reverse().map((a, idx) => (
          <div key={a.id || idx} className="border border-[#C9B896]/60 bg-white/30 p-3.5 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[#3A3226] flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] tracking-widest uppercase px-2 py-0.5 ${a.status === 'approved' ? 'bg-emerald-100 text-emerald-900' : a.status === 'rejected' ? 'bg-red-100 text-red-900' : 'bg-amber-100 text-amber-900'}`}>
                  {a.status === 'verification_pending' ? 'pending' : a.status}
                </span>
                {a.txnRef && <span className="font-mono text-xs text-[#3A3226]/65">TXN {a.txnRef}</span>}
              </div>
              {a.rejectionReason && <div className="text-xs text-red-700 mt-1 italic">&ldquo;{a.rejectionReason}&rdquo;</div>}
              <div className="text-[10px] text-[#8B7355] mt-1 tracking-widest uppercase">
                {new Date(a.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────── RSVPs ─────────────── */

function RsvpsTab({ data }) {
  const rsvps = data.rsvps || []
  const stats = data.stats || {}
  const exportHref = `/api/hub/owner/${data.ownerToken}/rsvp-export`

  if (rsvps.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Awaiting your first 'yes'."
        body="When your guests reply to your invitation, every warm message will appear here in real time."
      />
    )
  }

  return (
    <div data-testid="hub-rsvps-tab">
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Replies" value={stats.totalRsvps || rsvps.length} icon={Mail} />
        <StatCard label="Souls coming" value={stats.attendingCount || 0} icon={Heart} />
        <StatCard label="Regrets" value={rsvps.filter(r => r.attending === 'no').length} icon={AlertCircle} muted />
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355]">All replies</div>
        <a
          href={exportHref}
          target="_blank"
          rel="noreferrer"
          data-testid="hub-rsvp-export"
          className="text-[10px] tracking-[0.25em] uppercase text-[#8B7355] hover:text-[#3A3226] inline-flex items-center gap-1.5 border border-[#C9B896] hover:border-[#3A3226] px-3 py-1.5"
        >
          <Download size={11} /> Download CSV
        </a>
      </div>

      <div className="space-y-2">
        {rsvps.map((r) => (
          <div key={r.id || r._id || r.name + r.createdAt} className="border border-[#C9B896]/70 bg-white/40 p-4" data-testid="hub-rsvp-row">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="font-serif text-lg text-[#3A3226]">{r.name}</div>
                <div className="text-xs text-[#8B7355] mt-0.5">
                  {[r.email, r.phone].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] tracking-widest uppercase px-2 py-1 ${r.attending === 'yes' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'}`}>
                  {r.attending === 'yes' ? `Attending · ${r.guests || 1}` : 'Not attending'}
                </span>
              </div>
            </div>
            {r.mealPreferences?.length > 0 && (
              <div className="text-xs text-[#3A3226]/70 mt-2">
                <span className="text-[10px] tracking-widest uppercase text-[#8B7355] mr-2">Meal:</span>
                {r.mealPreferences.join(', ')}
              </div>
            )}
            {r.message && (
              <div className="text-sm text-[#3A3226] italic mt-2.5 border-l-2 border-[#C9B896] pl-3 leading-relaxed">
                &ldquo;{r.message}&rdquo;
              </div>
            )}
            <div className="text-[10px] text-[#8B7355]/70 mt-2.5 tracking-widest uppercase">
              {new Date(r.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────── Guest Photos ─────────────── */

function PhotosTab({ data }) {
  const counts = data.stats?.photoCounts || { pending: 0, approved: 0, rejected: 0 }
  const zipHref = `/api/hub/owner/${data.ownerToken}/photo-wall-zip`
  const total = counts.pending + counts.approved

  if (total === 0) {
    return (
      <EmptyState
        icon={Camera}
        title="The first photograph will live here."
        body="When guests scan your QR and share their moments, you'll see them queue up here for your gentle approval."
      />
    )
  }

  return (
    <div data-testid="hub-photos-tab">
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Approved" value={counts.approved} icon={CheckCircle2} />
        <StatCard label="Awaiting you" value={counts.pending} icon={Loader2} muted={counts.pending === 0} />
        <StatCard label="Memories" value={counts.approved} icon={Heart} />
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355]">Guest memories wall</div>
        {counts.approved > 0 && (
          <a
            href={zipHref}
            target="_blank"
            rel="noreferrer"
            data-testid="hub-photos-zip"
            className="text-[10px] tracking-[0.25em] uppercase text-[#8B7355] hover:text-[#3A3226] inline-flex items-center gap-1.5 border border-[#C9B896] hover:border-[#3A3226] px-3 py-1.5"
          >
            <Download size={11} /> Download all (ZIP)
          </a>
        )}
      </div>

      <PhotoModerationGrid ownerToken={data.ownerToken} />
    </div>
  )
}

function PhotoModerationGrid({ ownerToken }) {
  const [photos, setPhotos] = useState(null)
  const [busy, setBusy] = useState({})

  useMemoFetch(`/api/hub/owner/${ownerToken}/photo-wall`, (d) => setPhotos(d?.photos || []))

  async function moderate(id, action) {
    setBusy(b => ({ ...b, [id]: true }))
    try {
      const res = await fetch(`/api/hub/owner/${ownerToken}/photo-wall/${id}/moderate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error('Could not update')
      setPhotos(p => p.filter(x => x.id !== id || action === 'approve'))
      // refresh full list to keep counts accurate
      const refreshed = await fetch(`/api/hub/owner/${ownerToken}/photo-wall`).then(r => r.json())
      setPhotos(refreshed?.photos || [])
      toast.success(action === 'approve' ? 'Approved' : 'Removed')
    } catch (e) {
      toast.error('Could not update')
    } finally {
      setBusy(b => ({ ...b, [id]: false }))
    }
  }

  if (photos === null) return <div className="py-10 text-center text-[#8B7355]"><Loader2 className="animate-spin mx-auto" /></div>
  if (photos.length === 0) return <EmptyState icon={Camera} title="No photos yet." body="As guests upload, they'll show up here for review." />

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="hub-photo-grid">
      {photos.map(p => (
        <figure key={p.id} className="relative border border-[#C9B896] bg-white/40 group">
          <img src={p.url} alt="" className="w-full aspect-square object-cover" />
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 text-[10px] text-white">
            <div className="flex items-center justify-between gap-2">
              <span className="tracking-[0.2em] uppercase">{p.guestName || 'Guest'}</span>
              <span className={`px-1.5 py-0.5 ${p.status === 'approved' ? 'bg-emerald-600' : 'bg-amber-500 text-[#1F1A14]'}`}>
                {p.status}
              </span>
            </div>
            {p.status === 'pending' && (
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={() => moderate(p.id, 'approve')}
                  disabled={busy[p.id]}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1 disabled:opacity-50"
                  data-testid={`hub-photo-approve-${p.id}`}
                >Approve</button>
                <button
                  onClick={() => moderate(p.id, 'reject')}
                  disabled={busy[p.id]}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-1 disabled:opacity-50"
                  data-testid={`hub-photo-reject-${p.id}`}
                >Remove</button>
              </div>
            )}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

/* ─────────────── Analytics ─────────────── */

function AnalyticsTab({ data }) {
  const stats = data.stats || {}
  const trend = stats.viewsTrend || []
  const max = Math.max(1, ...trend.map(t => t.views))

  return (
    <div data-testid="hub-analytics-tab">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total visits" value={stats.totalViews || 0} icon={Eye} />
        <StatCard label="Replies" value={stats.totalRsvps || 0} icon={Mail} />
        <StatCard label="Attending" value={stats.attendingCount || 0} icon={Users} />
        <StatCard label="Memories" value={stats.photoCounts?.approved || 0} icon={Camera} />
      </div>

      <div className="border border-[#C9B896] bg-white/40 p-5">
        <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355] mb-4 flex items-center gap-2">
          <Calendar size={11} /> Last 14 days of visits
        </div>
        {stats.totalViews === 0 ? (
          <EmptyState
            icon={Eye}
            title="Your invitation is patiently waiting."
            body="Share your link with loved ones — every view is a heart pausing to celebrate you."
          />
        ) : (
          <div className="flex items-end gap-1 h-32" data-testid="hub-views-chart">
            {trend.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1 group">
                <div
                  className="w-full bg-[#3A3226] group-hover:bg-[#1F1A14] transition relative"
                  style={{ height: `${(d.views / max) * 100}%`, minHeight: d.views > 0 ? '4px' : '1px' }}
                  title={`${d.views} visit${d.views === 1 ? '' : 's'} on ${d.day}`}
                >
                  {d.views > 0 && (
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-[#3A3226] font-medium opacity-0 group-hover:opacity-100 transition">
                      {d.views}
                    </span>
                  )}
                </div>
                <span className="text-[8px] text-[#8B7355] tracking-widest">{d.day.slice(8)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#8B7355]/80 italic mt-5 leading-relaxed">
        Every visitor is someone you love taking a moment to picture your day. We don&apos;t track personal data —
        just gentle counts to celebrate your reach.
      </p>
    </div>
  )
}

/* ─────────────── Share ─────────────── */

function ShareTab({ data }) {
  const link = data.shortUrl || data.publicUrl || data.previewUrl
  const isLive = data.publishedStatus === 'published' && data.paymentStatus === 'approved'

  if (!link) {
    return (
      <EmptyState
        icon={Share2}
        title="Share unlocks after you publish."
        body="Complete payment and the moment our studio approves your invite, you'll find your QR, link and share tools here."
      />
    )
  }

  const fullLink = link.startsWith('http') ? link : (typeof window !== 'undefined' ? `${window.location.origin}${link}` : link)

  function copy() {
    navigator.clipboard?.writeText(fullLink)
      .then(() => toast.success('Link copied'))
      .catch(() => toast.error('Copy failed'))
  }

  return (
    <div data-testid="hub-share-tab">
      <div className="border border-[#C9B896] bg-white/40 p-5 md:p-7">
        <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355] mb-3 flex items-center gap-2">
          <Link2 size={11} /> {isLive ? 'Your wedding website' : 'Preview link'}
        </div>
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {data.qrDataUri && (
            <div className="bg-white p-2.5 border border-[#C9B896] shadow-sm flex-shrink-0">
              <img src={data.qrDataUri} alt="" className="w-36 h-36" />
            </div>
          )}
          <div className="flex-1 min-w-0 w-full">
            <div className="font-mono text-[13px] text-[#3A3226] break-all bg-[#FDFBF7] border border-[#C9B896]/60 px-3 py-2.5">
              {fullLink}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={copy}
                data-testid="hub-share-copy"
                className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase px-3 py-2 border border-[#C9B896] hover:border-[#3A3226] bg-white/60"
              >
                <Copy size={11} /> Copy link
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`We're getting married! See our invite: ${fullLink}`)}`}
                target="_blank" rel="noreferrer"
                data-testid="hub-share-whatsapp"
                className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase px-3 py-2 border border-[#C9B896] hover:border-[#3A3226] bg-white/60"
              >
                <MessageCircle size={11} /> Share on WhatsApp
              </a>
              {isLive && (
                <a
                  href={data.publicUrl}
                  target="_blank" rel="noreferrer"
                  data-testid="hub-share-visit"
                  className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.25em] uppercase px-3 py-2 bg-[#3A3226] text-[#FDFBF7] hover:bg-[#1F1A14]"
                >
                  <ExternalLink size={11} /> Visit
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Download thank-you PDF lives off the legacy status token endpoint
          which still works server-side; we just don't ship a separate /status
          page anymore. The button below opens the PDF route directly. */}
      {isLive && data.statusToken && (
        <a
          href={`/api/status/${data.statusToken}/invite-pdf`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-[#8B7355] hover:text-[#3A3226]"
          data-testid="hub-open-status-pdf"
        >
          Download thank-you PDF <ExternalLink size={11} />
        </a>
      )}
    </div>
  )
}

/* ─────────────── Helpers ─────────────── */

function StatCard({ label, value, icon: Icon, muted }) {
  return (
    <div className={`border ${muted ? 'border-[#C9B896]/50 bg-white/30' : 'border-[#C9B896] bg-white/40'} p-4`} data-testid={`hub-stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-center gap-2 text-[9px] tracking-[0.3em] uppercase text-[#8B7355]">
        <Icon size={11} /> {label}
      </div>
      <div className="font-serif text-3xl text-[#3A3226] mt-1.5">{value}</div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, body }) {
  return (
    <div className="border border-dashed border-[#C9B896] bg-white/30 px-6 py-10 text-center" data-testid="hub-empty-state">
      <div className="w-10 h-10 mx-auto bg-[#3A3226] text-[#C9B896] flex items-center justify-center mb-4">
        <Icon size={16} />
      </div>
      <div className="font-serif text-xl text-[#3A3226]">{title}</div>
      <p className="text-sm text-[#3A3226]/65 mt-2 max-w-md mx-auto leading-relaxed">{body}</p>
    </div>
  )
}

// Lightweight 'fetch on mount' helper to avoid pulling in SWR.
function useMemoFetch(url, onData) {
  useEffect(() => {
    let cancelled = false
    fetch(url).then(r => r.json()).then(d => { if (!cancelled) onData(d) }).catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])
}

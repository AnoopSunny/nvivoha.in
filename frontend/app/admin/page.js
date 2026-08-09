'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, LogOut, LayoutDashboard, Heart, Settings, Calendar, Users,
  Edit3, Trash2, ExternalLink, Eye, Copy, X, Image as ImageIcon, MapPin,
  Clock, ChevronRight, Download, Mail, Phone, MessageCircle, ChevronLeft,
  GripVertical, Save, Inbox, Sparkles, TrendingUp, FlaskConical, IndianRupee,
  Camera, Check, AlertCircle, ArrowLeft, FileText, Link2, QrCode, Archive, ShieldCheck, Upload, Lock, MapPin as MapPinIcon, Heart as HeartIcon, CreditCard, Settings as SettingsIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { HEADING_FONTS, BODY_FONTS } from '@/lib/theme-fonts'
import { PaymentsView, PaymentSettingsView } from '@/components/admin/PaymentsAdmin'

function authFetch(url, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('kal_token') : null
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
  })
}

function fileToDataUri(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = rej
    r.readAsDataURL(file)
  })
}

function downloadInvitePdf(w) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('kal_token') : ''
  if (!token) { toast.error('Session expired'); return }
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  const url = `/api/weddings/${w.id}/invite-pdf?token=${encodeURIComponent(token)}&base=${encodeURIComponent(base)}`
  window.open(url, '_blank')
}

async function createShortlinkFor(w) {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  const target = `${base}/wedding/${w.slug}`
  const res = await authFetch('/api/shortlinks', {
    method: 'POST',
    body: JSON.stringify({ url: target, label: `${w.brideName}-${w.groomName}` }),
  })
  const d = await res.json()
  if (!res.ok) { toast.error(d.error || 'Failed'); return }
  const shortUrl = `${base}/s/${d.shortlink.id}`
  try {
    await navigator.clipboard.writeText(shortUrl)
    toast.success(`Short link copied: ${shortUrl}`)
  } catch (_) { toast.success(`Short link: ${shortUrl}`) }
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard') // dashboard | weddings | previews | new | edit | rsvps | leads | revenue
  const [formMode, setFormMode] = useState('wedding') // 'wedding' | 'preview'
  const [editingId, setEditingId] = useState(null)
  const [rsvpWedding, setRsvpWedding] = useState(null)
  const [photoWallId, setPhotoWallId] = useState(null)
  const [formId, setFormId] = useState(null)
  const [clientAccessWedding, setClientAccessWedding] = useState(null)
  const [invitePwWedding, setInvitePwWedding] = useState(null)
  const [badges, setBadges] = useState({ photoWallPending: 0, leadsNew: 0, formsSubmitted: 0, paymentsPending: 0 })
  const [weddings, setWeddings] = useState([])
  const [previews, setPreviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('kal_token')
    const u = localStorage.getItem('kal_user')
    if (!token || !u) { router.replace('/admin/login'); return }
    setUser(JSON.parse(u))
    loadWeddings()
    loadPreviews()
  }, [])

  const loadBadges = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/badges')
      if (res.ok) {
        const d = await res.json()
        setBadges({
          photoWallPending: d.photoWallPending || 0,
          leadsNew: d.leadsNew || 0,
          formsSubmitted: d.formsSubmitted || 0,
          paymentsPending: d.paymentsPending || 0,
        })
      }
    } catch (_) {}
  }, [])

  useEffect(() => {
    if (!user) return
    loadBadges()
    const t = setInterval(loadBadges, 20000)
    return () => clearInterval(t)
  }, [user, loadBadges, view])

  const loadWeddings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      params.set('isDemo', 'false')
      const res = await authFetch(`/api/weddings?${params.toString()}`)
      if (res.status === 401) { localStorage.clear(); router.replace('/admin/login'); return }
      const data = await res.json()
      setWeddings(data.weddings || [])
    } catch (e) {
      toast.error('Failed to load weddings')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, router])

  const loadPreviews = useCallback(async () => {
    try {
      const res = await authFetch(`/api/weddings?isDemo=true`)
      if (res.ok) {
        const data = await res.json()
        setPreviews(data.weddings || [])
      }
    } catch (e) { /* silent */ }
  }, [])

  useEffect(() => {
    if (user) loadWeddings()
  }, [user, search, statusFilter, loadWeddings])

  function logout() {
    localStorage.clear()
    router.replace('/admin/login')
  }

  async function deleteWedding(id, isPreview = false) {
    if (!confirm(isPreview ? 'Delete this preview?' : 'Delete this wedding? This cannot be undone.')) return
    const res = await authFetch(`/api/weddings/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success(isPreview ? 'Preview deleted' : 'Wedding deleted')
      isPreview ? loadPreviews() : loadWeddings()
    } else toast.error('Failed to delete')
  }

  async function togglePublish(w, isPreview = false) {
    const newStatus = w.status === 'published' ? 'draft' : 'published'
    const res = await authFetch(`/api/weddings/${w.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      toast.success(`${isPreview ? 'Preview' : 'Wedding'} ${newStatus}`)
      isPreview ? loadPreviews() : loadWeddings()
    }
    else toast.error('Failed to update')
  }

  const stats = {
    total: weddings.length,
    published: weddings.filter(w => w.status === 'published').length,
    draft: weddings.filter(w => w.status === 'draft').length,
    rsvps: weddings.reduce((sum, w) => sum + (w.rsvpCount || 0), 0),
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">Loading…</div>

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-60 bg-slate-900 text-slate-200 flex flex-col flex-shrink-0">
        <div className="px-5 py-4 border-b border-slate-800">
          <Link href="/" className="font-semibold text-lg tracking-tight text-white flex items-center gap-2">
            <span className="w-7 h-7 bg-slate-200 text-slate-900 flex items-center justify-center text-[11px] font-bold rounded">V</span>
            Vivoha Admin
          </Link>
          <div className="text-[10px] text-slate-500 mt-1.5 tracking-widest uppercase">Operations console</div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <SectionLabel>Overview</SectionLabel>
          <NavItem icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => setView('dashboard')} testId="nav-dashboard" />
          <NavItem icon={TrendingUp} label="Revenue" active={view === 'revenue'} onClick={() => setView('revenue')} testId="nav-revenue" />

          <SectionLabel>Couples</SectionLabel>
          <NavItem icon={Heart} label="Weddings" active={view === 'weddings' || (view === 'new' && formMode === 'wedding') || (view === 'edit' && formMode === 'wedding')} onClick={() => { setFormMode('wedding'); setView('weddings') }} testId="nav-weddings" />
          <NavItem icon={Sparkles} label="Previews" active={view === 'previews' || (view === 'new' && formMode === 'preview') || (view === 'edit' && formMode === 'preview')} onClick={() => { setFormMode('preview'); setView('previews') }} testId="nav-previews" />
          <NavItem icon={ShieldCheck} label="Owner Hubs" active={view === 'hubs'} onClick={() => setView('hubs')} testId="nav-hubs" />

          <SectionLabel>Operations</SectionLabel>
          <NavItem icon={CreditCard} label="Payments" active={view === 'payments'} onClick={() => setView('payments')} testId="nav-payments" badge={badges.paymentsPending} />
          <NavItem icon={FileText} label="Forms" active={view === 'forms' || view === 'forms-detail'} onClick={() => setView('forms')} testId="nav-forms" badge={badges.formsSubmitted} />
          <NavItem icon={Camera} label="Photo Wall" active={view === 'photowall' || view === 'photowall-detail'} onClick={() => setView('photowall')} testId="nav-photo-wall" badge={badges.photoWallPending} />
          <NavItem icon={Inbox} label="Leads" active={view === 'leads'} onClick={() => setView('leads')} testId="nav-leads" badge={badges.leadsNew} />

          <SectionLabel>Configuration</SectionLabel>
          <NavItem icon={SettingsIcon} label="Payment Settings" active={view === 'payment-settings'} onClick={() => setView('payment-settings')} testId="nav-payment-settings" />
        </nav>
        <div className="p-3 border-t border-slate-800">
          <div className="text-[11px] text-slate-400 mb-2 truncate" title={user.email}>{user.email}</div>
          <button onClick={logout} data-testid="admin-logout" className="w-full flex items-center gap-2 text-xs py-2 px-2 rounded hover:bg-slate-800 text-slate-300 transition">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          {view === 'dashboard' && (
            <DashboardView user={user} stats={stats} weddings={weddings} onNew={() => { setFormMode('wedding'); setView('new') }} onViewAll={() => setView('weddings')} onEdit={(id) => { setEditingId(id); setFormMode('wedding'); setView('edit') }} />
          )}
          {view === 'weddings' && (
            <WeddingsList
              weddings={weddings}
              loading={loading}
              search={search} setSearch={setSearch}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              onNew={() => { setFormMode('wedding'); setView('new') }}
              onEdit={(id) => { setEditingId(id); setFormMode('wedding'); setView('edit') }}
              onDelete={(id) => deleteWedding(id, false)}
              onTogglePublish={(w) => togglePublish(w, false)}
              onViewRsvps={(w) => { setRsvpWedding(w); setView('rsvps') }}
              onPhotoWall={(wid) => { setPhotoWallId(wid); setView('photowall-detail') }}
              onClientAccess={(w) => setClientAccessWedding(w)}
              onInvitePassword={(w) => setInvitePwWedding(w)}
            />
          )}
          {view === 'previews' && (
            <PreviewsList
              previews={previews}
              onNew={() => { setFormMode('preview'); setView('new') }}
              onEdit={(id) => { setEditingId(id); setFormMode('preview'); setView('edit') }}
              onDelete={(id) => deleteWedding(id, true)}
              onTogglePublish={(w) => togglePublish(w, true)}
              onReload={loadPreviews}
            />
          )}
          {(view === 'new' || view === 'edit') && (
            <WeddingForm
              id={view === 'edit' ? editingId : null}
              mode={formMode}
              onCancel={() => setView(formMode === 'preview' ? 'previews' : 'weddings')}
              onSaved={() => {
                if (formMode === 'preview') { setView('previews'); loadPreviews() }
                else { setView('weddings'); loadWeddings() }
              }}
            />
          )}
          {view === 'rsvps' && rsvpWedding && (
            <RsvpView wedding={rsvpWedding} onBack={() => setView('weddings')} />
          )}
          {view === 'leads' && (
            <LeadsView />
          )}
          {view === 'revenue' && (
            <RevenueView />
          )}
          {view === 'payments' && (
            <PaymentsView onChanged={loadBadges} />
          )}
          {view === 'payment-settings' && (
            <PaymentSettingsView />
          )}
          {view === 'hubs' && (
            <HubsView />
          )}
          {view === 'photowall' && (
            <PhotoWallView onOpen={(wid) => { setPhotoWallId(wid); setView('photowall-detail') }} />
          )}
          {view === 'photowall-detail' && photoWallId && (
            <PhotoWallModeration weddingId={photoWallId} onBack={() => setView('photowall')} onChanged={loadBadges} />
          )}
          {view === 'forms' && (
            <FormsView onOpen={(fid) => { setFormId(fid); setView('forms-detail') }} onChanged={loadBadges} />
          )}
          {view === 'forms-detail' && formId && (
            <FormDetail formId={formId} onBack={() => setView('forms')} onConverted={(weddingId) => { setEditingId(weddingId); setFormMode('wedding'); setView('edit'); loadBadges() }} />
          )}
        </div>
      </main>
      {clientAccessWedding && (
        <ClientAccessModal wedding={clientAccessWedding} onClose={() => setClientAccessWedding(null)} />
      )}
      {invitePwWedding && (
        <InvitePasswordAdminModal wedding={invitePwWedding} onClose={() => setInvitePwWedding(null)} />
      )}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div className="px-2 pt-4 pb-1.5 text-[10px] tracking-[0.2em] uppercase text-slate-500 font-medium">{children}</div>
  )
}

function NavItem({ icon: Icon, label, active, onClick, testId, badge }) {
  return (
    <button onClick={onClick} data-testid={testId} className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] rounded transition relative ${active ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/60 text-slate-300'}`}>
      <Icon size={15} className={active ? 'text-blue-400' : 'text-slate-500'} /> <span>{label}</span>
      {badge > 0 && (
        <span
          data-testid={`${testId || label.toLowerCase()}-badge`}
          className="ml-auto bg-amber-500 text-slate-900 text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}

function DashboardView({ user, stats, weddings, onNew, onViewAll, onEdit }) {
  return (
    <div data-testid="admin-dashboard">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Signed in as {user.email}</p>
        </div>
        <Button onClick={onNew} data-testid="dashboard-new-wedding" className="bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium gap-1.5 px-3.5 py-2 h-auto">
          <Plus size={14} /> New wedding
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Weddings" value={stats.total} testId="stat-total" />
        <StatCard label="Published" value={stats.published} tone="green" testId="stat-published" />
        <StatCard label="Drafts" value={stats.draft} tone="amber" testId="stat-draft" />
        <StatCard label="Total RSVPs" value={stats.rsvps} testId="stat-rsvps" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Recent weddings</h2>
        <button onClick={onViewAll} data-testid="dashboard-view-all" className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">View all <ChevronRight size={12} /></button>
      </div>

      {weddings.length === 0 ? (
        <div className="border border-dashed border-slate-300 p-12 text-center rounded-md bg-white">
          <Heart className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 mb-1">No weddings yet</h3>
          <p className="text-sm text-slate-500 mb-4">Create your first wedding to get started.</p>
          <Button onClick={onNew} className="bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs">
            <Plus size={14} className="mr-1.5" /> Create wedding
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {weddings.slice(0, 6).map(w => (
            <MiniCard key={w.id} w={w} onEdit={() => onEdit(w.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, tone, testId }) {
  const toneClasses =
    tone === 'green' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : tone === 'amber' ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-slate-900 bg-white border-slate-200'
  return (
    <div className={`border ${toneClasses} p-4 rounded-md`} data-testid={testId}>
      <div className="text-[11px] tracking-wide uppercase opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function MiniCard({ w, onEdit }) {
  return (
    <button type="button" className="text-left border border-slate-200 bg-white hover:border-slate-400 rounded-md overflow-hidden transition group" onClick={onEdit} data-testid={`mini-card-${w.id}`}>
      <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
        {w.heroImage?.url ? (
          <img src={w.heroImage.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={28} /></div>
        )}
        <span className={`absolute top-2 left-2 text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded ${w.status === 'published' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
          {w.status}
        </span>
      </div>
      <div className="p-3">
        <div className="text-sm font-medium text-slate-900 truncate">{w.brideName} <span className="text-slate-400">&amp;</span> {w.groomName}</div>
        <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
          <span>{new Date(w.weddingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span>{w.rsvpCount || 0} RSVPs</span>
        </div>
      </div>
    </button>
  )
}

function WeddingsList({ weddings, loading, search, setSearch, statusFilter, setStatusFilter, onNew, onEdit, onDelete, onTogglePublish, onViewRsvps, onPhotoWall, onClientAccess, onInvitePassword }) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Weddings</h1>
          <p className="text-sm text-slate-500 mt-1">{weddings.length} record{weddings.length === 1 ? '' : 's'}</p>
        </div>
        <Button onClick={onNew} data-testid="weddings-new" className="bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs gap-1.5 px-3.5 py-2 h-auto">
          <Plus size={14} /> New wedding
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search couples, slug, plan…" className="pl-9 h-9 rounded-md border-slate-300 bg-white text-sm" />
        </div>
        <div className="flex gap-0.5 bg-white border border-slate-300 rounded-md p-0.5">
          {['all', 'published', 'draft'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} data-testid={`filter-${s}`} className={`px-3 py-1.5 text-xs rounded transition capitalize ${statusFilter === s ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? <div className="text-center py-16 text-slate-500 text-sm">Loading…</div> : weddings.length === 0 ? (
        <div className="border border-dashed border-slate-300 p-12 text-center rounded-md bg-white">
          <p className="text-slate-500 text-sm mb-4">No weddings match the filters.</p>
          <Button onClick={onNew} className="bg-slate-900 text-white rounded-md text-xs">Create one</Button>
        </div>
      ) : (
        <div className="space-y-3" data-testid="weddings-list">
          {weddings.map(w => (
            <WeddingCard
              key={w.id}
              w={w}
              baseUrl={baseUrl}
              onEdit={onEdit} onDelete={onDelete} onTogglePublish={onTogglePublish}
              onViewRsvps={onViewRsvps} onPhotoWall={onPhotoWall} onClientAccess={onClientAccess}
              onInvitePassword={onInvitePassword}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function WeddingCard({ w, baseUrl, onEdit, onDelete, onTogglePublish, onViewRsvps, onPhotoWall, onClientAccess, onInvitePassword }) {
  const publicUrl = `${baseUrl}/wedding/${w.slug}`
  const [shortUrl, setShortUrl] = useState(null)
  const [qrUrl, setQrUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await authFetch('/api/shortlinks', {
        method: 'POST',
        body: JSON.stringify({ url: publicUrl, label: `${w.brideName}-${w.groomName}` }),
      })
      if (!res.ok) return
      const d = await res.json()
      if (cancelled) return
      const su = `${baseUrl}/s/${d.shortlink.id}`
      setShortUrl(su)
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(su)}&margin=4`)
    })()
    return () => { cancelled = true }
  }, [w.id, publicUrl, baseUrl, w.brideName, w.groomName])

  function copy(text, label = 'Copied') {
    navigator.clipboard.writeText(text)
    toast.success(label)
  }

  const photoWallOn = !!w.advancedSettings?.photoWall?.enabled
  const ownerHubUrl = w.ownerToken ? `${baseUrl}/hub/manage/${w.ownerToken}` : null
  const addonIds = Array.isArray(w.paymentAddons) ? w.paymentAddons : []

  return (
    <div data-testid={`wedding-card-${w.slug}`} className="border border-slate-200 bg-white rounded-md overflow-hidden">
      {/* Top row — couple info + status pills */}
      <div className="flex flex-col md:flex-row gap-3 items-start p-4 border-b border-slate-200">
        <div className="w-16 h-16 flex-shrink-0 bg-slate-100 overflow-hidden rounded">
          {w.heroImage?.url
            ? <img src={w.heroImage.url} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={18} /></div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-slate-900">
              {w.brideName} <span className="text-slate-400">&amp;</span> {w.groomName}
            </h3>
            <Pill tone={w.status === 'published' ? 'green' : 'amber'}>{w.status}</Pill>
            {w.plan && <Pill data-testid={`wedding-plan-${w.id}`}>{w.plan === 'vivoha' ? 'Vivoha · ₹2,999' : w.plan}</Pill>}
            {w.paymentStatus && w.paymentStatus !== 'not_started' && (
              <Pill tone={w.paymentStatus === 'approved' ? 'green' : w.paymentStatus === 'rejected' ? 'red' : 'amber'}>pmt · {w.paymentStatus}</Pill>
            )}
            {w.isTest && <Pill tone="amber"><FlaskConical size={9} className="mr-1 inline" />test</Pill>}
            {photoWallOn && <Pill tone="blue" data-testid={`wedding-wall-on-${w.slug}`}><Camera size={9} className="mr-1 inline" />Photo Wall</Pill>}
            {ownerHubUrl && <Pill tone="blue"><ShieldCheck size={9} className="mr-1 inline" />Owner Hub</Pill>}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span>{new Date(w.weddingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span>·</span>
            <span>{w.template}</span>
            <span>·</span>
            <span className="font-mono">/{w.slug}</span>
            <span>·</span>
            <span>{w.rsvpCount || 0} RSVPs</span>
            {w.paymentAmount > 0 && (
              <>
                <span>·</span>
                <span className="text-slate-700 font-medium">₹{w.paymentAmount.toLocaleString('en-IN')}</span>
              </>
            )}
          </div>
          {addonIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2" data-testid={`wedding-addons-${w.slug}`}>
              <span className="text-[10px] tracking-wider uppercase text-slate-500">Add-ons:</span>
              {addonIds.map(id => (
                <span key={id} className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">+ {id}</span>
              ))}
              {w.paymentAddonsAmount > 0 && (
                <span className="text-[10px] text-slate-500">+₹{w.paymentAddonsAmount.toLocaleString('en-IN')}</span>
              )}
            </div>
          )}
          {w.ownerWhatsapp && (
            <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5" data-testid={`wedding-owner-${w.slug}`}>
              <Phone size={10} /> Owner WA: <span className="font-mono">•••• {w.ownerWhatsapp.slice(-4)}</span>
              {w.publishCodeSetAt && <><span>·</span><Lock size={10} /><span>Publish code set</span></>}
            </div>
          )}
        </div>
      </div>

      {/* Invite kit (long/short URL + QR + PDF) */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 p-4 bg-slate-50" data-testid={`invite-kit-${w.slug}`}>
        <div className="space-y-2 min-w-0">
          <UrlRow label="Long URL" value={publicUrl} onCopy={() => copy(publicUrl, 'Long URL copied')} testIdPrefix={`long-${w.slug}`} />
          <UrlRow label="Short URL" value={shortUrl || 'Generating…'} disabled={!shortUrl} onCopy={() => shortUrl && copy(shortUrl, 'Short URL copied')} testIdPrefix={`short-${w.slug}`} />
          {ownerHubUrl && (
            <UrlRow label="Owner Hub" value={ownerHubUrl} onCopy={() => copy(ownerHubUrl, 'Hub link copied')} testIdPrefix={`hub-${w.slug}`} />
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={() => downloadInvitePdf(w)} data-testid={`wedding-pdf-${w.slug}`} variant="outline" size="sm" className="rounded-md border-slate-300 text-slate-700 hover:bg-slate-100 text-xs h-7 px-2.5">
              <FileText size={11} className="mr-1" /> Invite PDF
            </Button>
            {ownerHubUrl && (
              <a href={ownerHubUrl} target="_blank" rel="noreferrer" data-testid={`wedding-open-hub-${w.slug}`} className="inline-flex items-center gap-1 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs h-7 px-2.5">
                <ShieldCheck size={11} /> Open Hub
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1" data-testid={`qr-${w.slug}`}>
          {qrUrl ? <img src={qrUrl} alt="QR" className="w-20 h-20 bg-white p-1 border border-slate-200 rounded" /> : <div className="w-20 h-20 bg-white border border-slate-200 flex items-center justify-center text-slate-300 rounded"><QrCode size={18} /></div>}
          <div className="text-[9px] tracking-widest uppercase text-slate-400">QR</div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-1 p-3 border-t border-slate-200">
        {w.status === 'published' && (
          <ActionBtn href={publicUrl} icon={ExternalLink} label="View page" testId={`wedding-view-${w.slug}`} />
        )}
        <ActionBtn onClick={() => onEdit(w.id)} icon={Edit3} label="Edit" testId={`wedding-edit-${w.slug}`} />
        <ActionBtn onClick={() => onViewRsvps(w)} icon={Users} label={`RSVPs (${w.rsvpCount || 0})`} testId={`wedding-rsvps-${w.slug}`} />
        {photoWallOn && (
          <ActionBtn onClick={() => onPhotoWall(w.id)} icon={Camera} label="Photo Wall" testId={`wedding-photowall-${w.slug}`} />
        )}
        <ActionBtn onClick={() => onClientAccess(w)} icon={ShieldCheck} label="Legacy Access" testId={`wedding-client-access-${w.slug}`} />
        <ActionBtn onClick={() => onInvitePassword(w)} icon={Lock} label="Invite Password" testId={`wedding-invite-pw-${w.slug}`} />
        <ActionBtn onClick={() => onTogglePublish(w)} icon={Eye} label={w.status === 'published' ? 'Unpublish' : 'Publish'} testId={`wedding-publish-${w.slug}`} />
        <ActionBtn onClick={() => onDelete(w.id)} icon={Trash2} label="Delete" danger testId={`wedding-delete-${w.slug}`} />
      </div>
    </div>
  )
}

function Pill({ children, tone = 'slate', ...rest }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  }
  return <span className={`inline-flex items-center text-[10px] uppercase tracking-wider px-1.5 py-0.5 border rounded ${tones[tone]}`} {...rest}>{children}</span>
}

function ActionBtn({ icon: Icon, label, onClick, href, danger, testId }) {
  const cls = `inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border transition ${danger
    ? 'border-red-200 text-red-600 hover:bg-red-50'
    : 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'}`
  if (href) return <a href={href} target="_blank" rel="noreferrer" className={cls} data-testid={testId}><Icon size={12} /> {label}</a>
  return <button onClick={onClick} className={cls} data-testid={testId}><Icon size={12} /> {label}</button>
}

function UrlRow({ label, value, onCopy, disabled, testIdPrefix }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] tracking-wider uppercase text-slate-500 w-20 flex-shrink-0">{label}</span>
      <div data-testid={`${testIdPrefix}-value`} className={`flex-1 min-w-0 truncate text-xs font-mono ${disabled ? 'text-slate-400 italic' : 'text-slate-700'}`}>{value}</div>
      <button onClick={onCopy} disabled={disabled} data-testid={`${testIdPrefix}-copy`} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30" title="Copy"><Copy size={13} /></button>
    </div>
  )
}

function WeddingForm({ id, mode = 'wedding', onCancel, onSaved }) {
  const isPreviewMode = mode === 'preview'
  const [tab, setTab] = useState('basic')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!id)
  const [takenPreviewTemplates, setTakenPreviewTemplates] = useState({}) // { templateName: slug }
  const [form, setForm] = useState({
    brideName: '', groomName: '', tagline: '', weddingDate: '', slug: '',
    template: 'Moonveil', status: 'draft',
    story: '',
    heroImage: null, gallery: [],
    events: [],
    rsvpSettings: { enabled: true, deadline: '', mealOptions: ['Vegetarian', 'Non-Vegetarian'], guestLimit: null },
    advancedSettings: { socialMedia: { instagram: '', facebook: '' }, musicEmbed: '', giftRegistryLink: '', customDomain: '', photoWall: { enabled: false, title: 'Guest Photo Wall' } },
    theme: { accent: '', headingFont: '', bodyFont: '' },
    plan: isPreviewMode ? null : 'grand',
    isTest: false,
    isDemo: isPreviewMode,
  })

  // In preview mode, load existing previews to disable templates already taken (excluding the one being edited)
  useEffect(() => {
    if (!isPreviewMode) return
    let cancelled = false
    ;(async () => {
      const res = await authFetch('/api/weddings?isDemo=true')
      if (!res.ok) return
      const data = await res.json()
      if (cancelled) return
      const map = {}
      for (const w of (data.weddings || [])) {
        if (w.id !== id) map[w.template] = w.slug
      }
      setTakenPreviewTemplates(map)
    })()
    return () => { cancelled = true }
  }, [isPreviewMode, id])

  useEffect(() => {
    if (!id) return
    (async () => {
      setLoading(true)
      const res = await authFetch(`/api/weddings/${id}`)
      const data = await res.json()
      if (res.ok && data.wedding) {
        const w = data.wedding
        // Parse stored datetime back into date + time fields
        let dateOnly = ''
        let timeOnly = ''
        if (w.weddingDate) {
          const dt = new Date(w.weddingDate)
          if (!isNaN(dt.getTime())) {
            // Convert to IST so admin sees same time they entered
            const istParts = new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Asia/Kolkata',
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit', hour12: false,
            }).formatToParts(dt)
            const get = (t) => istParts.find(p => p.type === t)?.value
            dateOnly = `${get('year')}-${get('month')}-${get('day')}`
            const h = get('hour') === '24' ? '00' : get('hour')
            timeOnly = `${h}:${get('minute')}`
          }
        }
        setForm({
          ...form,
          ...w,
          weddingDate: dateOnly,
          weddingTime: timeOnly,
          plan: w.plan || (isPreviewMode ? null : 'grand'),
          isTest: !!w.isTest,
          isDemo: !!w.isDemo,
          rsvpSettings: {
            enabled: w.rsvpSettings?.enabled !== false,
            deadline: w.rsvpSettings?.deadline ? new Date(w.rsvpSettings.deadline).toISOString().slice(0, 10) : '',
            mealOptions: w.rsvpSettings?.mealOptions || ['Vegetarian', 'Non-Vegetarian'],
            guestLimit: w.rsvpSettings?.guestLimit || null,
          },
          advancedSettings: {
            socialMedia: w.advancedSettings?.socialMedia || { instagram: '', facebook: '' },
            musicEmbed: w.advancedSettings?.musicEmbed || '',
            giftRegistryLink: w.advancedSettings?.giftRegistryLink || '',
            customDomain: w.advancedSettings?.customDomain || '',
            photoWall: {
              enabled: w.advancedSettings?.photoWall?.enabled === true,
              title: w.advancedSettings?.photoWall?.title || 'Guest Photo Wall',
            },
          },
          theme: {
            accent: w.theme?.accent || '',
            headingFont: w.theme?.headingFont || '',
            bodyFont: w.theme?.bodyFont || '',
          },
        })
      }
      setLoading(false)
    })()
  }, [id])

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function uploadImage(file) {
    if (file.size > 8 * 1024 * 1024) { toast.error('Image must be under 8MB'); return null }
    const dataUri = await fileToDataUri(file)
    const res = await authFetch('/api/upload', { method: 'POST', body: JSON.stringify({ dataUri }) })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Upload failed'); return null }
    return data
  }

  async function onHeroChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    toast.loading('Uploading…', { id: 'up' })
    const r = await uploadImage(file)
    toast.dismiss('up')
    if (r) { set('heroImage', { url: r.url, publicId: r.publicId }); toast.success('Hero uploaded') }
  }

  async function onGalleryChange(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const planCfg = PLAN_CONFIG[form.plan] || PLAN_CONFIG.classic
    const maxAllowed = planCfg.limits.maxGalleryPhotos
    const currentCount = (form.gallery || []).length
    const remaining = Math.max(0, maxAllowed - currentCount)
    if (remaining <= 0) {
      toast.error(`Your ${planCfg.name} plan includes ${maxAllowed} gallery photos. Upgrade for more.`)
      e.target.value = ''
      return
    }
    const toUpload = files.slice(0, remaining)
    if (files.length > remaining) {
      toast.message(`Only ${remaining} more photo${remaining === 1 ? '' : 's'} fit your ${planCfg.name} plan. Uploading the first ${remaining}.`)
    }
    toast.loading(`Uploading ${toUpload.length} image(s)…`, { id: 'gup' })
    const uploaded = []
    for (const f of toUpload) {
      const r = await uploadImage(f)
      if (r) uploaded.push({ url: r.url, publicId: r.publicId })
    }
    toast.dismiss('gup')
    if (uploaded.length) {
      set('gallery', [...(form.gallery || []), ...uploaded])
      toast.success(`${uploaded.length} added`)
    }
    e.target.value = ''
  }

  function removeGalleryItem(idx) {
    set('gallery', form.gallery.filter((_, i) => i !== idx))
  }

  function addEvent() {
    set('events', [...(form.events || []), { name: '', date: form.weddingDate || '', startTime: '', endTime: '', venue: '', address: '', mapsLink: '', description: '' }])
  }
  function updateEvent(i, k, v) {
    const evs = [...form.events]
    evs[i] = { ...evs[i], [k]: v }
    set('events', evs)
  }
  function removeEvent(i) {
    set('events', form.events.filter((_, idx) => idx !== i))
  }

  async function save(status) {
    if (!form.brideName || !form.groomName || !form.weddingDate) {
      toast.error('Please fill bride name, groom name and date')
      setTab('basic'); return
    }
    if (!isPreviewMode && !form.plan) {
      toast.error('Please select a plan')
      setTab('basic'); return
    }
    if (isPreviewMode && takenPreviewTemplates[form.template]) {
      toast.error(`A preview for "${form.template}" already exists. Pick a different template.`)
      setTab('basic'); return
    }
    setSaving(true)
    try {
      // Combine date + (optional) time into an ISO datetime with IST (+05:30)
      // so it displays consistently regardless of where server / viewer is.
      const time = (form.weddingTime || '').trim() || '12:00'
      const isoIST = `${form.weddingDate}T${time}:00+05:30`
      const combinedDate = new Date(isoIST)
      const payload = {
        ...form,
        status: status || form.status,
        weddingDate: isNaN(combinedDate.getTime()) ? form.weddingDate : combinedDate.toISOString(),
        // Preview pages always have isDemo=true and no plan/revenue
        isDemo: isPreviewMode ? true : !!form.isDemo,
        isTest: isPreviewMode ? false : !!form.isTest,
        plan: isPreviewMode ? null : form.plan,
      }
      if (payload.rsvpSettings && !payload.rsvpSettings.deadline) delete payload.rsvpSettings.deadline
      const url = id ? `/api/weddings/${id}` : '/api/weddings'
      const method = id ? 'PUT' : 'POST'
      const res = await authFetch(url, { method, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      toast.success(id ? `${isPreviewMode ? 'Preview' : 'Wedding'} updated` : `${isPreviewMode ? 'Preview' : 'Wedding'} created`)
      onSaved()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  if (loading) return <div className="text-center py-16 text-slate-500">Loading…</div>

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'story', label: 'Story & Photos' },
    { id: 'events', label: 'Events' },
    { id: 'rsvp', label: 'RSVP' },
    { id: 'design', label: 'Design' },
    { id: 'advanced', label: 'Advanced' },
  ]

  return (
    <div>
      <button onClick={onCancel} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 text-sm">
        <ChevronLeft size={16} /> Back to {isPreviewMode ? 'previews' : 'weddings'}
      </button>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-slate-500 tracking-[0.3em] text-xs uppercase mb-2 flex items-center gap-2">
            {isPreviewMode && <Sparkles size={12} className="text-slate-400" />}
            {id ? 'Edit' : 'Create'} {isPreviewMode ? '· Preview' : ''}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {form.brideName && form.groomName ? <>{form.brideName} <em className="italic text-slate-500">&amp;</em> {form.groomName}</> : (isPreviewMode ? 'New preview' : 'New wedding')}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => save('draft')} disabled={saving} variant="outline" className="rounded-none border-slate-900 text-slate-900 bg-transparent tracking-widest text-xs uppercase">
            <Save size={14} className="mr-2" /> Save Draft
          </Button>
          <Button onClick={() => save('published')} disabled={saving} data-testid="publish-btn" className="bg-slate-900 hover:bg-slate-800 text-slate-50 rounded-none tracking-widest text-xs uppercase">
            {saving ? 'Saving…' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* PLAN BANNER (real weddings only) */}
      {!isPreviewMode && <PlanBanner form={form} set={set} />}
      {isPreviewMode && (
        <div className="mb-8 p-5 border border-slate-300 bg-slate-50/60 flex items-start gap-3" data-testid="preview-banner">
          <Sparkles size={18} className="text-slate-500 flex-shrink-0 mt-1" />
          <div className="text-sm text-slate-900">
            <div className="font-medium mb-1">This is a Preview page</div>
            <div className="text-slate-500">
              Visitors will see Vivoha branding and a "Book This Template" call-to-action.
              Previews are excluded from revenue and customer weddings.
            </div>
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="border-b border-slate-300/50 mb-8 flex flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-5 py-3 text-sm tracking-widest uppercase transition border-b-2 ${tab === t.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* PANELS */}
      <div className="max-w-3xl space-y-6">
        {tab === 'basic' && (
          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Bride's full name *">
                <Input value={form.brideName} onChange={(e) => set('brideName', e.target.value)} data-testid="bride-name-input" className="rounded-none border-slate-300 bg-white/40" />
              </Field>
              <Field label="Groom's full name *">
                <Input value={form.groomName} onChange={(e) => set('groomName', e.target.value)} data-testid="groom-name-input" className="rounded-none border-slate-300 bg-white/40" />
              </Field>
            </div>
            <Field label="Tagline">
              <Input value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="A love written in the stars" maxLength={200} className="rounded-none border-slate-300 bg-white/40" />
            </Field>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Wedding date *">
                <Input type="date" value={form.weddingDate} onChange={(e) => set('weddingDate', e.target.value)} data-testid="wedding-date-input" className="rounded-none border-slate-300 bg-white/40" />
              </Field>
              <Field label="Muhurtham time" hint="Exact start time — countdown ticks to this moment">
                <Input type="time" value={form.weddingTime} onChange={(e) => set('weddingTime', e.target.value)} data-testid="wedding-time-input" className="rounded-none border-slate-300 bg-white/40" />
              </Field>
              <Field label={<span className="inline-flex items-center gap-2">Custom URL slug {!isPreviewMode && <PlanChip current={form.plan} requires="grand" />}</span>} hint={`/wedding/${form.slug || 'your-url'}`}>
                <Input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="aanya-and-vikram" className="rounded-none border-slate-300 bg-white/40" />
              </Field>
            </div>
            <Field label={<span className="inline-flex items-center gap-2">Template {!isPreviewMode && form.plan === 'classic' && <PlanChip current={form.plan} requires="grand" label="Grand unlocks all 12" />}{isPreviewMode && <span className="text-[10px] tracking-widest uppercase text-slate-500">One preview per template</span>}</span>}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { name: 'Moonveil', tag: 'Minimal · Timeless' },
                  { name: 'Royal Heritage', tag: 'Royal · Ornate' },
                  { name: 'Eternal Edit', tag: 'Cinematic · Bold' },
                  { name: 'Crimson Lotus', tag: 'Floral · Romantic' },
                  { name: 'Sapphire Saga', tag: 'Celestial · Mughal' },
                  { name: 'Sanctum Veil', tag: 'Christian · Sacred' },
                  { name: 'Marigold Bloom', tag: 'Festive · Vibrant' },
                  { name: 'Pearl & Velvet', tag: 'Art Deco · Gatsby' },
                  { name: 'Banyan & Brass', tag: 'South Indian · Temple' },
                  { name: 'Pichwai Bloom', tag: 'Pichwai · Royal Floral' },
                  { name: 'Albion Vow', tag: 'English · Classic · Garden' },
                  { name: 'Jannah Vow', tag: 'Muslim · Nikah · Mughal' },
                ].map(t => {
                  const taken = isPreviewMode && !!takenPreviewTemplates[t.name]
                  const isSelected = form.template === t.name
                  return (
                    <button
                      key={t.name}
                      type="button"
                      disabled={taken}
                      onClick={() => { if (!taken) set('template', t.name) }}
                      data-testid={`template-option-${t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      title={taken ? `A preview already exists for ${t.name}` : ''}
                      className={`p-4 border text-left transition relative ${isSelected ? 'border-slate-900 bg-slate-900 text-slate-50' : taken ? 'border-slate-300/50 bg-slate-100 text-slate-500 cursor-not-allowed' : 'border-slate-300 bg-white/40 text-slate-900 hover:border-slate-900'}`}
                    >
                      <div className={`text-base font-medium ${taken && !isSelected ? 'line-through opacity-60' : ''}`}>{t.name}</div>
                      <div className="text-[10px] tracking-widest uppercase mt-1 opacity-70">{t.tag}</div>
                      {taken && (
                        <div className="absolute top-2 right-2 text-[9px] tracking-[0.2em] uppercase bg-slate-200 text-slate-900 px-1.5 py-0.5">Taken</div>
                      )}
                    </button>
                  )
                })}
              </div>
            </Field>
          </div>
        )}

        {tab === 'story' && (
          <div className="space-y-6">
            <Field label="Our love story" hint="Share how you met, your journey, your favorite memories.">
              <Textarea value={form.story} onChange={(e) => set('story', e.target.value)} rows={8} maxLength={5000} className="rounded-none border-slate-300 bg-white/40" />
              <div className="text-xs text-slate-500 mt-1">{form.story?.length || 0} / 5000</div>
            </Field>

            <Field label="Hero image" hint="The first image guests see. Choose your most striking photo.">
              {form.heroImage?.url ? (
                <div className="relative inline-block">
                  <img src={form.heroImage.url} className="w-full max-w-md aspect-[16/10] object-cover border border-slate-300" alt="" />
                  <button onClick={() => set('heroImage', null)} className="absolute top-2 right-2 bg-white/90 p-1.5"><X size={14} /></button>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-slate-300 p-12 text-center cursor-pointer hover:border-slate-400 transition">
                  <ImageIcon className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                  <div className="text-sm text-slate-900">Click to upload hero image</div>
                  <div className="text-xs text-slate-500 mt-1">JPG, PNG, WEBP up to 8MB</div>
                  <input type="file" accept="image/*" onChange={onHeroChange} className="hidden" />
                </label>
              )}
            </Field>

            <Field
              label={
                <span className="inline-flex items-center gap-2">
                  Gallery
                  {!isPreviewMode && (() => {
                    const pc = PLAN_CONFIG[form.plan] || PLAN_CONFIG.classic
                    const used = (form.gallery || []).length
                    const max = pc.limits.maxGalleryPhotos
                    const atCap = used >= max
                    return (
                      <span data-testid="gallery-counter" className={`text-[10px] tracking-widest uppercase px-2 py-1 border ${atCap ? 'border-amber-500 text-amber-700 bg-amber-50' : 'border-slate-300 text-slate-900'}`}>
                        {used} / {max}
                      </span>
                    )
                  })()}
                </span>
              }
              hint="Add multiple images to showcase your moments."
            >
              <label className="block border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-slate-400 transition mb-4">
                <Plus className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                <div className="text-sm text-slate-900">Add gallery images</div>
                <input type="file" accept="image/*" multiple onChange={onGalleryChange} className="hidden" />
              </label>
              {form.gallery?.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {form.gallery.map((g, i) => (
                    <div key={g.publicId || i} className="relative aspect-square group">
                      <img src={g.url} className="w-full h-full object-cover" alt="" />
                      <button onClick={() => removeGalleryItem(i)} className="absolute top-1 right-1 bg-white/90 p-1 opacity-0 group-hover:opacity-100 transition">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Field>
          </div>
        )}

        {tab === 'events' && (
          <div className="space-y-4">
            {form.events?.map((ev, i) => (
              <div key={i} className="border border-slate-300 p-5 bg-white/40 relative">
                <button onClick={() => removeEvent(i)} className="absolute top-3 right-3 text-red-700 hover:bg-red-50 p-1"><Trash2 size={14} /></button>
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Event name">
                    <Input value={ev.name} onChange={(e) => updateEvent(i, 'name', e.target.value)} placeholder="Mehendi, Sangeet, Ceremony…" className="rounded-none border-slate-300 bg-white/40" />
                  </Field>
                  <Field label="Date">
                    <Input type="date" value={ev.date ? String(ev.date).slice(0, 10) : ''} onChange={(e) => updateEvent(i, 'date', e.target.value)} className="rounded-none border-slate-300 bg-white/40" />
                  </Field>
                  <Field label="Start time">
                    <Input value={ev.startTime} onChange={(e) => updateEvent(i, 'startTime', e.target.value)} placeholder="6:00 PM" className="rounded-none border-slate-300 bg-white/40" />
                  </Field>
                  <Field label="End time">
                    <Input value={ev.endTime} onChange={(e) => updateEvent(i, 'endTime', e.target.value)} placeholder="11:00 PM" className="rounded-none border-slate-300 bg-white/40" />
                  </Field>
                  <Field label="Venue name" className="md:col-span-2">
                    <Input value={ev.venue} onChange={(e) => updateEvent(i, 'venue', e.target.value)} className="rounded-none border-slate-300 bg-white/40" />
                  </Field>
                  <Field label="Full address" className="md:col-span-2">
                    <Textarea value={ev.address} onChange={(e) => updateEvent(i, 'address', e.target.value)} rows={2} className="rounded-none border-slate-300 bg-white/40" />
                  </Field>
                  <Field label="Google Maps link" className="md:col-span-2">
                    <Input value={ev.mapsLink} onChange={(e) => updateEvent(i, 'mapsLink', e.target.value)} placeholder="https://maps.google.com/…" className="rounded-none border-slate-300 bg-white/40" />
                  </Field>
                  <Field label="Description" className="md:col-span-2">
                    <Textarea value={ev.description} onChange={(e) => updateEvent(i, 'description', e.target.value)} rows={2} maxLength={500} className="rounded-none border-slate-300 bg-white/40" />
                  </Field>
                </div>
              </div>
            ))}
            <button onClick={addEvent} className="w-full border-2 border-dashed border-slate-300 py-6 text-slate-500 hover:border-slate-900 hover:text-slate-900 flex items-center justify-center gap-2 transition">
              <Plus size={16} /> Add event
            </button>
          </div>
        )}

        {tab === 'rsvp' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 border border-slate-300 bg-white/40">
              <div>
                <div className="text-base font-medium text-slate-900">Enable RSVP</div>
                <div className="text-xs text-slate-500">Let guests respond to your invitation</div>
              </div>
              <Switch checked={form.rsvpSettings.enabled} onCheckedChange={(v) => set('rsvpSettings', { ...form.rsvpSettings, enabled: v })} />
            </div>
            {!isPreviewMode && form.plan === 'classic' && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-300 p-3" data-testid="rsvp-guest-limit-note">
                Classic plan: up to 100 guests. Upgrade to Grand for unlimited guests &amp; advanced meal tracking.
              </div>
            )}
            {form.rsvpSettings.enabled && (
              <>
                <Field label="RSVP deadline">
                  <Input type="date" value={form.rsvpSettings.deadline} onChange={(e) => set('rsvpSettings', { ...form.rsvpSettings, deadline: e.target.value })} className="rounded-none border-slate-300 bg-white/40" />
                </Field>
                <Field label={<span className="inline-flex items-center gap-2">Meal options {!isPreviewMode && <PlanChip current={form.plan} requires="grand" label="Advanced — Grand+" />}</span>} hint="Comma separated">
                  <Input value={(form.rsvpSettings.mealOptions || []).join(', ')} onChange={(e) => set('rsvpSettings', { ...form.rsvpSettings, mealOptions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} className="rounded-none border-slate-300 bg-white/40" />
                </Field>
              </>
            )}
          </div>
        )}

        {tab === 'design' && (
          <DesignPanel form={form} set={set} />
        )}

        {tab === 'advanced' && (
          <div className="space-y-5">
            <Field label="Instagram URL">
              <Input value={form.advancedSettings.socialMedia.instagram} onChange={(e) => set('advancedSettings', { ...form.advancedSettings, socialMedia: { ...form.advancedSettings.socialMedia, instagram: e.target.value } })} className="rounded-none border-slate-300 bg-white/40" />
            </Field>
            <Field label={<span className="inline-flex items-center gap-2">Custom domain {!isPreviewMode && <PlanChip current={form.plan} requires="elegant" />}</span>} hint="e.g. aanya-vikram.com — Elegant only">
              <Input
                value={form.advancedSettings.customDomain}
                onChange={(e) => set('advancedSettings', { ...form.advancedSettings, customDomain: e.target.value })}
                placeholder="aanya-vikram.com"
                disabled={!isPreviewMode && !planSatisfies(form.plan, 'elegant')}
                data-testid="custom-domain-input"
                className="rounded-none border-slate-300 bg-white/40 disabled:opacity-50"
              />
            </Field>
            <Field label={<span className="inline-flex items-center gap-2">Gift registry link {!isPreviewMode && <PlanChip current={form.plan} requires="grand" />}</span>}>
              <Input
                value={form.advancedSettings.giftRegistryLink}
                onChange={(e) => set('advancedSettings', { ...form.advancedSettings, giftRegistryLink: e.target.value })}
                disabled={!isPreviewMode && !planSatisfies(form.plan, 'grand')}
                className="rounded-none border-slate-300 bg-white/40 disabled:opacity-50"
              />
            </Field>
            <Field label={<span className="inline-flex items-center gap-2">Music / Video embed URL {!isPreviewMode && <PlanChip current={form.plan} requires="grand" label={planSatisfies(form.plan, 'elegant') ? 'Music + Video' : 'Video — Grand+'} />}</span>} hint="YouTube/Vimeo for video (Grand+) or Spotify for music (Elegant)">
              <Input
                value={form.advancedSettings.musicEmbed}
                onChange={(e) => set('advancedSettings', { ...form.advancedSettings, musicEmbed: e.target.value })}
                disabled={!isPreviewMode && !planSatisfies(form.plan, 'grand')}
                data-testid="music-embed-input"
                className="rounded-none border-slate-300 bg-white/40 disabled:opacity-50"
              />
            </Field>

            {/* LIVE PHOTO WALL */}
            <div className="border border-slate-300 bg-white/40 p-4 mt-6" data-testid="photo-wall-settings">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <Camera size={18} className="text-slate-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-slate-900 inline-flex items-center gap-2">
                      Live Photo Wall {!isPreviewMode && <PlanChip current={form.plan} requires="grand" />}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">Guests upload photos during the event. You moderate. Approved photos appear live on the wedding page.</div>
                    {!isPreviewMode && !planSatisfies(form.plan, 'grand') && (
                      <div className="text-xs italic text-amber-700 mt-1">Available on the Grand and Elegant experiences.</div>
                    )}
                  </div>
                </div>
                <Switch
                  checked={!!form.advancedSettings.photoWall?.enabled}
                  onCheckedChange={(v) => set('advancedSettings', { ...form.advancedSettings, photoWall: { ...(form.advancedSettings.photoWall || {}), enabled: v } })}
                  disabled={!isPreviewMode && !planSatisfies(form.plan, 'grand')}
                  data-testid="photo-wall-toggle"
                />
              </div>
              {form.advancedSettings.photoWall?.enabled && (
                <div className="mt-4 pl-9">
                  <Field label="Section title" hint="Shown above the photo grid on the public page">
                    <Input
                      value={form.advancedSettings.photoWall?.title || ''}
                      onChange={(e) => set('advancedSettings', { ...form.advancedSettings, photoWall: { ...form.advancedSettings.photoWall, title: e.target.value } })}
                      placeholder="Guest Photo Wall"
                      className="rounded-none border-slate-300 bg-white/40"
                      data-testid="photo-wall-title-input"
                    />
                  </Field>
                </div>
              )}
            </div>

            {/* TEST MODE — only relevant for real weddings */}
            {!isPreviewMode && (
              <div className="flex items-center justify-between p-4 border border-dashed border-amber-600/60 bg-amber-50/40 mt-8" data-testid="test-mode-row">
                <div className="flex items-start gap-3">
                  <FlaskConical size={18} className="text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">Test wedding</div>
                    <div className="text-xs text-slate-500 mt-0.5">When enabled, this wedding is excluded from platform revenue.</div>
                  </div>
                </div>
                <Switch checked={!!form.isTest} onCheckedChange={(v) => set('isTest', v)} data-testid="test-mode-toggle" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, hint, children, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-xs tracking-widest uppercase text-slate-500">{label}</Label>
      {children}
      {hint && <div className="text-xs text-slate-900/60">{hint}</div>}
    </div>
  )
}

/* =========================
   DESIGN PANEL — accent color + font picker
   ========================= */
function DesignPanel({ form, set }) {
  const theme = form.theme || { accent: '', headingFont: '', bodyFont: '' }
  function setTheme(patch) { set('theme', { ...theme, ...patch }) }
  const swatches = [
    '', // template default
    '#8B7355', // warm taupe
    '#8B0000', // crimson
    '#0F5132', // emerald
    '#1F3A5F', // sapphire
    '#B8456C', // rose
    '#D4AF37', // gold
    '#2D5016', // forest
    '#5A2A30', // wine
    '#2B3A52', // dusk blue
    '#8B9B7E', // sage
    '#B8860B', // amber
  ]
  const previewHeading = HEADING_FONTS.find(f => f.id === theme.headingFont)
  const previewBody = BODY_FONTS.find(f => f.id === theme.bodyFont)
  return (
    <div className="space-y-6" data-testid="design-panel">
      <div className="border border-slate-300 bg-white/40 p-4">
        <div className="text-xs tracking-widest uppercase text-slate-500 mb-3">Accent Colour</div>
        <div className="flex flex-wrap items-center gap-2">
          {swatches.map(c => (
            <button
              key={c || 'default'}
              type="button"
              onClick={() => setTheme({ accent: c })}
              data-testid={`theme-swatch-${c || 'default'}`}
              className={`relative w-9 h-9 border transition ${theme.accent === c ? 'ring-2 ring-offset-2 ring-[#3A3226]' : 'hover:scale-110'}`}
              style={{
                background: c || 'repeating-linear-gradient(45deg,#fff,#fff 4px,#C9B896 4px,#C9B896 8px)',
                borderColor: c || '#C9B896',
              }}
              title={c || 'Use template default'}
            >
              {!c && <span className="absolute inset-0 flex items-center justify-center text-[8px] tracking-widest uppercase text-slate-900">Auto</span>}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-2">
            <input
              type="color"
              value={theme.accent || '#8B7355'}
              onChange={(e) => setTheme({ accent: e.target.value })}
              data-testid="theme-accent-color-input"
              className="w-9 h-9 border border-slate-300 cursor-pointer"
              title="Pick a custom colour"
            />
            <Input
              value={theme.accent || ''}
              onChange={(e) => setTheme({ accent: e.target.value })}
              placeholder="#hex"
              maxLength={9}
              className="rounded-none border-slate-300 bg-white/40 w-28 h-9 text-xs"
              data-testid="theme-accent-hex-input"
            />
          </div>
        </div>
        <div className="text-xs text-slate-900/60 mt-3">Used for highlights, dividers and call-to-action ornaments. Leave on <em>Auto</em> to keep the template's curated palette.</div>
      </div>

      <FontPicker
        label="Heading font"
        hint="Used for couple names, section titles and the hero text."
        testIdPrefix="theme-heading-font"
        fonts={HEADING_FONTS}
        value={theme.headingFont}
        onChange={(id) => setTheme({ headingFont: id })}
        previewText={`${form.brideName || 'Anaya'} & ${form.groomName || 'Vihaan'}`}
        defaultMood="Template's curated typeface"
      />

      <FontPicker
        label="Body font"
        hint="Used for story, schedule and longer paragraphs."
        testIdPrefix="theme-body-font"
        fonts={BODY_FONTS}
        value={theme.bodyFont}
        onChange={(id) => setTheme({ bodyFont: id })}
        previewText="Built side by side, sketch by sketch — every detail tells our story."
        defaultMood="Template's curated typeface"
      />

      {/* Combined preview card */}
      <div className="border border-slate-300 bg-slate-50 p-6 text-center" data-testid="theme-preview">
        <div className="text-[10px] tracking-[0.3em] uppercase text-slate-500 mb-3" style={{ color: theme.accent || undefined }}>A glimpse of your invitation</div>
        <h3
          className="text-3xl md:text-4xl font-light leading-tight mb-3"
          style={{
            fontFamily: previewHeading?.stack || '"Cormorant Garamond", Georgia, serif',
            color: '#3A3226',
          }}
        >
          {form.brideName || 'Anaya'} <em className="italic" style={{ color: theme.accent || '#8B7355' }}>&amp;</em> {form.groomName || 'Vihaan'}
        </h3>
        <p
          className="text-sm md:text-base text-slate-900/75 italic max-w-md mx-auto"
          style={{ fontFamily: previewBody?.stack || '"Cormorant Garamond", Georgia, serif' }}
        >
          &ldquo;{form.tagline || 'Built side by side, sketch by sketch.'}&rdquo;
        </p>
      </div>
    </div>
  )
}

function FontPicker({ label, hint, fonts, value, onChange, previewText, defaultMood, testIdPrefix }) {
  return (
    <div className="border border-slate-300 bg-white/40 p-4">
      <div className="text-xs tracking-widest uppercase text-slate-500 mb-1">{label}</div>
      {hint && <div className="text-xs text-slate-900/60 mb-3">{hint}</div>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
        <FontTile
          isSelected={!value}
          name="Template default"
          preview="As designed"
          stack='"Cormorant Garamond", Georgia, serif'
          onClick={() => onChange('')}
          mood={defaultMood}
          testId={`${testIdPrefix}-default`}
        />
        {fonts.map(f => (
          <FontTile
            key={f.id}
            isSelected={value === f.id}
            name={f.name}
            preview={previewText}
            stack={f.stack}
            mood={f.mood}
            onClick={() => onChange(f.id)}
            testId={`${testIdPrefix}-${f.id}`}
          />
        ))}
      </div>
    </div>
  )
}

function FontTile({ isSelected, name, preview, stack, mood, onClick, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`text-left p-3 border transition ${isSelected ? 'border-slate-900 bg-slate-900 text-slate-50' : 'border-slate-300 bg-white/60 text-slate-900 hover:border-slate-900'}`}
    >
      <div className="text-[9px] tracking-[0.25em] uppercase opacity-70">{name}</div>
      <div className="text-base leading-tight mt-1 truncate" style={{ fontFamily: stack }}>{preview}</div>
      {mood && <div className="text-[10px] mt-1 opacity-60 italic">{mood}</div>}
    </button>
  )
}


/* =========================
   PLAN CONSTANTS & HELPERS
   ========================= */
// Plans — pull from central config so server and UI never drift
import { PLAN_CONFIG, PLAN_ORDER, getPlan as getPlanCfg } from '@/lib/plans'
const PLAN_LIST = PLAN_ORDER.map(id => ({
  id,
  name: PLAN_CONFIG[id].name,
  price: PLAN_CONFIG[id].price,
  tagline: PLAN_CONFIG[id].tagline,
  features: PLAN_CONFIG[id].perks,
}))
const PLAN_RANK = Object.fromEntries(PLAN_ORDER.map((id, i) => [id, i + 1]))
const PLAN_PRICES = Object.fromEntries(PLAN_ORDER.map(id => [id, PLAN_CONFIG[id].price]))

function planSatisfies(current, required) {
  if (!current) return false
  return (PLAN_RANK[current] || 0) >= (PLAN_RANK[required] || 0)
}

function photoLimitLabel(plan) {
  const cfg = PLAN_CONFIG[plan]
  if (!cfg) return null
  return `${cfg.name} — up to ${cfg.limits.maxGalleryPhotos} photos`
}

function PlanChip({ current, requires, label }) {
  const ok = planSatisfies(current, requires)
  const text = label || `${requires.charAt(0).toUpperCase() + requires.slice(1)}+`
  return (
    <span
      data-testid={`plan-chip-${requires}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] tracking-[0.2em] uppercase border ${ok ? 'border-emerald-700/40 text-emerald-800 bg-emerald-50' : 'border-amber-700/40 text-amber-800 bg-amber-50'}`}
    >
      {text}
    </span>
  )
}

function PlanBanner({ form, set }) {
  return (
    <div className="mb-8 border border-slate-300 bg-white/60 p-5" data-testid="plan-banner">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="text-slate-500 tracking-[0.3em] text-[10px] uppercase mb-1">Plan</div>
          <div className="font-semibold text-slate-900">
            {form.plan
              ? <>Selected: <em className="italic text-slate-500">{PLAN_LIST.find(p => p.id === form.plan)?.name}</em></>
              : 'Choose a plan to continue'}
          </div>
        </div>
        {form.plan && (
          <div className="text-xl font-semibold text-slate-900">
            ₹{(PLAN_PRICES[form.plan] || 0).toLocaleString('en-IN')}
            <span className="text-xs text-slate-500 tracking-widest ml-2 uppercase">one-time</span>
          </div>
        )}
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {PLAN_LIST.map(p => {
          const active = form.plan === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => set('plan', p.id)}
              data-testid={`plan-option-${p.id}`}
              className={`text-left p-4 border transition ${active ? 'border-slate-900 bg-slate-900 text-slate-50' : 'border-slate-300 bg-white/40 hover:border-slate-900'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className={`text-base font-medium ${active ? 'text-slate-50' : 'text-slate-900'}`}>{p.name}</div>
                <div className={`text-xs tracking-widest uppercase ${active ? 'text-slate-400' : 'text-slate-500'}`}>₹{p.price.toLocaleString('en-IN')}</div>
              </div>
              <div className={`text-[10px] tracking-[0.2em] uppercase mb-3 ${active ? 'text-slate-400' : 'text-slate-500'}`}>{p.tagline}</div>
              <ul className={`text-xs space-y-1 ${active ? 'text-slate-50/85' : 'text-slate-900/75'}`}>
                {p.features.map(f => (<li key={f}>• {f}</li>))}
              </ul>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* =========================
   PREVIEWS LIST
   ========================= */
function PreviewsList({ previews, onNew, onEdit, onDelete, onTogglePublish, onReload }) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return (
    <div data-testid="previews-view">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-slate-500 tracking-[0.3em] text-xs uppercase mb-2 inline-flex items-center gap-2"><Sparkles size={12} className="text-slate-400" /> Showroom</div>
          <h1 className="text-2xl font-semibold tracking-tight">Template previews</h1>
        </div>
        <Button onClick={onNew} data-testid="new-preview-btn" className="bg-slate-900 hover:bg-slate-800 text-slate-50 rounded-none tracking-widest text-xs uppercase">
          <Plus size={14} className="mr-2" /> New Preview
        </Button>
      </div>

      <div className="border border-slate-300/50 bg-slate-50/60 p-4 mb-6 text-sm text-slate-900/80">
        Previews are public demo pages for each template. Visitors see Vivoha branding and a <em className="italic">"Book This Template"</em> call-to-action. They are not counted as customer weddings or platform revenue.
      </div>

      {previews.length === 0 ? (
        <div className="border border-dashed border-slate-300 p-16 text-center">
          <Sparkles className="w-10 h-10 text-slate-500 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-900 mb-2">No previews yet</h3>
          <p className="text-slate-900/70 mb-6">Create demo pages for each template to showcase your studio's signatures.</p>
          <Button onClick={onNew} className="bg-slate-900 hover:bg-slate-800 text-slate-50 rounded-none tracking-widest text-xs uppercase">
            <Plus size={14} className="mr-2" /> Create your first preview
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="previews-grid">
          {previews.map(w => {
            const publicUrl = `${baseUrl}/wedding/${w.slug}`
            return (
              <div key={w.id} className="border border-slate-300/50 bg-white/40 group" data-testid={`preview-card-${w.slug}`}>
                <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
                  {w.heroImage?.url
                    ? <img src={w.heroImage.url} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon size={32} /></div>}
                  <Badge className="absolute top-3 left-3 rounded-none text-[10px] tracking-widest uppercase bg-slate-200 text-slate-900">{w.template}</Badge>
                  <Badge className={`absolute top-3 right-3 rounded-none text-[10px] tracking-widest uppercase ${w.status === 'published' ? 'bg-slate-900 text-slate-50' : 'bg-white/80 text-slate-900'}`}>{w.status}</Badge>
                </div>
                <div className="p-4">
                  <div className="text-base font-medium text-slate-900">{w.brideName} <span className="italic text-slate-500">&amp;</span> {w.groomName}</div>
                  <div className="text-xs text-slate-500 mt-1">/{w.slug}</div>
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {w.status === 'published' && (
                      <a href={publicUrl} target="_blank" rel="noreferrer" className="p-2 text-slate-500 hover:bg-slate-100" title="Open" data-testid={`preview-view-${w.slug}`}><ExternalLink size={14} /></a>
                    )}
                    <button onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success('Link copied') }} className="p-2 text-slate-500 hover:bg-slate-100" title="Copy link" data-testid={`preview-copy-${w.slug}`}><Copy size={14} /></button>
                    <button onClick={() => onTogglePublish(w)} className="p-2 text-slate-500 hover:bg-slate-100" title="Toggle publish" data-testid={`preview-toggle-${w.slug}`}><Eye size={14} /></button>
                    <button onClick={() => onEdit(w.id)} className="p-2 text-slate-500 hover:bg-slate-100" title="Edit" data-testid={`preview-edit-${w.slug}`}><Edit3 size={14} /></button>
                    <button onClick={() => onDelete(w.id)} className="p-2 text-red-700 hover:bg-red-50 ml-auto" title="Delete" data-testid={`preview-delete-${w.slug}`}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* =========================
   OWNER HUBS VIEW (Batch 3)
   ========================= */
function HubsView() {
  const [hubs, setHubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : ''
      const res = await authFetch(`/api/admin/hubs${params}`)
      if (res.ok) {
        const d = await res.json()
        setHubs(d.hubs || [])
      } else toast.error('Could not load hubs')
    } catch (_e) { toast.error('Could not load hubs') }
    finally { setLoading(false) }
  }, [q])

  useEffect(() => { load() }, [load])

  async function resetCode(w) {
    if (!confirm(`Reset publish code for ${w.brideName} & ${w.groomName}?\n\nThe couple will need to re-set it from WhatsApp before they can sign in to their Hub again.`)) return
    const res = await authFetch(`/api/admin/hubs/${w.id}/reset-publish-code`, { method: 'POST' })
    if (res.ok) {
      toast.success('Publish code reset')
      load()
    } else {
      const j = await res.json().catch(() => ({}))
      toast.error(j.error || 'Could not reset')
    }
  }

  function copy(text, label = 'Copied') {
    navigator.clipboard.writeText(text)
    toast.success(label)
  }

  // Stats — derived
  const totals = {
    active: hubs.length,
    paid: hubs.filter(h => h.paymentStatus === 'approved').length,
    pending: hubs.filter(h => h.paymentStatus === 'verification_pending').length,
    revenue: hubs.filter(h => h.paymentStatus === 'approved').reduce((s, h) => s + (h.paymentAmount || 0), 0),
  }

  return (
    <div data-testid="hubs-view">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Owner Hubs</h1>
          <p className="text-sm text-slate-500 mt-1">Every couple with a 4-digit publish code · {totals.active} active</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search couples or slug…" className="pl-9 h-9 rounded-md border-slate-300 bg-white text-sm" data-testid="hubs-search" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Active hubs" value={totals.active} testId="hubs-stat-active" />
        <StatCard label="Paid" value={totals.paid} tone="green" testId="hubs-stat-paid" />
        <StatCard label="Pending payment" value={totals.pending} tone="amber" testId="hubs-stat-pending" />
        <StatCard label="Hub revenue" value={`₹${totals.revenue.toLocaleString('en-IN')}`} testId="hubs-stat-revenue" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Loading…</div>
      ) : hubs.length === 0 ? (
        <div className="border border-dashed border-slate-300 p-12 text-center rounded-md bg-white">
          <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No couples have set a publish code yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-sm" data-testid="hubs-table">
            <thead className="bg-slate-50 text-[10px] tracking-wider uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Couple</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Owner</th>
                <th className="text-left px-4 py-2.5 font-medium">Revenue</th>
                <th className="text-left px-4 py-2.5 font-medium">Activity</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {hubs.map(h => {
                const hubUrl = `${baseUrl}/hub/manage/${h.ownerToken}`
                return (
                  <tr key={h.id} className="border-t border-slate-200 hover:bg-slate-50" data-testid={`hub-row-${h.slug}`}>
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-slate-900">{h.brideName} <span className="text-slate-400">&amp;</span> {h.groomName}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">/{h.slug}</div>
                      <div className="text-[11px] text-slate-500">{h.template}{h.weddingDate && <> · {new Date(h.weddingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <Pill tone={h.publishedStatus === 'published' ? 'green' : 'amber'}>{h.publishedStatus}</Pill>
                        <Pill tone={h.paymentStatus === 'approved' ? 'green' : h.paymentStatus === 'rejected' ? 'red' : h.paymentStatus === 'verification_pending' ? 'amber' : 'slate'}>
                          pmt · {h.paymentStatus}
                        </Pill>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <Phone size={10} /> ·•·• {h.ownerWhatsappLast4 || '----'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <Lock size={10} />
                        {h.publishCodeSetAt ? 'Code set' : <span className="text-amber-700">No code</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-sm font-medium tabular-nums">₹{(h.paymentAmount || 0).toLocaleString('en-IN')}</div>
                      {Array.isArray(h.paymentAddons) && h.paymentAddons.length > 0 && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          +{h.paymentAddons.length} add-on{h.paymentAddons.length === 1 ? '' : 's'} · ₹{(h.paymentAddonsAmount || 0).toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="text-[11px] text-slate-500">{h.viewCount || 0} visits · {h.rsvpCount || 0} RSVPs</div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <div className="inline-flex gap-1">
                        <a href={hubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 rounded border border-slate-200" data-testid={`hub-open-${h.slug}`}>
                          <ExternalLink size={11} /> Open
                        </a>
                        <button onClick={() => copy(hubUrl, 'Hub link copied')} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 rounded border border-slate-200" data-testid={`hub-copy-${h.slug}`}>
                          <Copy size={11} /> Copy
                        </button>
                        <button onClick={() => resetCode(h)} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 rounded border border-amber-200" data-testid={`hub-reset-${h.slug}`}>
                          <Lock size={11} /> Reset code
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* =========================
   REVENUE VIEW
   ========================= */
function RevenueView() {
  const [items, setItems] = useState([])
  const [stats, setStats] = useState({ total: 0, last30: 0, count: 0, byPlan: { classic: 0, grand: 0, eternal: 0 }, countByPlan: { classic: 0, grand: 0, eternal: 0 } })
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [rRes, sRes] = await Promise.all([
        authFetch(`/api/revenue?plan=${filter}`),
        authFetch(`/api/revenue/stats`),
      ])
      const rData = await rRes.json()
      const sData = await sRes.json()
      setItems(rData.revenues || [])
      setStats(sData || stats)
    } catch (e) {
      toast.error('Failed to load revenue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  function exportCsv() {
    const token = localStorage.getItem('kal_token')
    fetch(`/api/revenue/export`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(b => {
        const url = URL.createObjectURL(b)
        const a = document.createElement('a')
        a.href = url; a.download = `vivoha-revenue.csv`; a.click()
        URL.revokeObjectURL(url)
      })
  }

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN')}`

  return (
    <div data-testid="revenue-view">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Revenue</h1>
          <p className="text-sm text-slate-500 mt-1">All-time payments across the platform</p>
        </div>
        <Button onClick={exportCsv} data-testid="revenue-export-btn" variant="outline" className="rounded-md border-slate-300 text-slate-700 hover:bg-slate-100 text-xs h-9 px-3">
          <Download size={13} className="mr-1.5" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <RevenueStatCard label="Total Revenue" value={fmt(stats.total)} testId="rev-stat-total" />
        <RevenueStatCard label="Last 30 days" value={fmt(stats.last30)} testId="rev-stat-30" />
        <RevenueStatCard label="Paid Weddings" value={stats.count} testId="rev-stat-count" />
        <RevenueStatCard label="Avg per wedding" value={stats.count ? fmt(Math.round(stats.total / stats.count)) : '₹0'} testId="rev-stat-avg" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {PLAN_LIST.map(p => (
          <div key={p.id} className={`border bg-white p-4 rounded-md ${p.id === 'vivoha' ? 'border-slate-300' : 'border-slate-200 opacity-75'}`} data-testid={`rev-plan-${p.id}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] tracking-wider uppercase text-slate-500">{p.name}</div>
              {p.id !== 'vivoha' && <span className="text-[9px] tracking-wider uppercase text-slate-400">Legacy</span>}
            </div>
            <div className="text-xl font-semibold tabular-nums">{fmt(stats.byPlan?.[p.id] || 0)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{stats.countByPlan?.[p.id] || 0} wedding{(stats.countByPlan?.[p.id] || 0) === 1 ? '' : 's'} · ₹{p.price.toLocaleString('en-IN')} ea.</div>
          </div>
        ))}
      </div>

      <div className="flex gap-0.5 mb-4 bg-white border border-slate-300 rounded-md p-0.5 w-fit">
        {['all', 'vivoha', 'classic', 'grand', 'elegant'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            data-testid={`revenue-filter-${s}`}
            className={`px-3 py-1.5 text-xs rounded transition capitalize ${filter === s ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-slate-300 p-12 text-center text-slate-500 text-sm bg-white rounded-md" data-testid="revenue-empty">
          No revenue logged yet for this filter.
        </div>
      ) : (
        <div className="border border-slate-200 bg-white rounded-md overflow-x-auto">
          <table className="w-full text-sm" data-testid="revenue-table">
            <thead className="bg-slate-900 text-slate-50">
              <tr>
                <th className="text-left p-3 font-normal text-[10px] tracking-widest uppercase">Date</th>
                <th className="text-left p-3 font-normal text-[10px] tracking-widest uppercase">Couple</th>
                <th className="text-left p-3 font-normal text-[10px] tracking-widest uppercase">Plan</th>
                <th className="text-right p-3 font-normal text-[10px] tracking-widest uppercase">Amount</th>
                <th className="text-left p-3 font-normal text-[10px] tracking-widest uppercase">Slug</th>
              </tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={r.id} className="border-t border-slate-300/30" data-testid={`revenue-row-${r.id}`}>
                  <td className="p-3 text-slate-900/75">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="p-3 font-medium text-slate-900">{r.coupleName}</td>
                  <td className="p-3">
                    <Badge className="rounded-none text-[10px] tracking-widest uppercase bg-slate-200 text-slate-900">{r.plan}</Badge>
                  </td>
                  <td className="p-3 text-right text-slate-900 font-medium">{fmt(r.amount)}</td>
                  <td className="p-3 text-slate-500 text-xs">/{r.weddingSlug}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function RevenueStatCard({ label, value, testId }) {
  return (
    <div className="border border-slate-200 bg-white p-4 rounded-md" data-testid={testId}>
      <div className="text-[10px] tracking-wider uppercase text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  )
}

function RsvpView({ wedding, onBack }) {
  const [rsvps, setRsvps] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    (async () => {
      const res = await authFetch(`/api/rsvp?weddingId=${wedding.id}`)
      const data = await res.json()
      setRsvps(data.rsvps || [])
      setLoading(false)
    })()
  }, [wedding.id])

  function exportCsv() {
    const token = localStorage.getItem('kal_token')
    fetch(`/api/rsvp/export?weddingId=${wedding.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(b => {
        const url = URL.createObjectURL(b)
        const a = document.createElement('a')
        a.href = url; a.download = `rsvps-${wedding.slug}.csv`; a.click()
        URL.revokeObjectURL(url)
      })
  }

  const filtered = filter === 'all' ? rsvps : rsvps.filter(r => r.attending === filter)
  const stats = {
    total: rsvps.length,
    yes: rsvps.filter(r => r.attending === 'yes').length,
    no: rsvps.filter(r => r.attending === 'no').length,
    maybe: rsvps.filter(r => r.attending === 'maybe').length,
    guests: rsvps.filter(r => r.attending === 'yes').reduce((s, r) => s + (r.guests || 1), 0),
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 text-sm">
        <ChevronLeft size={16} /> Back to weddings
      </button>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-slate-500 tracking-[0.3em] text-xs uppercase mb-2">RSVPs for</div>
          <h1 className="text-2xl font-semibold tracking-tight">{wedding.brideName} <em className="italic text-slate-500">&amp;</em> {wedding.groomName}</h1>
        </div>
        <Button onClick={exportCsv} variant="outline" className="rounded-none border-slate-900 text-slate-900 bg-transparent tracking-widest text-xs uppercase">
          <Download size={14} className="mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Attending" value={stats.yes} />
        <StatCard label="Maybe" value={stats.maybe} />
        <StatCard label="Declined" value={stats.no} />
        <StatCard label="Total Guests" value={stats.guests} />
      </div>

      <div className="flex gap-1 mb-6">
        {['all', 'yes', 'maybe', 'no'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-5 py-2 text-xs uppercase tracking-widest border ${filter === s ? 'bg-slate-900 text-slate-50 border-slate-900' : 'bg-white/40 text-slate-900 border-slate-300'}`}>{s}</button>
        ))}
      </div>

      {loading ? <div className="text-center py-16 text-slate-500">Loading…</div> : filtered.length === 0 ? (
        <div className="border border-dashed border-slate-300 p-16 text-center text-slate-900/70">No responses yet.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="border border-slate-300/50 bg-white/40 p-5">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{r.name}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                    {r.email && <span className="flex items-center gap-1"><Mail size={12} /> {r.email}</span>}
                    {r.phone && <span className="flex items-center gap-1"><Phone size={12} /> {r.phone}</span>}
                    <span>{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <Badge className={`rounded-none tracking-widest uppercase text-[10px] ${r.attending === 'yes' ? 'bg-emerald-700' : r.attending === 'no' ? 'bg-red-700' : 'bg-amber-700'} text-white`}>
                  {r.attending === 'yes' ? `Attending · ${r.guests}` : r.attending}
                </Badge>
              </div>
              {(r.mealPreferences?.length > 0) && (
                <div className="text-sm text-slate-900/70 mb-2">Meal: {r.mealPreferences.join(', ')}</div>
              )}
              {r.message && (
                <div className="flex gap-2 text-sm text-slate-900/85 mt-3 pt-3 border-t border-slate-300/30 italic">
                  <MessageCircle size={14} className="text-slate-500 flex-shrink-0 mt-1" />
                  "{r.message}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


function LeadsView() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  async function load() {
    setLoading(true)
    try {
      const res = await authFetch(`/api/leads?status=${filter}`)
      const data = await res.json()
      setLeads(data.leads || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  async function updateStatus(id, status) {
    const res = await authFetch(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify({ status }) })
    if (res.ok) { toast.success('Lead updated'); load() } else toast.error('Failed to update')
  }

  async function remove(id) {
    if (!confirm('Delete this lead?')) return
    const res = await authFetch(`/api/leads/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); load() } else toast.error('Failed')
  }

  function exportCsv() {
    const token = localStorage.getItem('kal_token')
    fetch(`/api/leads/export`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(b => {
        const url = URL.createObjectURL(b)
        const a = document.createElement('a')
        a.href = url; a.download = `vivoha-leads.csv`; a.click()
        URL.revokeObjectURL(url)
      })
  }

  const stats = {
    total: leads.length,
    newCount: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    converted: leads.filter(l => l.status === 'converted').length,
  }

  return (
    <div data-testid="leads-view">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-slate-500 tracking-[0.3em] text-xs uppercase mb-2">Inbox</div>
          <h1 className="text-2xl font-semibold tracking-tight">Couples reaching out</h1>
        </div>
        <Button onClick={exportCsv} variant="outline" className="rounded-none border-slate-900 text-slate-900 bg-transparent tracking-widest text-xs uppercase">
          <Download size={14} className="mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="New" value={stats.newCount} />
        <StatCard label="Contacted" value={stats.contacted} />
        <StatCard label="Converted" value={stats.converted} />
      </div>

      <div className="flex gap-1 mb-6 flex-wrap">
        {['all', 'new', 'contacted', 'converted', 'closed'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            data-testid={`leads-filter-${s}`}
            className={`px-5 py-2 text-xs uppercase tracking-widest border ${filter === s ? 'bg-slate-900 text-slate-50 border-slate-900' : 'bg-white/40 text-slate-900 border-slate-300'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading…</div>
      ) : leads.length === 0 ? (
        <div className="border border-dashed border-slate-300 p-16 text-center text-slate-900/70">No leads yet.</div>
      ) : (
        <div className="space-y-3">
          {leads.map(l => (
            <div key={l.id} className="border border-slate-300/50 bg-white/40 p-5" data-testid={`lead-row-${l.id}`}>
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {l.name}{l.partnerName ? <span className="text-slate-500"> &amp; {l.partnerName}</span> : null}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
                    {l.phone && (
                      <a href={`https://wa.me/${l.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[#25D366]">
                        <MessageCircle size={12} /> {l.phone}
                      </a>
                    )}
                    {l.email && <a href={`mailto:${l.email}`} className="flex items-center gap-1 hover:text-slate-900"><Mail size={12} /> {l.email}</a>}
                    {l.city && <span>{l.city}</span>}
                    {l.weddingDate && <span>· {l.weddingDate}</span>}
                    <span>· {new Date(l.createdAt).toLocaleString()}</span>
                  </div>
                  {l.budget && <div className="text-xs text-slate-900 mt-1">Plan interest: <span className="font-medium">{l.budget}</span></div>}
                  {l.templateInterest && <div className="text-xs text-slate-900">Template: <span className="font-medium">{l.templateInterest}</span></div>}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={l.status}
                    onChange={(e) => updateStatus(l.id, e.target.value)}
                    data-testid={`lead-status-${l.id}`}
                    className="text-xs border border-slate-300 bg-white/60 px-2 py-1 rounded-none"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="converted">Converted</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button onClick={() => remove(l.id)} className="p-2 text-red-700 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
              {l.message && (
                <div className="text-sm text-slate-900/85 mt-3 pt-3 border-t border-slate-300/30 italic">
                  "{l.message}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


/* =========================
   PHOTO WALL — list + moderation
   ========================= */
function PhotoWallView({ onOpen }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/photo-wall/stats')
      if (res.ok) {
        const d = await res.json()
        setItems(d.weddings || [])
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 12000) // gentle refresh for pending counts
    return () => clearInterval(t)
  }, [load])

  return (
    <div data-testid="photowall-view">
      <div className="mb-10">
        <div className="text-slate-500 tracking-[0.3em] text-xs uppercase mb-3">Photo Wall · Moderation</div>
        <h1 className="text-2xl font-semibold tracking-tight">Guest submissions</h1>
        <p className="text-slate-900/70 mt-3 max-w-2xl">
          Weddings with the Live Photo Wall enabled appear here. Click a wedding to review pending photos and approve them for the public gallery.
        </p>
      </div>
      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-slate-300 p-12 text-center text-slate-500">
          <Camera size={28} className="mx-auto mb-3 opacity-60" />
          <div className="text-base font-medium text-slate-900">No active photo walls yet</div>
          <div className="text-sm mt-1">Enable "Live Photo Wall" on any wedding's Advanced tab to start collecting guest photos.</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="photowall-list">
          {items.map(w => (
            <button
              key={w.weddingId}
              onClick={() => onOpen(w.weddingId)}
              data-testid={`photowall-card-${w.slug}`}
              className="text-left bg-white/60 border border-slate-300 p-5 hover:border-slate-900 transition group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900 group-hover:text-slate-500">
                    {w.brideName} & {w.groomName}
                  </div>
                  <div className="text-xs text-slate-500 tracking-wider uppercase mt-1">{w.template}</div>
                </div>
                {w.counts.pending > 0 && (
                  <span className="bg-amber-500 text-white text-xs font-medium tracking-wider uppercase px-2 py-1" data-testid={`photowall-pending-${w.slug}`}>
                    {w.counts.pending} pending
                  </span>
                )}
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-amber-700">Pending: <strong>{w.counts.pending}</strong></span>
                <span className="text-emerald-700">Approved: <strong>{w.counts.approved}</strong></span>
                <span className="text-slate-900/50">Rejected: <strong>{w.counts.rejected}</strong></span>
              </div>
              <div className="mt-3 text-xs text-slate-900/55">/{w.slug}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PhotoWallModeration({ weddingId, onBack, onChanged }) {
  const [photos, setPhotos] = useState([])
  const [tab, setTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [wedding, setWedding] = useState(null)
  const [showAdminAdd, setShowAdminAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, wRes] = await Promise.all([
        authFetch(`/api/photo-wall?weddingId=${weddingId}&status=${tab}`),
        authFetch(`/api/weddings/${weddingId}`),
      ])
      if (pRes.ok) {
        const d = await pRes.json()
        setPhotos(d.photos || [])
      }
      if (wRes.ok) {
        const d = await wRes.json()
        setWedding(d.wedding)
      }
    } finally { setLoading(false) }
  }, [weddingId, tab])

  useEffect(() => { load() }, [load])

  async function moderate(id, status) {
    const res = await authFetch(`/api/photo-wall/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast.success(status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Updated')
      setPhotos(p => p.filter(x => x.id !== id))
      onChanged?.()
    } else { toast.error('Failed to update') }
  }

  async function remove(id) {
    if (!confirm('Permanently delete this photo?')) return
    const res = await authFetch(`/api/photo-wall/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Photo deleted')
      setPhotos(p => p.filter(x => x.id !== id))
      onChanged?.()
    } else { toast.error('Failed to delete') }
  }

  function downloadZip() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('kal_token') : ''
    if (!token) { toast.error('Session expired'); return }
    const url = `/api/photo-wall/zip/${weddingId}?token=${encodeURIComponent(token)}`
    window.open(url, '_blank')
  }

  const tabs = [
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ]

  return (
    <div data-testid="photowall-moderation">
      <button onClick={onBack} className="text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 text-sm mb-6" data-testid="photowall-back-btn">
        <ArrowLeft size={14} /> Back to photo walls
      </button>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <div className="text-slate-500 tracking-[0.3em] text-xs uppercase mb-3">Moderating {wedding?.isDemo && <span className="ml-2 bg-slate-200 text-slate-900 px-2 py-0.5">DEMO</span>}</div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {wedding ? `${wedding.brideName} & ${wedding.groomName}` : 'Wedding'}
          </h1>
          {wedding && (
            <a href={`/wedding/${wedding.slug}`} target="_blank" rel="noreferrer" className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 mt-2">
              <ExternalLink size={12} /> Open public page
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {wedding?.isDemo && (
            <Button
              onClick={() => setShowAdminAdd(true)}
              data-testid="photowall-admin-add-btn"
              className="rounded-none bg-slate-900 hover:bg-slate-800 text-slate-50 px-5 py-2.5 text-xs tracking-widest uppercase"
            >
              <Plus size={12} className="mr-1.5" /> Add demo photo
            </Button>
          )}
          <Button
            onClick={downloadZip}
            data-testid="photowall-zip-btn"
            variant="outline"
            className="rounded-none border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-slate-50 px-5 py-2.5 text-xs tracking-widest uppercase"
          >
            <Archive size={12} className="mr-1.5" /> Download ZIP
          </Button>
          <div className="flex border border-slate-300">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                data-testid={`photowall-tab-${t.id}`}
                className={`px-5 py-2.5 text-xs tracking-widest uppercase transition ${tab === t.id ? 'bg-slate-900 text-slate-50' : 'text-slate-900 hover:bg-slate-100'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : photos.length === 0 ? (
        <div className="border border-dashed border-slate-300 p-12 text-center text-slate-500" data-testid="photowall-empty">
          <ImageIcon size={28} className="mx-auto mb-3 opacity-60" />
          <div>No photos in this tab.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="photowall-photos">
          {photos.map(p => (
            <div key={p.id} className="bg-white/60 border border-slate-300 overflow-hidden" data-testid={`photowall-photo-${p.id}`}>
              <div className="aspect-square bg-slate-200">
                <img src={p.image.url} alt={p.caption || ''} className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                <div className="text-xs tracking-widest uppercase text-slate-500 flex items-center gap-2">
                  {p.uploaderName} {p.addedByAdmin && <span className="bg-slate-200 text-slate-900 px-1.5 py-0.5 text-[9px]">ADMIN</span>}
                </div>
                {p.caption && <div className="text-sm text-slate-900 mt-1 line-clamp-2">{p.caption}</div>}
                <div className="text-[10px] text-slate-900/50 mt-2">{new Date(p.createdAt).toLocaleString()}</div>
                <div className="flex gap-2 mt-4">
                  {tab !== 'approved' && (
                    <button onClick={() => moderate(p.id, 'approved')} data-testid={`photowall-approve-${p.id}`} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs tracking-widest uppercase px-3 py-2.5">
                      <Check size={12} /> Approve
                    </button>
                  )}
                  {tab !== 'rejected' && (
                    <button onClick={() => moderate(p.id, 'rejected')} data-testid={`photowall-reject-${p.id}`} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-900/15 hover:bg-slate-900/25 text-slate-900 text-xs tracking-widest uppercase px-3 py-2.5">
                      <X size={12} /> Reject
                    </button>
                  )}
                  <button onClick={() => remove(p.id)} data-testid={`photowall-delete-${p.id}`} className="inline-flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2.5" aria-label="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdminAdd && wedding && (
        <AdminAddPhotoModal
          wedding={wedding}
          onClose={() => setShowAdminAdd(false)}
          onAdded={() => { setShowAdminAdd(false); setTab('approved'); load(); onChanged?.() }}
        />
      )}
    </div>
  )
}

function AdminAddPhotoModal({ wedding, onClose, onAdded }) {
  const [name, setName] = useState('')
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)

  function onPick(e) {
    const f = e.target.files?.[0]; if (!f) return
    if (f.size > 8 * 1024 * 1024) { toast.error('Image must be under 8MB'); return }
    setFile(f); setPreview(URL.createObjectURL(f))
  }

  async function submit() {
    if (!name.trim() || !file) { toast.error('Name and photo required'); return }
    setBusy(true)
    try {
      const dataUri = await fileToDataUri(file)
      const res = await authFetch('/api/photo-wall/admin-add', {
        method: 'POST',
        body: JSON.stringify({ weddingId: wedding.id, dataUri, uploaderName: name.trim(), caption: caption.trim() }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      toast.success('Demo photo added')
      onAdded?.()
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} data-testid="admin-add-photo-modal">
      <div className="bg-slate-50 w-full max-w-lg relative max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-900/60 hover:text-slate-900"><X size={20} /></button>
        <div className="p-8">
          <div className="text-slate-500 tracking-[0.3em] text-xs uppercase mb-2">Add Demo Photo</div>
          <h3 className="font-semibold text-slate-900 mb-6">{wedding.brideName} & {wedding.groomName}</h3>
          <p className="text-xs text-slate-500 mb-5">Admin uploads are auto-approved and appear immediately on the preview page.</p>

          <div className="space-y-4">
            <div>
              <Label className="text-xs tracking-widest uppercase text-slate-500">Uploader name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Priya Kapoor" data-testid="admin-add-name-input" className="rounded-none border-slate-300 bg-white/40 py-5 mt-1.5" />
            </div>
            <div>
              <Label className="text-xs tracking-widest uppercase text-slate-500">Caption (optional)</Label>
              <Textarea value={caption} onChange={e => setCaption(e.target.value)} rows={2} data-testid="admin-add-caption-input" className="rounded-none border-slate-300 bg-white/40 mt-1.5" />
            </div>
            <div>
              <Label className="text-xs tracking-widest uppercase text-slate-500">Photo</Label>
              {preview ? (
                <div className="relative mt-1.5">
                  <img src={preview} alt="" className="w-full max-h-72 object-cover" />
                  <button onClick={() => { setFile(null); setPreview(null) }} className="absolute top-2 right-2 bg-slate-50/90 text-slate-900 px-3 py-1 text-xs tracking-widest uppercase">Change</button>
                </div>
              ) : (
                <label htmlFor="adm-pw-file" className="mt-1.5 border border-dashed border-slate-300 flex flex-col items-center justify-center py-10 cursor-pointer hover:bg-slate-100 transition">
                  <Upload size={22} className="text-slate-500 mb-2" />
                  <div className="text-sm text-slate-900">Choose photo</div>
                  <input id="adm-pw-file" type="file" accept="image/*" className="hidden" onChange={onPick} data-testid="admin-add-file-input" />
                </label>
              )}
            </div>
          </div>
          <Button onClick={submit} disabled={busy || !file || !name.trim()} data-testid="admin-add-submit-btn" className="w-full mt-6 bg-slate-900 hover:bg-slate-800 text-slate-50 rounded-none py-5 tracking-widest text-xs uppercase">
            {busy ? 'Adding…' : 'Add to preview'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* =========================
   FORMS — admin views
   ========================= */
function FormsView({ onOpen, onChanged }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [clientName, setClientName] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch('/api/forms')
      if (res.ok) {
        const d = await res.json()
        setItems(d.forms || [])
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function createForm() {
    if (!clientName.trim()) { toast.error('Enter a client name'); return }
    setCreating(true)
    try {
      const res = await authFetch('/api/forms', { method: 'POST', body: JSON.stringify({ clientName: clientName.trim() }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      toast.success('Form link created — short URL ready to share')
      setClientName('')
      load()
      onChanged?.()
    } catch (e) { toast.error(e.message) }
    finally { setCreating(false) }
  }

  async function remove(id) {
    if (!confirm('Delete this form?')) return
    const res = await authFetch(`/api/forms/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Deleted'); load(); onChanged?.() }
  }

  function copyLink(token) {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${base}/form/${token}`
    navigator.clipboard.writeText(url)
    toast.success('Form link copied')
  }
  function copyShort(shortlinkId) {
    if (!shortlinkId) return
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${base}/s/${shortlinkId}`
    navigator.clipboard.writeText(url)
    toast.success('Short URL copied')
  }

  const statusBadge = {
    pending: { label: 'Pending', cls: 'bg-slate-200 text-slate-900' },
    submitted: { label: 'Submitted', cls: 'bg-amber-500 text-white' },
    converted: { label: 'Converted', cls: 'bg-emerald-700 text-white' },
    expired: { label: 'Expired', cls: 'bg-slate-900/30 text-slate-900' },
  }

  return (
    <div data-testid="forms-view">
      <div className="mb-10">
        <div className="text-slate-500 tracking-[0.3em] text-xs uppercase mb-3">Client Forms · One-time intake</div>
        <h1 className="text-2xl font-semibold tracking-tight">Forms</h1>
        <p className="text-slate-900/70 mt-3 max-w-2xl">
          Create a one-time form link to send to a client. They fill in all their wedding details and upload photos — you then convert their submission into a published wedding page in one click.
        </p>
      </div>

      <div className="border border-slate-300 bg-white/40 p-6 mb-8 max-w-2xl">
        <div className="text-xs tracking-widest uppercase text-slate-500 mb-3">New form</div>
        <div className="flex gap-3 flex-wrap">
          <Input
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            placeholder="Client name (e.g. Aanya & Vikram)"
            data-testid="forms-client-name-input"
            className="rounded-none border-slate-300 bg-white/60 py-5 flex-1 min-w-[200px]"
          />
          <Button
            onClick={createForm}
            disabled={creating}
            data-testid="forms-create-btn"
            className="bg-slate-900 hover:bg-slate-800 text-slate-50 rounded-none px-8 py-5 tracking-widest text-xs uppercase"
          >
            <Plus size={14} className="mr-1.5" /> Create form
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-slate-300 p-12 text-center text-slate-500">
          <FileText size={28} className="mx-auto mb-3 opacity-60" />
          <div>No forms yet — create one above.</div>
        </div>
      ) : (
        <div className="space-y-3" data-testid="forms-list">
          {items.map(f => {
            const sb = statusBadge[f.status] || statusBadge.pending
            const base = typeof window !== 'undefined' ? window.location.origin : ''
            const link = `${base}/form/${f.token}`
            const shortUrl = f.shortlinkId ? `${base}/s/${f.shortlinkId}` : null
            return (
              <div key={f.id} data-testid={`form-row-${f.id}`} className="bg-white/60 border border-slate-300 p-5 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-semibold text-slate-900">{f.clientName}</div>
                    <span className={`text-[10px] tracking-widest uppercase px-2 py-1 ${sb.cls}`}>{sb.label}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Created {new Date(f.createdAt).toLocaleString()}</div>
                  <div className="mt-2 text-xs text-slate-900/70 space-y-0.5">
                    <div className="break-all"><span className="text-slate-500">Long: </span>{link}</div>
                    {shortUrl && <div className="break-all" data-testid={`form-short-${f.id}`}><span className="text-slate-500">Short: </span>{shortUrl}</div>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => copyLink(f.token)} data-testid={`form-copy-${f.id}`} className="p-2 text-slate-500 hover:bg-slate-100" title="Copy long URL"><Copy size={14} /></button>
                  {shortUrl && <button onClick={() => copyShort(f.shortlinkId)} data-testid={`form-copy-short-${f.id}`} className="p-2 text-slate-500 hover:bg-slate-100" title="Copy short URL"><Link2 size={14} /></button>}
                  <a href={link} target="_blank" rel="noreferrer" className="p-2 text-slate-500 hover:bg-slate-100" title="Open"><ExternalLink size={14} /></a>
                  {f.status !== 'pending' && (
                    <button onClick={() => onOpen(f.id)} data-testid={`form-open-${f.id}`} className="p-2 text-slate-500 hover:bg-slate-100" title="View"><Eye size={14} /></button>
                  )}
                  <button onClick={() => remove(f.id)} className="p-2 text-red-700 hover:bg-red-50" title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FormDetail({ formId, onBack, onConverted }) {
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const res = await authFetch(`/api/forms/${formId}`)
      if (res.ok) {
        const d = await res.json(); setForm(d.form)
      }
      setLoading(false)
    })()
  }, [formId])

  async function convert() {
    if (!confirm('Convert this submission into a wedding page? It will be created as a Draft so you can polish before publishing.')) return
    setConverting(true)
    try {
      const res = await authFetch(`/api/forms/${formId}/convert`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      toast.success('Wedding created — opening for review')
      onConverted?.(d.wedding.id)
    } catch (e) { toast.error(e.message) }
    finally { setConverting(false) }
  }

  if (loading) return <div className="text-slate-500">Loading…</div>
  if (!form) return <div>Form not found</div>
  const s = form.submission || {}

  return (
    <div data-testid="form-detail">
      <button onClick={onBack} className="text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 text-sm mb-6" data-testid="form-back-btn">
        <ArrowLeft size={14} /> Back to forms
      </button>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <div className="text-slate-500 tracking-[0.3em] text-xs uppercase mb-3">Submission · {form.clientName}</div>
          <h1 className="text-2xl font-semibold tracking-tight">{s.brideName} & {s.groomName}</h1>
          {form.submittedAt && <div className="text-xs text-slate-500 mt-2">Submitted {new Date(form.submittedAt).toLocaleString()}</div>}
        </div>
        {form.status === 'submitted' && (
          <Button onClick={convert} disabled={converting} data-testid="form-convert-btn"
            className="bg-slate-900 hover:bg-slate-800 text-slate-50 rounded-none px-8 py-6 tracking-widest text-xs uppercase">
            {converting ? 'Creating…' : <><Sparkles size={14} className="mr-2" /> Convert to wedding</>}
          </Button>
        )}
        {form.status === 'converted' && form.weddingId && (
          <Button onClick={() => onConverted?.(form.weddingId)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-none px-8 py-6 tracking-widest text-xs uppercase">
            <Edit3 size={14} className="mr-2" /> Open wedding
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {s.heroImage?.url && (
            <div>
              <div className="text-xs tracking-widest uppercase text-slate-500 mb-2">Hero photo</div>
              <img src={s.heroImage.url} alt="" className="w-full max-h-80 object-cover border border-slate-300" />
            </div>
          )}
          {Array.isArray(s.gallery) && s.gallery.length > 0 && (
            <div>
              <div className="text-xs tracking-widest uppercase text-slate-500 mb-2">Gallery ({s.gallery.length})</div>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {s.gallery.map((g, i) => <img key={i} src={g.url} alt="" className="w-full aspect-square object-cover border border-slate-300" />)}
              </div>
            </div>
          )}
          {s.story && (
            <div>
              <div className="text-xs tracking-widest uppercase text-slate-500 mb-2">Story</div>
              <p className="text-slate-900/85 whitespace-pre-wrap">{s.story}</p>
            </div>
          )}
          {Array.isArray(s.events) && s.events.length > 0 && (
            <div>
              <div className="text-xs tracking-widest uppercase text-slate-500 mb-2">Events ({s.events.length})</div>
              <div className="space-y-2">
                {s.events.map((ev, i) => (
                  <div key={i} className="bg-white/60 border border-slate-300 p-3">
                    <div className="text-base font-medium text-slate-900">{ev.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {[ev.date, ev.startTime, ev.endTime].filter(Boolean).join(' · ')} {ev.venue && `at ${ev.venue}`}
                    </div>
                    {ev.description && <div className="text-sm text-slate-900/75 mt-2">{ev.description}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-5">
          <div className="bg-white/60 border border-slate-300 p-4">
            <div className="text-xs tracking-widest uppercase text-slate-500 mb-2">Couple</div>
            <div className="text-slate-900">{s.brideName} &amp; {s.groomName}</div>
            {s.tagline && <div className="text-xs italic text-slate-900/70 mt-1">"{s.tagline}"</div>}
          </div>
          <div className="bg-white/60 border border-slate-300 p-4">
            <div className="text-xs tracking-widest uppercase text-slate-500 mb-2">Wedding date</div>
            <div className="text-slate-900">{s.weddingDate ? new Date(s.weddingDate).toLocaleString() : '—'}</div>
          </div>
          <div className="bg-white/60 border border-slate-300 p-4">
            <div className="text-xs tracking-widest uppercase text-slate-500 mb-2">Template</div>
            <div className="text-slate-900">{s.template}</div>
          </div>
          {(s.contactPhone || s.contactEmail) && (
            <div className="bg-white/60 border border-slate-300 p-4">
              <div className="text-xs tracking-widest uppercase text-slate-500 mb-2">Contact</div>
              {s.contactPhone && <div className="text-sm">{s.contactPhone}</div>}
              {s.contactEmail && <div className="text-sm">{s.contactEmail}</div>}
            </div>
          )}
          {s.notes && (
            <div className="bg-white/60 border border-slate-300 p-4">
              <div className="text-xs tracking-widest uppercase text-slate-500 mb-2">Notes</div>
              <div className="text-sm text-slate-900/85 whitespace-pre-wrap">{s.notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


/* =========================
   CLIENT ACCESS MODAL — admin sets password for couple dashboard
   ========================= */
function ClientAccessModal({ wedding, onClose }) {
  const [state, setState] = useState({ enabled: false, createdAt: null, dashboardToken: null })
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const dashboardUrl = typeof window !== 'undefined' && state.dashboardToken
    ? `${window.location.origin}/c/${state.dashboardToken}`
    : ''

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const res = await authFetch(`/api/weddings/${wedding.id}/client-access`)
        if (res.ok) { const d = await res.json(); setState({ enabled: d.enabled, createdAt: d.createdAt, dashboardToken: d.dashboardToken }) }
      } finally { setLoading(false) }
    })()
  }, [wedding.id])

  async function save() {
    if (password.length < 6) { toast.error('Use at least 6 characters'); return }
    setSaving(true)
    try {
      const res = await authFetch(`/api/weddings/${wedding.id}/client-access`, {
        method: 'POST', body: JSON.stringify({ password }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      toast.success(state.enabled ? 'Password updated' : 'Client access enabled')
      setState(s => ({ ...s, enabled: true, createdAt: s.createdAt || new Date().toISOString(), dashboardToken: d.dashboardToken || s.dashboardToken }))
      setPassword('')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function disable() {
    if (!confirm('Revoke the couple\'s dashboard access?')) return
    const res = await authFetch(`/api/weddings/${wedding.id}/client-access`, { method: 'DELETE' })
    if (res.ok) { toast.success('Client access removed'); setState({ enabled: false, createdAt: null, dashboardToken: null }) }
  }

  async function rotate() {
    if (!confirm('Generate a new dashboard URL? The old link will stop working immediately.')) return
    const res = await authFetch(`/api/weddings/${wedding.id}/client-access/rotate`, { method: 'POST' })
    const d = await res.json()
    if (res.ok) { toast.success('New URL generated'); setState(s => ({ ...s, dashboardToken: d.dashboardToken })) }
    else toast.error(d.error || 'Failed to rotate')
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} data-testid="client-access-modal">
      <div className="bg-slate-50 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-8">
          <div className="text-slate-500 tracking-[0.3em] text-xs uppercase mb-2 flex items-center gap-2"><ShieldCheck size={14} /> Couple Dashboard</div>
          <h3 className="font-semibold text-slate-900">{wedding.brideName} &amp; {wedding.groomName}</h3>
          <p className="text-sm text-slate-500 mt-2">Set a password so the couple can sign in and see RSVPs, page views, and download their photo wall.</p>

          {loading ? <div className="mt-6 text-slate-500">Loading…</div> : (
            <>
              <div className="mt-6 border border-slate-300 bg-slate-100/50 p-4 text-sm">
                <div className="text-xs tracking-widest uppercase text-slate-500 mb-1">Dashboard URL</div>
                {state.dashboardToken ? (
                  <div className="flex items-center gap-2">
                    <code className="text-slate-900 truncate flex-1 text-[11px]">{dashboardUrl}</code>
                    <button onClick={() => { navigator.clipboard.writeText(dashboardUrl); toast.success('Link copied') }} data-testid="client-access-copy-url" className="p-1.5 hover:bg-slate-100" title="Copy"><Copy size={14} /></button>
                    <button onClick={rotate} data-testid="client-access-rotate-btn" className="p-1.5 hover:bg-slate-100 text-[10px] uppercase tracking-widest" title="Generate a new URL">Rotate</button>
                  </div>
                ) : (
                  <div className="text-slate-900/65 italic">Set a password below to generate a private dashboard URL.</div>
                )}
                <div className="text-xs text-slate-900/65 mt-3">
                  {state.enabled
                    ? <>Access is <strong className="text-emerald-700">ENABLED</strong>{state.createdAt && ` · set ${new Date(state.createdAt).toLocaleDateString()}`}. This URL is unguessable — share only with the couple.</>
                    : <>Access is <strong className="text-amber-700">NOT SET</strong>. Create a password to give the couple their dashboard.</>}
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Label className="text-xs tracking-widest uppercase text-slate-500">{state.enabled ? 'Change password' : 'Set password'}</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  data-testid="client-access-password-input"
                  className="rounded-none border-slate-300 bg-white/40 py-5"
                />
              </div>

              <div className="flex flex-wrap gap-2 mt-6">
                <Button onClick={save} disabled={saving || password.length < 6} data-testid="client-access-save-btn"
                  className="bg-slate-900 hover:bg-slate-800 text-slate-50 rounded-none px-6 py-5 tracking-widest text-xs uppercase">
                  {saving ? 'Saving…' : state.enabled ? 'Update password' : 'Enable & save'}
                </Button>
                {state.enabled && (
                  <Button onClick={disable} variant="outline" data-testid="client-access-disable-btn"
                    className="rounded-none border-red-300 text-red-700 hover:bg-red-50 px-6 py-5 tracking-widest text-xs uppercase">
                    Revoke access
                  </Button>
                )}
                <Button onClick={onClose} variant="ghost" className="rounded-none text-slate-500">Close</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


/* =========================
   INVITE PASSWORD MODAL — admin sets/updates per-wedding invite password
   ========================= */
function InvitePasswordAdminModal({ wedding, onClose }) {
  const [state, setState] = useState({ enabled: false, prompt: '' })
  const [password, setPassword] = useState('')
  const [prompt, setPrompt] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const res = await authFetch(`/api/weddings/${wedding.id}/invite-password`)
        if (res.ok) {
          const d = await res.json()
          setState({ enabled: d.enabled, prompt: d.prompt })
          setPrompt(d.prompt || '')
        }
      } finally { setLoading(false) }
    })()
  }, [wedding.id])

  async function save() {
    if (password.length < 4) { toast.error('Password must be at least 4 characters'); return }
    setSaving(true)
    try {
      const res = await authFetch(`/api/weddings/${wedding.id}/invite-password`, {
        method: 'POST', body: JSON.stringify({ password, prompt }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      toast.success(state.enabled ? 'Invite password updated' : 'Invite is now password-protected')
      setState({ enabled: true, prompt })
      setPassword('')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  async function disable() {
    if (!confirm('Remove password protection from this invite?')) return
    const res = await authFetch(`/api/weddings/${wedding.id}/invite-password`, { method: 'DELETE' })
    if (res.ok) { toast.success('Password removed — invite is now public'); setState({ enabled: false, prompt: '' }) }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} data-testid="invite-password-modal">
      <div className="bg-slate-50 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-8">
          <div className="text-slate-500 tracking-[0.3em] text-xs uppercase mb-2 flex items-center gap-2"><Lock size={14} /> Private Invitation</div>
          <h3 className="font-semibold text-slate-900">{wedding.brideName} &amp; {wedding.groomName}</h3>
          <p className="text-sm text-slate-500 mt-2">Optional. When set, guests must enter this password to view the invite page.</p>

          {loading ? <div className="mt-6 text-slate-500">Loading…</div> : (
            <>
              <div className="mt-6 border border-slate-300 bg-slate-100/50 p-4 text-sm">
                <div className="text-xs tracking-widest uppercase text-slate-500 mb-1">Status</div>
                <div className="text-slate-900">
                  {state.enabled
                    ? <>The invite is <strong className="text-emerald-700">PASSWORD PROTECTED</strong></>
                    : <>The invite is <strong className="text-amber-700">PUBLIC</strong></>}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <Label className="text-xs tracking-widest uppercase text-slate-500">{state.enabled ? 'Change password' : 'Set password'}</Label>
                  <Input
                    type="text"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 4 characters"
                    data-testid="invite-password-input"
                    className="rounded-none border-slate-300 bg-white/40 py-5 mt-1.5"
                  />
                  <div className="text-[10px] text-slate-900/55 mt-1.5">Tip: simple memorable phrases work well — guests will type this once.</div>
                </div>
                <div>
                  <Label className="text-xs tracking-widest uppercase text-slate-500">Welcome line</Label>
                  <Input
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    maxLength={200}
                    placeholder="A private celebration. Enter the password we shared."
                    data-testid="invite-prompt-input"
                    className="rounded-none border-slate-300 bg-white/40 py-5 mt-1.5"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-6">
                <Button onClick={save} disabled={saving || password.length < 4} data-testid="invite-password-save-btn"
                  className="bg-slate-900 hover:bg-slate-800 text-slate-50 rounded-none px-6 py-5 tracking-widest text-xs uppercase">
                  {saving ? 'Saving…' : state.enabled ? 'Update password' : 'Enable & save'}
                </Button>
                {state.enabled && (
                  <Button onClick={disable} variant="outline" data-testid="invite-password-disable-btn"
                    className="rounded-none border-red-300 text-red-700 hover:bg-red-50 px-6 py-5 tracking-widest text-xs uppercase">
                    Make public
                  </Button>
                )}
                <Button onClick={onClose} variant="ghost" className="rounded-none text-slate-500">Close</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


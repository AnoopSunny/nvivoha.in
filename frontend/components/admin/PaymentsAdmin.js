'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  Loader2, Check, X, ExternalLink, Image as ImageIcon, Save, Upload, AlertCircle,
  IndianRupee, Clock, MessageCircle, Pencil, Send, History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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

// =========================================================================
// PAYMENTS VIEW — list weddings awaiting payment verification
// =========================================================================
export function PaymentsView() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('verification_pending')
  const [selected, setSelected] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await authFetch(`/api/admin/payments?status=${status}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setItems(data.weddings || [])
    } catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [status])

  async function approve(w) {
    if (!confirm(`Approve payment of ₹${(w.paymentAmount || 0).toLocaleString('en-IN')} for ${w.brideName} & ${w.groomName}?\nThis will publish the website.`)) return
    try {
      const res = await authFetch(`/api/admin/payments/${w.id}/approve`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Payment approved · Website is now live')
      setSelected(null)
      load()
    } catch (e) { toast.error(e.message) }
  }

  async function reject(w) {
    const reason = prompt('Reason for rejection (shared with customer in their status page):', '')
    if (reason === null) return
    try {
      const res = await authFetch(`/api/admin/payments/${w.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Payment rejected — customer can retry from their status page')
      setSelected(null)
      load()
    } catch (e) { toast.error(e.message) }
  }

  async function requestChanges(w) {
    const message = prompt('What changes does the customer need to make?\n(They will see this on their status page + by email)', '')
    if (!message || !message.trim()) return
    try {
      const res = await authFetch(`/api/admin/payments/${w.id}/request-changes`, {
        method: 'POST',
        body: JSON.stringify({ message: message.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Changes requested — customer notified')
      load()
    } catch (e) { toast.error(e.message) }
  }

  async function sendNote(w) {
    const message = prompt('Send a note to the customer:\n(Shown on their status page)', '')
    if (!message || !message.trim()) return
    try {
      const res = await authFetch(`/api/admin/payments/${w.id}/note`, {
        method: 'POST',
        body: JSON.stringify({ message: message.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Note sent')
      load()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div data-testid="admin-payments-view">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-slate-500 mt-1">Verify customer screenshots and publish their websites.</p>
        </div>
        <div className="flex items-center gap-0.5 bg-white border border-slate-300 rounded-md p-0.5">
          {['verification_pending', 'approved', 'rejected', 'changes_requested', 'all'].map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              data-testid={`pay-filter-${s}`}
              className={`text-xs px-3 py-1.5 rounded transition capitalize ${status === s ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {s === 'verification_pending' ? 'Pending' : s === 'all' ? 'All' : s === 'changes_requested' ? 'Changes' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500"><Loader2 className="animate-spin mx-auto" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-slate-500 italic" data-testid="pay-empty">No payments in this status.</div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {items.map(w => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="border border-slate-300 bg-white/40 p-5 flex gap-4"
              data-testid={`pay-card-${w.id}`}
            >
              {w.paymentScreenshot?.url ? (
                <button
                  onClick={() => setSelected(w)}
                  className="w-32 h-32 flex-shrink-0 overflow-hidden border border-slate-300/60 bg-slate-50"
                  data-testid={`pay-thumb-${w.id}`}
                >
                  <img src={w.paymentScreenshot.url} alt="screenshot" className="w-full h-full object-cover hover:scale-105 transition" />
                </button>
              ) : (
                <div className="w-32 h-32 flex-shrink-0 border border-dashed border-slate-300 flex items-center justify-center text-slate-500">
                  <ImageIcon size={20} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-base font-medium text-slate-900 truncate">{w.brideName} & {w.groomName}</div>
                <div className="text-xs text-slate-500 mt-0.5">{w.template} · /{w.slug}</div>
                <div className="text-slate-900 mt-2 flex items-center gap-1.5 text-sm">
                  <IndianRupee size={13} /> <span className="font-medium">{(w.paymentAmount || 0).toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-slate-500 tracking-widest uppercase ml-1">· {w.plan}</span>
                </div>
                {Array.isArray(w.paymentAddons) && w.paymentAddons.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1" data-testid={`pay-addons-${w.id}`}>
                    {w.paymentAddons.map(id => (
                      <span key={id} className="text-[9px] tracking-widest uppercase bg-slate-900 text-slate-400 px-1.5 py-0.5">
                        + {id}
                      </span>
                    ))}
                    {w.paymentAddonsAmount > 0 && (
                      <span className="text-[9px] tracking-widest uppercase text-slate-500 ml-1">
                        +₹{w.paymentAddonsAmount.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                )}
                {w.paymentTxnRef && <div className="text-[11px] text-slate-900/60 mt-1 font-mono">TXN: {w.paymentTxnRef}</div>}
                <div className="text-[10px] text-slate-500 mt-2 tracking-widest uppercase flex items-center gap-1.5">
                  <Clock size={10} /> {w.paymentSubmittedAt ? new Date(w.paymentSubmittedAt).toLocaleString() : '—'}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`/preview/${w.slug}?onboardToken=${w.onboardToken || ''}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase border border-slate-300 text-slate-900 px-3 py-1.5 hover:bg-slate-100"
                    data-testid={`pay-view-${w.id}`}
                  >
                    <ExternalLink size={11} /> Preview
                  </a>
                  {w.statusToken && (
                    <a
                      href={`/status/${w.statusToken}`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase border border-slate-300 text-slate-900 px-3 py-1.5 hover:bg-slate-100"
                      data-testid={`pay-status-${w.id}`}
                    >
                      <History size={11} /> Status
                    </a>
                  )}
                  {status === 'verification_pending' && (
                    <>
                      <button
                        onClick={() => approve(w)}
                        data-testid={`pay-approve-${w.id}`}
                        className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase bg-[#0F5132] text-white px-3 py-1.5 hover:bg-[#0a3a23]"
                      >
                        <Check size={11} /> Approve & Publish
                      </button>
                      <button
                        onClick={() => reject(w)}
                        data-testid={`pay-reject-${w.id}`}
                        className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase bg-transparent border border-red-700 text-red-700 px-3 py-1.5 hover:bg-red-700 hover:text-white"
                      >
                        <X size={11} /> Reject
                      </button>
                      <button
                        onClick={() => requestChanges(w)}
                        data-testid={`pay-request-${w.id}`}
                        className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase bg-transparent border border-slate-900 text-slate-900 px-3 py-1.5 hover:bg-slate-900 hover:text-slate-50"
                      >
                        <Pencil size={11} /> Request changes
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => sendNote(w)}
                    data-testid={`pay-note-${w.id}`}
                    className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase border border-slate-300 text-slate-500 px-3 py-1.5 hover:bg-slate-100"
                  >
                    <Send size={11} /> Send note
                  </button>
                </div>
                {(w.paymentAttempts?.length > 1) && (
                  <div className="text-[10px] text-slate-500 mt-2 tracking-widest uppercase italic" data-testid={`pay-attempts-${w.id}`}>
                    {w.paymentAttempts.length} payment attempts in history
                  </div>
                )}
                {w.onboardEmail && (
                  <div className="text-[11px] text-slate-900/55 mt-2 truncate">📧 {w.onboardEmail}</div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Screenshot modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-6"
          onClick={() => setSelected(null)}
          data-testid="pay-modal"
        >
          <div onClick={(e) => e.stopPropagation()} className="bg-white max-w-4xl max-h-[90vh] overflow-auto">
            <img src={selected.paymentScreenshot?.url} alt="" className="block max-w-full max-h-[80vh]" />
            <div className="p-4 border-t border-slate-300 flex justify-between items-center gap-4">
              <div className="text-sm text-slate-900">{selected.brideName} & {selected.groomName} · ₹{(selected.paymentAmount || 0).toLocaleString('en-IN')}</div>
              <button onClick={() => setSelected(null)} className="text-xs tracking-widest uppercase text-slate-900">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// PAYMENT SETTINGS VIEW — admin uploads per-plan QR + UPI + WhatsApp
// =========================================================================
export function PaymentSettingsView() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    whatsappNumber: '',
    whatsappGreeting: '',
    plans: {
      vivoha: { upiId: '', qrUrl: '', qrPublicId: '', notes: '' },
      classic: { upiId: '', qrUrl: '', qrPublicId: '', notes: '' },
      grand: { upiId: '', qrUrl: '', qrPublicId: '', notes: '' },
      elegant: { upiId: '', qrUrl: '', qrPublicId: '', notes: '' },
    },
  })

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch('/api/admin/payment-config')
        const data = await res.json()
        if (data.config) {
          setForm(prev => ({
            ...prev,
            ...data.config,
            plans: {
              vivoha: { ...prev.plans.vivoha, ...(data.config.plans?.vivoha || {}) },
              classic: { ...prev.plans.classic, ...(data.config.plans?.classic || {}) },
              grand: { ...prev.plans.grand, ...(data.config.plans?.grand || {}) },
              elegant: { ...prev.plans.elegant, ...(data.config.plans?.elegant || {}) },
            },
          }))
        }
      } catch (e) { /* ignore */ }
      finally { setLoading(false) }
    })()
  }, [])

  function setPlan(pid, k, v) {
    setForm(p => ({ ...p, plans: { ...p.plans, [pid]: { ...p.plans[pid], [k]: v } } }))
  }

  async function uploadQr(pid, file) {
    if (file.size > 5 * 1024 * 1024) { toast.error('QR image must be under 5MB'); return }
    const dataUri = await fileToDataUri(file)
    toast.loading('Uploading QR…', { id: 'qru' })
    try {
      const res = await authFetch('/api/upload', {
        method: 'POST',
        body: JSON.stringify({ dataUri, folder: `vivoha/payment-qr/${pid}` }),
      })
      const data = await res.json()
      toast.dismiss('qru')
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setPlan(pid, 'qrUrl', data.url)
      setPlan(pid, 'qrPublicId', data.publicId || '')
      toast.success('QR uploaded')
    } catch (e) {
      toast.dismiss('qru'); toast.error(e.message)
    }
  }

  async function save() {
    setSaving(true)
    try {
      const res = await authFetch('/api/admin/payment-config', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      toast.success('Payment settings saved')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="text-center py-20 text-slate-500"><Loader2 className="animate-spin mx-auto" /></div>

  return (
    <div data-testid="admin-payment-settings">
      <h1 className="text-2xl font-semibold tracking-tight">Payment Settings</h1>
      <p className="text-sm text-slate-900/65 mt-1 mb-8">
        Configure UPI + QR per plan. Customers see these on the payment page. WhatsApp number is used for support during payment.
      </p>

      {/* WhatsApp config */}
      <section className="border border-slate-300 bg-white/40 p-6 mb-6" data-testid="settings-whatsapp">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle size={16} className="text-[#25D366]" />
          <h2 className="text-base font-medium text-slate-900">WhatsApp support</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] tracking-widest uppercase text-slate-500">Number (digits only, with country code)</Label>
            <Input
              value={form.whatsappNumber}
              onChange={(e) => setForm(p => ({ ...p, whatsappNumber: e.target.value }))}
              placeholder="919876543210"
              data-testid="wa-number"
              className="rounded-none border-slate-300 bg-white mt-1.5"
            />
          </div>
          <div>
            <Label className="text-[10px] tracking-widest uppercase text-slate-500">Greeting message</Label>
            <Input
              value={form.whatsappGreeting}
              onChange={(e) => setForm(p => ({ ...p, whatsappGreeting: e.target.value }))}
              placeholder="Hi Vivoha! I need help with payment…"
              className="rounded-none border-slate-300 bg-white mt-1.5"
            />
          </div>
        </div>
      </section>

      {/* Per-plan QR — vivoha is the current tier; classic/grand/elegant are legacy/archived */}
      {['vivoha', 'classic', 'grand', 'elegant'].map(pid => {
        const p = form.plans[pid]
        if (!p) return null
        const planLabel = pid === 'vivoha' ? 'Vivoha Wedding Experience' : pid.charAt(0).toUpperCase() + pid.slice(1)
        const priceLabel = pid === 'vivoha' ? '2,999' : pid === 'classic' ? '1,499' : pid === 'grand' ? '3,499' : '5,999'
        return (
          <section key={pid} className="border border-slate-300 bg-white/40 p-6 mb-5" data-testid={`settings-plan-${pid}`}>
            <h2 className="text-base font-medium text-slate-900 mb-1">{planLabel}{pid !== 'vivoha' && <span className="text-[10px] tracking-widest uppercase text-slate-500 ml-2">· legacy</span>}</h2>
            <div className="text-[10px] text-slate-500 tracking-widest uppercase mb-5">
              ₹{priceLabel}
            </div>
            <div className="grid md:grid-cols-[200px_1fr] gap-6">
              <div>
                <Label className="text-[10px] tracking-widest uppercase text-slate-500">QR code image</Label>
                <div className="mt-2">
                  {p.qrUrl ? (
                    <div className="relative">
                      <img src={p.qrUrl} alt="" className="w-full aspect-square object-contain bg-white border border-slate-300" />
                      <button
                        type="button"
                        onClick={() => { setPlan(pid, 'qrUrl', ''); setPlan(pid, 'qrPublicId', '') }}
                        className="absolute top-1 right-1 bg-white/90 text-slate-900 px-2 py-0.5 text-[9px] tracking-widest uppercase"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="block aspect-square border border-dashed border-slate-300 cursor-pointer flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100" data-testid={`qr-label-${pid}`}>
                      <Upload size={18} className="mb-1" />
                      <span className="text-[10px] tracking-widest uppercase">Upload QR</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && uploadQr(pid, e.target.files[0])}
                        data-testid={`qr-input-${pid}`}
                      />
                    </label>
                  )}
                </div>
                {!p.qrUrl && (
                  <div className="text-[10px] text-slate-900/55 mt-2 italic">
                    If not uploaded, a UPI QR is auto-generated from the UPI ID.
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-[10px] tracking-widest uppercase text-slate-500">UPI ID</Label>
                  <Input
                    value={p.upiId}
                    onChange={(e) => setPlan(pid, 'upiId', e.target.value)}
                    placeholder="vivoha@upi"
                    data-testid={`upi-${pid}`}
                    className="rounded-none border-slate-300 bg-white mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-[10px] tracking-widest uppercase text-slate-500">Note shown to customer (optional)</Label>
                  <Textarea
                    value={p.notes}
                    onChange={(e) => setPlan(pid, 'notes', e.target.value)}
                    rows={3}
                    maxLength={400}
                    placeholder="Pay ₹3,499 — your invite goes live within a few hours of verification."
                    className="rounded-none border-slate-300 bg-white mt-1.5"
                  />
                </div>
              </div>
            </div>
          </section>
        )
      })}

      <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-5">
        <AlertCircle size={12} /> These settings apply immediately to new payments.
      </div>

      <Button
        onClick={save}
        disabled={saving}
        data-testid="settings-save"
        className="bg-slate-900 hover:bg-slate-800 text-slate-50 rounded-md px-6 py-4 tracking-wider text-xs uppercase"
      >
        {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
        Save Settings
      </Button>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ShieldCheck, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('kal_token')) {
      router.replace('/admin')
    }
  }, [router])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      localStorage.setItem('kal_token', data.token)
      localStorage.setItem('kal_user', JSON.stringify(data.user))
      toast.success('Signed in')
      router.push('/admin')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4" data-testid="admin-login-page">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm"
      >
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-3">
            <span className="w-9 h-9 bg-slate-900 text-white flex items-center justify-center text-sm font-bold rounded">V</span>
            <div>
              <div className="text-sm font-semibold text-slate-900">Vivoha Admin</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1"><ShieldCheck size={10} /> Operations console</div>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4" data-testid="admin-login-form">
            <div className="space-y-1.5">
              <Label className="text-[11px] tracking-wider uppercase text-slate-500">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="admin-email-input"
                placeholder="admin@vivoha.in"
                className="border-slate-300 h-9 rounded-md text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] tracking-wider uppercase text-slate-500">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                data-testid="admin-password-input"
                placeholder="••••••••"
                className="border-slate-300 h-9 rounded-md text-sm"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              data-testid="admin-login-submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-md h-9 text-sm font-medium gap-2"
            >
              <LogIn size={14} /> {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 text-center rounded-b-lg">
            Access by invitation only. Forgot password? Contact your studio admin.
          </div>
        </div>
      </motion.div>
    </main>
  )
}

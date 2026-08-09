'use client'

// Legacy /payment/[slug] is no longer part of the flow.
// Razorpay is now invoked directly from /publish/[slug]. Redirect any
// stale link back to the publish screen.
import { useEffect } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function PaymentPageRedirect() {
  const { slug } = useParams()
  const sp = useSearchParams()
  const router = useRouter()
  const onboardToken = sp.get('onboardToken') || ''

  useEffect(() => {
    const qs = onboardToken ? `?onboardToken=${onboardToken}` : ''
    router.replace(`/publish/${slug}${qs}`)
  }, [slug, onboardToken, router])

  return (
    <main className="min-h-screen bg-[#FDFBF7] flex items-center justify-center text-[#8B7355]" data-testid="payment-redirect">
      <Loader2 className="animate-spin" />
    </main>
  )
}

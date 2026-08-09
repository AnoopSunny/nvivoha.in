import Link from 'next/link'
import { BLOG_POSTS } from '@/lib/blog-posts'

export const metadata = {
  title: 'The Vivoha Journal — Wedding Stories, Studio Notes & Inspiration',
  description:
    'Notes from the Vivoha studio on wedding website design, Indian wedding traditions, invitation craft and live photo walls — written for the modern couple.',
  openGraph: {
    title: 'The Vivoha Journal — Wedding Studio Notes',
    description: 'Wedding website design, Indian traditions, invitation craft and more — from the Vivoha studio.',
    type: 'website',
  },
}

export default function BlogIndexPage() {
  const sorted = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1))
  const [first, ...rest] = sorted
  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#3A3226]">
      <nav className="border-b border-[#C9B896]/30 sticky top-0 z-50 bg-[#FDFBF7]/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl text-[#3A3226]">
            Vivoha<span className="text-[#8B7355]">·</span>
          </Link>
          <Link href="/" className="text-xs tracking-widest uppercase text-[#8B7355] hover:text-[#3A3226]" data-testid="blog-back-home">
            ← Back to home
          </Link>
        </div>
      </nav>

      <header className="container mx-auto px-4 pt-20 pb-12 md:pt-28 md:pb-16 text-center max-w-3xl">
        <div className="text-[#8B7355] tracking-[0.4em] text-xs uppercase mb-4">The Vivoha Journal</div>
        <h1 className="font-serif font-light text-5xl md:text-7xl text-[#3A3226] leading-tight">
          Studio notes for <em className="italic">modern</em> couples.
        </h1>
        <p className="mt-6 text-[#3A3226]/70 max-w-2xl mx-auto">
          Quiet writing on wedding website design, Indian tradition, invitation craft and the small details that turn a celebration into a memory.
        </p>
      </header>

      {first && (
        <section className="container mx-auto px-4 pb-12" data-testid="blog-featured">
          <Link href={`/blog/${first.slug}`} className="block group">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center border border-[#C9B896]/40 p-6 md:p-10 bg-white/40">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={first.cover} alt={first.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              </div>
              <div>
                <div className="text-[#8B7355] tracking-[0.3em] text-[10px] uppercase mb-3">Featured · {first.tags[0]}</div>
                <h2 className="font-serif text-3xl md:text-5xl text-[#3A3226] leading-tight group-hover:text-[#8B7355] transition">{first.title}</h2>
                <p className="mt-4 text-[#3A3226]/70 leading-relaxed">{first.excerpt}</p>
                <div className="mt-6 text-xs tracking-widest uppercase text-[#3A3226]/60">{first.author} · {new Date(first.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} · {first.readTime}</div>
              </div>
            </div>
          </Link>
        </section>
      )}

      <section className="container mx-auto px-4 pb-24" data-testid="blog-list">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rest.map(post => (
            <Link href={`/blog/${post.slug}`} key={post.slug} className="group block" data-testid={`blog-card-${post.slug}`}>
              <div className="aspect-[4/5] overflow-hidden mb-5">
                <img src={post.cover} alt={post.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
              </div>
              <div className="text-[#8B7355] tracking-[0.3em] text-[10px] uppercase mb-2">{post.tags[0]} · {post.readTime}</div>
              <h3 className="font-serif text-2xl md:text-3xl text-[#3A3226] leading-tight group-hover:text-[#8B7355] transition">{post.title}</h3>
              <p className="mt-3 text-[#3A3226]/65 text-sm leading-relaxed">{post.excerpt}</p>
              <div className="mt-4 text-xs tracking-widest uppercase text-[#3A3226]/55">{new Date(post.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#C9B896]/30 py-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[#3A3226]/70">
          <div className="font-serif text-xl text-[#3A3226]">Vivoha<span className="text-[#8B7355]">·</span></div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/" className="hover:text-[#8B7355]">Home</Link>
            <Link href="/blog" className="hover:text-[#8B7355]">Journal</Link>
            <Link href="/terms" className="hover:text-[#8B7355]">Terms</Link>
            <Link href="/privacy" className="hover:text-[#8B7355]">Privacy</Link>
            <Link href="/refund-policy" className="hover:text-[#8B7355]">Refund Policy</Link>
          </div>
          <div className="text-xs text-[#8B7355] tracking-wider">© 2026 Vivoha</div>
        </div>
      </footer>
    </main>
  )
}

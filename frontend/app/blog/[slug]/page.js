import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BLOG_POSTS, findPost } from '@/lib/blog-posts'

export function generateStaticParams() {
  return BLOG_POSTS.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const p = findPost(slug)
  if (!p) return { title: 'Article not found · Vivoha' }
  return {
    title: p.seoTitle || `${p.title} · Vivoha`,
    description: p.seoDescription || p.excerpt,
    openGraph: {
      title: p.seoTitle || p.title,
      description: p.seoDescription || p.excerpt,
      type: 'article',
      images: p.cover ? [{ url: p.cover }] : undefined,
      publishedTime: p.date,
    },
  }
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params
  const post = findPost(slug)
  if (!post) notFound()

  const sorted = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1))
  const related = sorted.filter(p => p.slug !== post.slug).slice(0, 3)

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#3A3226]">
      <nav className="border-b border-[#C9B896]/30 sticky top-0 z-50 bg-[#FDFBF7]/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl text-[#3A3226]">
            Vivoha<span className="text-[#8B7355]">·</span>
          </Link>
          <Link href="/blog" className="text-xs tracking-widest uppercase text-[#8B7355] hover:text-[#3A3226]" data-testid="blog-back-index">
            ← All articles
          </Link>
        </div>
      </nav>

      <article className="container mx-auto px-4 py-16 md:py-24 max-w-3xl" data-testid={`blog-article-${post.slug}`}>
        <div className="text-[#8B7355] tracking-[0.4em] text-xs uppercase mb-4">{post.eyebrow}</div>
        <h1 className="font-serif font-light text-4xl md:text-6xl text-[#3A3226] leading-tight">{post.title}</h1>
        <div className="mt-6 text-sm text-[#8B7355]">
          {post.author} · {new Date(post.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} · {post.readTime}
        </div>
        {post.cover && (
          <div className="mt-12 aspect-[16/10] overflow-hidden">
            <img src={post.cover} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="mt-12 prose-vivoha space-y-6 text-[#3A3226]/85 leading-relaxed text-[17px] md:text-[18px]">
          {post.body.map((block, i) => {
            if (block.type === 'h2') return <h2 key={i} className="font-serif text-2xl md:text-3xl text-[#3A3226] mt-12 mb-4 leading-tight">{block.text}</h2>
            if (block.type === 'cta') return (
              <div key={i} className="mt-12 mb-4 border-l-4 border-[#8B7355] pl-6 py-2">
                <Link href={block.href} className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase bg-[#3A3226] text-[#FDFBF7] hover:bg-[#1F1A14] px-6 py-4 transition">
                  {block.text} →
                </Link>
              </div>
            )
            return <p key={i}>{block.text}</p>
          })}
        </div>
      </article>

      {related.length > 0 && (
        <section className="container mx-auto px-4 pb-24" data-testid="blog-related">
          <div className="border-t border-[#C9B896]/30 pt-16">
            <div className="text-[#8B7355] tracking-[0.4em] text-xs uppercase mb-6 text-center">Read next</div>
            <div className="grid md:grid-cols-3 gap-8">
              {related.map(p => (
                <Link href={`/blog/${p.slug}`} key={p.slug} className="group block" data-testid={`blog-related-${p.slug}`}>
                  <div className="aspect-[4/3] overflow-hidden mb-4">
                    <img src={p.cover} alt={p.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                  </div>
                  <div className="text-[#8B7355] tracking-[0.3em] text-[10px] uppercase mb-2">{p.tags[0]}</div>
                  <h3 className="font-serif text-xl text-[#3A3226] leading-tight group-hover:text-[#8B7355] transition">{p.title}</h3>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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

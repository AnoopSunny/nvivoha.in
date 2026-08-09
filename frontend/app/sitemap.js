import { BLOG_POSTS } from '@/lib/blog-posts'

const BASE = 'https://vivoha.in'

export default function sitemap() {
  const now = new Date().toISOString()
  const staticUrls = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/refund-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
  const postUrls = BLOG_POSTS.map(p => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: new Date(p.date).toISOString(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))
  return [...staticUrls, ...postUrls]
}

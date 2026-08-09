export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api',
          '/c/',
          '/form/',
          '/preview/',
          '/hub/',
          '/status/',
          '/onboard/',
          '/publish/',
          '/payment/',
          '/demo/',
        ],
      },
    ],
    sitemap: 'https://vivoha.in/sitemap.xml',
  }
}

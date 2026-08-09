import './globals.css'
import { Playfair_Display, Inter } from 'next/font/google'
import { Toaster } from 'sonner'

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata = {
  title: 'Vivoha — Premium Luxury Indian Wedding Websites',
  description: 'Create stunning, cinematic wedding websites for your special day. Premium templates, RSVP management, and more.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="font-sans antialiased bg-[#FDFBF7] text-[#1F2937]">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Sparkles, X, ChevronRight } from 'lucide-react'
import ContactModal, { whatsappUrl, WHATSAPP_NUMBER } from '@/components/ContactModal'

/**
 * Floating booking widget shown only on demo wedding pages.
 * Combines:
 *   - top thin ribbon "You're viewing a demo · Book yours"
 *   - bottom-right floating "Book this template" pill
 *   - opens contact modal with template pre-filled
 */
export default function DemoBookingWidget({ templateName }) {
  const [open, setOpen] = useState(false)
  const [ribbonDismissed, setRibbonDismissed] = useState(false)

  const waMessage = `Hi Vivoha! I love the "${templateName}" template — can we talk about getting one for our wedding?`

  return (
    <>
      <ContactModal
        open={open}
        onClose={() => setOpen(false)}
        templateInterest={templateName}
        source={`demo-${templateName}`}
      />

      {/* TOP RIBBON */}
      <AnimatePresence>
        {!ribbonDismissed && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            data-testid="demo-ribbon"
            className="fixed top-0 left-0 right-0 z-[80] bg-[#3A3226] text-[#FDFBF7] py-2.5 px-4"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <div className="container mx-auto flex items-center justify-between gap-4 text-xs md:text-sm">
              <div className="flex items-center gap-2 flex-1">
                <Sparkles size={14} className="text-[#C9B896] flex-shrink-0" />
                <span className="tracking-wide">
                  <span className="hidden sm:inline">You're viewing a Vivoha demo. </span>
                  Want the <em className="italic text-[#C9B896]">{templateName}</em> template for your wedding?
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setOpen(true)}
                  data-testid="demo-ribbon-book"
                  className="bg-[#C9B896] hover:bg-[#FDFBF7] text-[#3A3226] px-3 md:px-5 py-1.5 text-[10px] md:text-xs tracking-[0.2em] uppercase transition whitespace-nowrap"
                >
                  Book Yours
                </button>
                <button
                  onClick={() => setRibbonDismissed(true)}
                  aria-label="Dismiss"
                  className="text-[#FDFBF7]/60 hover:text-[#FDFBF7] p-1"
                  data-testid="demo-ribbon-close"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM-RIGHT FLOATING WIDGET */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, duration: 0.4 }}
        className="fixed bottom-5 right-5 md:bottom-7 md:right-7 z-[60] flex flex-col items-end gap-3"
        data-testid="demo-booking-widget"
      >
        {/* Tooltip card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.6 }}
          className="bg-[#FDFBF7] border border-[#C9B896] shadow-xl p-4 max-w-xs hidden md:block"
        >
          <div className="text-[10px] tracking-[0.3em] uppercase text-[#8B7355] mb-1">Loving {templateName}?</div>
          <div className="font-serif text-base text-[#3A3226] mb-3 italic">
            Book this template for your wedding — concierge-built in 24 hours.
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOpen(true)}
              data-testid="demo-tooltip-form"
              className="bg-[#3A3226] hover:bg-[#1F1A14] text-[#FDFBF7] py-2 text-[10px] tracking-[0.2em] uppercase transition flex items-center justify-center gap-1"
            >
              Enquire <ChevronRight size={10} />
            </button>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`}
              target="_blank"
              rel="noreferrer"
              data-testid="demo-tooltip-whatsapp"
              className="bg-[#25D366] hover:bg-[#1ebe57] text-white py-2 text-[10px] tracking-[0.2em] uppercase transition flex items-center justify-center gap-1"
            >
              <MessageCircle size={10} /> WhatsApp
            </a>
          </div>
        </motion.div>

        {/* Floating main pill (mobile + persistent) */}
        <div className="flex items-center gap-2">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat on WhatsApp"
            data-testid="demo-float-whatsapp"
            className="md:hidden w-12 h-12 rounded-full bg-[#25D366] hover:bg-[#1ebe57] text-white shadow-lg flex items-center justify-center transition hover:scale-110"
          >
            <MessageCircle size={20} />
          </a>
          <button
            onClick={() => setOpen(true)}
            data-testid="demo-float-book"
            className="bg-[#3A3226] hover:bg-[#C9B896] hover:text-[#3A3226] text-[#FDFBF7] px-5 md:px-7 py-3 md:py-4 rounded-full shadow-2xl flex items-center gap-2 text-xs tracking-[0.25em] uppercase transition hover:scale-105"
            style={{ boxShadow: '0 10px 40px -8px rgba(58, 50, 38, 0.5)' }}
          >
            <Sparkles size={14} className="text-[#C9B896]" />
            Book This Template
          </button>
        </div>
      </motion.div>
    </>
  )
}

import LegalShell, { H2, P, UL } from '@/components/LegalShell'

export const metadata = {
  title: 'Terms & Conditions · Vivoha',
  description: 'The terms that quietly govern using Vivoha — premium luxury wedding websites, hand-crafted.',
}

export default function TermsPage() {
  return (
    <LegalShell eyebrow="The fine print" title="Terms & Conditions" lastUpdated="February 2026">
      <P>
        Welcome to <strong>Vivoha</strong> (&ldquo;Vivoha&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;us&rdquo;). By engaging our concierge wedding-website service or accessing
        any page under <a className="underline" href="https://vivoha.in">vivoha.in</a>, you (&ldquo;you&rdquo;, &ldquo;the couple&rdquo;,
        &ldquo;the client&rdquo;) agree to the following terms. Please read them carefully — they protect both your
        celebration and our studio.
      </P>

      <H2>1. The service we offer</H2>
      <P>
        Vivoha is a managed studio service. We craft, deploy and host a personal wedding website on your behalf.
        Our pricing is a single one-time fee — the Vivoha Wedding Experience at ₹2,999 — and includes lifetime
        hosting along with concierge support from our studio.
      </P>

      <H2>2. What the Vivoha Wedding Experience includes</H2>
      <UL>
        <li>Access to every cinematic template — switch between designs as often as you like before publishing.</li>
        <li>Your couple story, multi-event timeline, venues with maps, and a curated photo gallery.</li>
        <li>Live RSVPs with meal preferences, WhatsApp confirmations and a CSV export.</li>
        <li>Live Guest Photo Wall — QR uploads with an approval queue you control from your Wedding Hub.</li>
        <li>Personal Wedding Hub for status, analytics, RSVPs and photo management — all in one URL.</li>
        <li>Studio review, free edits, a thank-you PDF and lifetime hosting.</li>
      </UL>
      <P>
        Optional add-ons (such as a Custom Domain, the Premium Guest Memories Wall, or Concierge Setup Assistance)
        are available at checkout. Capacity limits are documented inside your Wedding Hub and may be adjusted over
        time; existing customers will keep the limits they originally received for the duration of their hosting.
      </P>

      <H2>3. Your content</H2>
      <P>
        You retain all rights to the photos, names, stories and other media you share with us. By providing them, you
        grant Vivoha a limited licence to host, display and process them solely to deliver your wedding website. You
        confirm that you have the right to share each piece of content (including photos of guests and family) and that
        nothing you upload infringes another person&apos;s rights or breaks Indian law.
      </P>

      <H2>4. Our craft</H2>
      <P>
        The templates, code, motion design, the brand &ldquo;Vivoha&rdquo; and the Vivoha aesthetic remain our exclusive property.
        You may not copy, resell, white-label or rebrand any part of the website we deliver. The personalised content
        inside your site — your names, photos, story, schedule, RSVPs — is yours.
      </P>

      <H2>5. Privacy & guests</H2>
      <P>
        We respect that every wedding holds people&apos;s personal information. RSVPs, photo uploads and guest details are
        accessible only to you (through your couple dashboard) and our admin studio. We never sell guest data. See our
        <a className="underline mx-1" href="/privacy">Privacy Policy</a> for the long answer.
      </P>

      <H2>6. Timelines & revisions</H2>
      <P>
        Most websites are crafted within 24–48 hours of receiving the complete brief. Edits are unlimited during your
        active hosting window — message us, we update within a few hours. We may pause work if we have not received
        essential information (such as confirmed names or wedding date).
      </P>

      <H2>7. Hosting & uptime</H2>
      <P>
        Vivoha hosts your site on industry-standard cloud infrastructure. While we aim for continuous availability,
        we do not promise 100% uptime — brief planned maintenance windows may occur. We will notify you in advance
        whenever practical.
      </P>

      <H2>8. Payments</H2>
      <P>
        Pricing is shown in Indian Rupees (INR) and is a one-time payment for the hosting period stated on your plan.
        All payments are processed before development begins. Hosting renewals after the initial term are optional and
        priced separately.
      </P>

      <H2>9. Refunds</H2>
      <P>
        We take great pride in our work and aim for every couple to love their site. However, given the bespoke,
        time-intensive nature of each project, <strong>all payments are final and non-refundable</strong>. Please review
        our <a className="underline" href="/refund-policy">Refund Policy</a> before purchasing. Booking with Vivoha
        constitutes your acceptance of this policy.
      </P>

      <H2>10. Termination</H2>
      <P>
        We may pause or terminate service if your content violates these terms or applicable law. Your wedding remains
        sacred to us — we will always notify you first and give you a chance to make it right.
      </P>

      <H2>11. Limitation of liability</H2>
      <P>
        To the maximum extent permitted by law, Vivoha&apos;s total liability for any claim relating to the service is
        limited to the amount you paid for your plan. We are not liable for indirect or consequential losses (such as
        guest no-shows or third-party platform outages).
      </P>

      <H2>12. Governing law</H2>
      <P>
        These terms are governed by the laws of India. Disputes that cannot be resolved amicably will be subject to the
        exclusive jurisdiction of the courts of Bengaluru, Karnataka.
      </P>

      <H2>13. Contact</H2>
      <P>
        Questions? Reach our studio at <a className="underline" href="mailto:hello@vivoha.in">hello@vivoha.in</a>.
      </P>
    </LegalShell>
  )
}

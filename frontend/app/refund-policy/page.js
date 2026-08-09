import LegalShell, { H2, P } from '@/components/LegalShell'

export const metadata = {
  title: 'Refund Policy · Vivoha',
  description: 'Vivoha operates a no-refund policy. Why — and how we make it right when something feels off.',
}

export default function RefundPolicyPage() {
  return (
    <LegalShell eyebrow="A note on refunds" title="Refund Policy" lastUpdated="February 2026">
      <P>
        Every Vivoha website is hand-crafted by our studio for a single couple, in a short window of time, with
        attention to every line of copy and every gradient. Because of how personal and bespoke each project is, we
        operate a strict <strong>no-refund policy</strong>. This page explains what that means and what to do if
        something feels off.
      </P>

      <H2>1. All payments are final</H2>
      <P>
        Once a plan is purchased, the amount paid is non-refundable — in full or in part — regardless of the reason
        (change of plans, change of vendor, postponement, cancellation, dissatisfaction with the final design). This
        includes initial deposits, add-ons and renewal payments.
      </P>

      <H2>2. Why no refunds</H2>
      <P>
        When you book Vivoha, our studio immediately blocks design and engineering time for your wedding. Templates are
        bespoke-tuned to your photos, names, mood and story; senior craft hours are committed; cloud assets (hosting,
        image CDN, fonts) are provisioned. Those resources cannot be reclaimed once the work has begun.
      </P>

      <H2>3. If something feels off — we make it right</H2>
      <P>
        No refunds does not mean &ldquo;no responsibility.&rdquo; If anything about the website looks or feels wrong, write
        to us at <a className="underline" href="mailto:hello@vivoha.in">hello@vivoha.in</a> with what you would like
        changed. Within your active hosting window we offer <strong>unlimited revisions</strong> — words, photos,
        events, palette, motion — and we keep refining until it feels like you.
      </P>

      <H2>4. Postponements & cancellations</H2>
      <P>
        Life happens. If your wedding is postponed, your website stays exactly where it is for the remainder of your
        hosting term and we will update dates, events and copy at no extra charge. If your wedding is cancelled, we
        cannot refund, but you keep ownership of the personalised content and can request an HTML export.
      </P>

      <H2>5. Chargebacks</H2>
      <P>
        Initiating a chargeback or payment dispute will result in immediate suspension of your website and admin access
        while the dispute is being investigated. We always prefer to resolve issues directly — please email us first.
      </P>

      <H2>6. Exception: failure to deliver</H2>
      <P>
        The only exception to this policy: if Vivoha fails to deliver a working website within fourteen (14) days of
        receiving your complete brief, and we have not communicated a clear reason for the delay, you may request a
        refund in writing. We will assess each such request in good faith.
      </P>

      <H2>7. Acceptance</H2>
      <P>
        By booking any Vivoha plan, you confirm that you have read, understood and agreed to this refund policy.
      </P>

      <H2>8. Contact</H2>
      <P>
        We&apos;d much rather talk than argue. For anything refund-related, write to
        <a className="underline mx-1" href="mailto:hello@vivoha.in">hello@vivoha.in</a> and we will get back within
        forty-eight hours.
      </P>
    </LegalShell>
  )
}

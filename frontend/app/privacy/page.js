import LegalShell, { H2, P, UL } from '@/components/LegalShell'

export const metadata = {
  title: 'Privacy Policy · Vivoha',
  description: 'How Vivoha respects, protects and uses the information shared by couples and their guests.',
}

export default function PrivacyPage() {
  return (
    <LegalShell eyebrow="With care, always" title="Privacy Policy" lastUpdated="February 2026">
      <P>
        Your wedding is a tender moment. We treat the information you and your guests share with the same care we put
        into the design. This policy explains what we collect, why, and how you stay in control.
      </P>

      <H2>1. The studio behind Vivoha</H2>
      <P>
        Vivoha (&ldquo;Vivoha&rdquo;, &ldquo;we&rdquo;) is the data controller for personal information processed through
        <a className="underline mx-1" href="https://vivoha.in">vivoha.in</a> and any wedding website we build for you.
      </P>

      <H2>2. What we collect from couples</H2>
      <UL>
        <li>Your names, wedding date, contact details (email, phone) and any story or events you share for the site.</li>
        <li>Photographs and videos you upload for your gallery or hero image.</li>
        <li>A password we hash and store securely for your couple dashboard.</li>
        <li>Limited technical data (IP, device type) so the site can render correctly.</li>
      </UL>

      <H2>3. What we collect from guests</H2>
      <UL>
        <li>The RSVP form fields they choose to fill: name, optional email and phone, attendance, meal preference, note for the couple.</li>
        <li>Photos guests choose to share on the Live Guest Photo Wall, along with their name and an optional caption.</li>
        <li>Anonymous page-view counts (no cookies tracking individuals).</li>
      </UL>
      <P>
        Guest data is visible <strong>only</strong> to you (via the couple dashboard) and our admin studio. We never
        sell, rent or share guest contact details with anyone.
      </P>

      <H2>4. Cookies</H2>
      <P>
        Vivoha uses two short-lived cookies: one to remember your admin or couple-dashboard sign-in, and one to remember
        that a guest has unlocked a password-protected invitation. We do not use third-party analytics or advertising
        cookies on guest-facing pages.
      </P>

      <H2>5. How we use this information</H2>
      <UL>
        <li>To craft and host your wedding website.</li>
        <li>To communicate with you about your project.</li>
        <li>To show you who has responded to your invitation.</li>
        <li>To moderate the photo wall before approving guest uploads.</li>
        <li>To prevent abuse, fraud or violations of these terms.</li>
      </UL>

      <H2>6. Third-party services</H2>
      <P>
        We rely on a few trusted partners to deliver the experience:
      </P>
      <UL>
        <li><strong>Cloudinary</strong> — to store and serve your photos quickly across the world.</li>
        <li><strong>MongoDB Atlas</strong> — to safely persist your wedding data.</li>
        <li><strong>Cloud hosting providers</strong> — to keep your site online.</li>
      </UL>
      <P>Each of these providers acts as a data processor and is bound by their own published privacy notices.</P>

      <H2>7. Retention</H2>
      <P>
        We retain your wedding website and its data for the hosting period stated on your plan (six months, one year or
        three years). After that, you may renew, request an export, or ask us to delete it. RSVPs and photo-wall
        uploads are deleted together with the website unless you have downloaded a CSV or ZIP archive first.
      </P>

      <H2>8. Your rights</H2>
      <UL>
        <li>Request a copy of the personal data we hold about you.</li>
        <li>Ask us to correct anything inaccurate.</li>
        <li>Ask us to delete your data (subject to legal obligations).</li>
        <li>Withdraw any consent you have previously given.</li>
      </UL>
      <P>
        Email <a className="underline" href="mailto:privacy@vivoha.in">privacy@vivoha.in</a> for any of the above. We
        respond within seven working days.
      </P>

      <H2>9. Security</H2>
      <P>
        Passwords are hashed (bcrypt). Authentication tokens are signed (JWT). All traffic to and from Vivoha is served
        over HTTPS. While we do everything reasonable, no online service can promise absolute security; please use a
        strong, unique password.
      </P>

      <H2>10. Children</H2>
      <P>
        Vivoha is intended for adults planning a wedding. We do not knowingly collect personal information from anyone
        under 18. If you believe a minor has shared data with us, please contact us and we will delete it.
      </P>

      <H2>11. Changes to this policy</H2>
      <P>
        We may update this policy as the service evolves. The &ldquo;Last updated&rdquo; date above will reflect any
        changes. Material changes are emailed to active customers.
      </P>

      <H2>12. Contact</H2>
      <P>
        Reach us at <a className="underline" href="mailto:privacy@vivoha.in">privacy@vivoha.in</a> or for anything else
        <a className="underline mx-1" href="mailto:hello@vivoha.in">hello@vivoha.in</a>.
      </P>
    </LegalShell>
  )
}

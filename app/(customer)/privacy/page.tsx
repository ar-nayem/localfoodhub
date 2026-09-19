import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: `Privacy Policy — ${brand.name}` };

// Every statement here was checked against what the app actually stores and sends. When a
// real payment provider, SMS gateway or email service is added, the "Who we share it
// with" and "Payments" sections must be updated before it goes live — app stores compare
// this page against the Data Safety form, and against the app's real behaviour.
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="19 September 2026"
      intro={
        <p>
          {brand.name} is a marketplace that connects you with local food shops. This policy explains what
          information we collect when you use our website and app, why, who can see it, and how to delete it.
        </p>
      }
    >
      <LegalSection title="Information we collect">
        <p><strong>Your account.</strong> Your name, and the email address and/or phone number you sign up with.
          Passwords are never stored — only a one-way hash that can&apos;t be turned back into the password. Your date
          of birth, only if you choose to add it.</p>
        <p><strong>If you sign in with Google.</strong> Your name, email address, profile photo and Google account
          ID. We don&apos;t receive your Google password or access anything else in your Google account.</p>
        <p><strong>Your orders.</strong> What you ordered, prices, pickup time or table, any notes, and the contact
          name and phone number you enter at checkout. If you order for someone else, their name, phone number and
          any note you add for the shop.</p>
        <p><strong>Your location.</strong> With your permission, your device&apos;s location, used to show nearby
          shops and distances. It&apos;s kept on your device for up to 15 minutes and sent to us only as part of a
          search — we don&apos;t store it against your account. Addresses you save yourself, including their map
          position, are stored until you delete them.</p>
        <p><strong>Messages.</strong> Text and photos you exchange with a shop about an order.</p>
        <p><strong>Reviews.</strong> Your ratings, comments, and any photos or videos you attach.</p>
        <p><strong>Favorites and notifications</strong> you&apos;ve saved or received in the app.</p>
        <p><strong>Sign-in codes.</strong> When you sign in with a one-time code, we store only a one-way hash of
          it. Codes expire after 5 minutes.</p>
        <p><strong>Technical logs.</strong> Our servers keep standard logs — IP address, time, browser type and the
          page or search requested (which can include the approximate location a search was made from) — for
          security and troubleshooting. These are deleted after about two weeks.</p>
        <p>QR code scans and recommendation interactions are counted without recording who you are.</p>
      </LegalSection>

      <LegalSection title="Payments">
        <p>We don&apos;t currently collect or store card numbers, bank details or mobile wallet details. We keep a
          record that an order was paid, its amount and its status. If we introduce a payment provider, this policy
          will be updated first to name them.</p>
      </LegalSection>

      <LegalSection title="How we use it">
        <ul>
          <li>To place your orders and let shops prepare them.</li>
          <li>To show shops and distances near you, or near a place you search for.</li>
          <li>To let you and a shop contact each other about an order.</li>
          <li>To keep accounts secure and prevent fraud and abuse.</li>
          <li>To understand how the service is used, through totals and averages that don&apos;t identify you.</li>
        </ul>
        <p>We don&apos;t send marketing messages. If we ever start, we&apos;ll ask for your permission first, and
          you&apos;ll be able to withdraw it at any time.</p>
      </LegalSection>

      <LegalSection title="Who we share it with">
        <ul>
          <li><strong>Shops you order from</strong> see your order, the contact name and phone number you gave at
            checkout, the recipient&apos;s details if you ordered for someone else, and your messages with them.</li>
          <li><strong>Everyone</strong> can read reviews you post. Your name appears shortened — for example
            &ldquo;Rahim K.&rdquo;</li>
          <li><strong>Google</strong> provides maps, place search and address lookup, and Google sign-in. Place
            searches and map positions you view are sent to Google to provide these.</li>
          <li><strong>OpenStreetMap</strong> provides some map images. Loading them sends your IP address and the map
            area being viewed to OpenStreetMap&apos;s servers.</li>
          <li><strong>Our hosting provider</strong> stores the data on our behalf.</li>
          <li><strong>Authorities</strong>, where the law requires us to.</li>
        </ul>
        <p>We don&apos;t sell your personal information, and we don&apos;t share it with advertisers.</p>
      </LegalSection>

      <LegalSection title="Cookies and storage on your device">
        <ul>
          <li>A sign-in cookie that keeps you logged in for up to 30 days.</li>
          <li>A short-lived security cookie during Google sign-in, which expires after 10 minutes.</li>
          <li>Your cart, saved on your device so it survives closing the app.</li>
          <li>Your recent location, kept on your device for up to 15 minutes.</li>
        </ul>
        <p>We don&apos;t use advertising or third-party tracking cookies.</p>
      </LegalSection>

      <LegalSection title="How long we keep it">
        <p>We keep your account information for as long as your account is open. When you delete your account:</p>
        <ul>
          <li>Your account, saved addresses, favorites, notifications and sign-in codes are permanently deleted.</li>
          <li>Photos you sent in messages are deleted, and your messages are replaced with &ldquo;This message was
            deleted.&rdquo;</li>
          <li>Your past orders are kept for the shops&apos; financial records, with your name, phone number, notes and
            any recipient details removed, so they no longer identify you.</li>
          <li>Your reviews stay visible, so shop ratings stay accurate, but show &ldquo;Former customer&rdquo; and are
            no longer linked to you.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Your choices">
        <ul>
          <li>View and update your details and saved addresses from your profile.</li>
          <li>Turn location access off at any time in your browser or phone settings — you can still search for a
            place by name.</li>
          <li>Ask us for a copy of your information, or to correct it, by emailing us.</li>
          <li>Delete your account yourself from <Link href="/delete-account" className="font-medium text-primary underline">
            Delete your account</Link>, at any time.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Security">
        <p>Everything is sent over encrypted connections (HTTPS). Passwords and sign-in codes are stored only as
          one-way hashes, and each shop can see only its own orders and customers. No system is perfectly secure,
          but we work to protect your information and will tell you promptly if a breach affects you.</p>
      </LegalSection>

      <LegalSection title="Children">
        <p>{brand.name} isn&apos;t meant for children under 13, and we don&apos;t knowingly collect their
          information. If you believe a child has created an account, contact us and we&apos;ll delete it.</p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>If we change this policy, we&apos;ll update the date at the top, and tell you in the app before any
          significant change takes effect.</p>
      </LegalSection>

      <LegalSection title="Contact us">
        <p>Questions, or requests about your information:{" "}
          <a href={`mailto:${brand.supportEmail}`} className="font-medium text-primary underline">{brand.supportEmail}</a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}

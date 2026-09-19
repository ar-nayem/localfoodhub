import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: `Terms of Service — ${brand.name}` };

// The cancellation section mirrors CANCELLABLE_ORDER_STATUSES in lib/constants.ts —
// "until the shop accepts". If that rule changes, this page has to change with it.
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="19 September 2026"
      intro={
        <p>
          These terms apply when you use the {brand.name} website or app. By creating an account or placing an
          order, you agree to them. Please also read our{" "}
          <Link href="/privacy" className="font-medium text-primary underline">Privacy Policy</Link>.
        </p>
      }
    >
      <LegalSection title="What we do">
        <p>{brand.name} is a marketplace. We help you find local food shops, order from them and pay. The shops are
          independent businesses: when you place an order, you&apos;re buying from that shop, and the shop is
          responsible for preparing your food.</p>
      </LegalSection>

      <LegalSection title="Your account">
        <ul>
          <li>You must be at least 13 years old. If you&apos;re under 18, you need a parent or guardian&apos;s
            permission.</li>
          <li>Give accurate details, and keep your sign-in secure. You&apos;re responsible for orders placed from
            your account.</li>
          <li>You can order as a guest without an account.</li>
          <li>You can delete your account at any time from{" "}
            <Link href="/delete-account" className="font-medium text-primary underline">Delete your account</Link>.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Orders and prices">
        <ul>
          <li>Each shop sets its own menu, prices and availability. The total you pay is shown before you confirm.</li>
          <li>A shop may decline an order — for example, if an item has sold out. You won&apos;t be charged for an
            order that&apos;s declined.</li>
          <li>Pickup orders should be collected at the time you chose. Dine-in orders are linked to the table whose
            QR code you scanned.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Cancellations and refunds">
        <ul>
          <li>You can cancel an order yourself until the shop accepts it. Any payment is then refunded to the method
            you paid with.</li>
          <li>Once a shop has accepted your order, it may already be preparing it. To change or cancel it after
            that, contact the shop through the order page.</li>
          <li>If something is wrong with your order, contact the shop first. If it isn&apos;t resolved, contact us.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Food, ingredients and allergies">
        <p>Shops are responsible for the food they serve, including its ingredients and allergen information. If
          you have an allergy or dietary need, message the shop before ordering and check with them when you
          collect.</p>
      </LegalSection>

      <LegalSection title="Reviews and messages">
        <ul>
          <li>Reviews must be honest and based on an order you actually placed.</li>
          <li>Don&apos;t post content that&apos;s abusive, hateful, misleading, or that shares someone else&apos;s
            personal information.</li>
          <li>We may remove content that breaks these rules. By posting a review, you let us display it in the app
            and on the website.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Things you must not do">
        <ul>
          <li>Place fake orders, or use someone else&apos;s account or payment details.</li>
          <li>Tamper with, copy or misuse shop or table QR codes.</li>
          <li>Try to access data that isn&apos;t yours, or interfere with how the service runs.</li>
          <li>Copy large parts of the service or its data by automated means.</li>
        </ul>
        <p>We may suspend or close accounts that do.</p>
      </LegalSection>

      <LegalSection title="For shops">
        <p>Shops using {brand.name} agree to keep their menus, prices and opening times accurate, prepare orders
          they accept, and treat customer information only as needed to fulfil orders. Commission and payouts are
          set out in each shop&apos;s agreement with us.</p>
      </LegalSection>

      <LegalSection title="Changes and availability">
        <p>We&apos;re improving {brand.name} all the time, so features may change. We aim to keep the service
          running, but can&apos;t promise it will always be available or free of errors.</p>
      </LegalSection>

      <LegalSection title="Our responsibility">
        <p>We&apos;re responsible for running the marketplace with reasonable care. We aren&apos;t responsible for a
          shop&apos;s food, service or premises. Nothing in these terms limits any rights you have under the law
          that can&apos;t be limited.</p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>If we update these terms, we&apos;ll change the date at the top and tell you in the app before any
          significant change takes effect. Continuing to use {brand.name} after that means you accept the updated
          terms.</p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>These terms are governed by the laws of Bangladesh.</p>
      </LegalSection>

      <LegalSection title="Contact us">
        <p>
          <a href={`mailto:${brand.supportEmail}`} className="font-medium text-primary underline">{brand.supportEmail}</a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}

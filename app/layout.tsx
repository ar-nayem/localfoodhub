import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Toaster } from "@/components/ui/Toast";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { brand, businessBrand } from "@/lib/brand";
import { isBusinessHost } from "@/lib/hosts";

// Both Android apps share this layout, so the identity in the document head — name, home-
// screen title, iOS touch icon — is chosen by hostname (see lib/hosts.ts). Reading the
// request headers makes every page render on demand, which they mostly already did.
export function generateMetadata(): Metadata {
  const business = isBusinessHost(headers().get("host"));
  const name = business ? businessBrand.name : brand.name;
  return {
    title: name,
    description: business ? businessBrand.description : brand.tagline,
    applicationName: name,
    appleWebApp: {
      capable: true,
      title: business ? businessBrand.appShortName : brand.appShortName,
      statusBarStyle: "default",
    },
    icons: {
      apple: [
        {
          url: business ? "/icons/business/apple-touch-icon.png" : "/icons/apple-touch-icon.png",
          sizes: "180x180",
        },
      ],
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: brand.primaryColorHex,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        {children}
        <Toaster />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}

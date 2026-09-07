import { QrTemplateManager } from "@/components/admin/QrTemplateManager";

export const dynamic = "force-dynamic";

export default function AdminQrTemplatesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="text-xl font-bold">QR card templates</h1>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">
        Control which card designs vendors can choose, their order, and the default for
        each QR type. Designs are platform-branded — vendors pick a layout, never the
        branding.
      </p>
      <QrTemplateManager />
    </main>
  );
}

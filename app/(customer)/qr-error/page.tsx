import Link from "next/link";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/Button";

const MESSAGES: Record<string, string> = {
  not_found: "This QR code isn't available.",
  expired: "This QR code has expired.",
  inactive: "This QR code is currently inactive.",
  revoked: "This QR code has been disabled.",
};

export default function QrErrorPage({ searchParams }: { searchParams: { reason?: string } }) {
  const message = MESSAGES[searchParams.reason ?? ""] ?? MESSAGES.not_found;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <QrCode size={28} className="text-muted-foreground" />
      </div>
      <h1 className="text-lg font-semibold">{message}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Try scanning again, or find something delicious nearby instead.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2">
        <Link href="/explore">
          <Button className="w-full">Find nearby shops</Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="w-full">
            Back to home
          </Button>
        </Link>
      </div>
    </main>
  );
}

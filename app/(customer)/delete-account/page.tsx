"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { brand } from "@/lib/brand";

interface Session {
  userId: string;
  name: string;
  role: string;
}

// This page's URL is what goes into Play Console's "Delete account" field. Play requires
// it to work for someone who has already uninstalled the app — so a signed-out visitor
// gets real instructions and an email route, not a login wall with no explanation.
export default function DeleteAccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setSession(d.session ?? null))
      .catch(() => setSession(null));
  }, []);

  async function deleteAccount() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmText.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Your account couldn't be deleted. Please try again.");
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your account couldn't be deleted. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  const whatHappens = (
    <LegalSection title="What happens when you delete your account">
      <ul>
        <li>Your account, saved addresses, favorites and notifications are permanently deleted.</li>
        <li>Photos you sent in messages are deleted, and your messages are replaced with &ldquo;This message was
          deleted.&rdquo;</li>
        <li>Past orders stay in the shops&apos; financial records, with your name, phone number, notes and recipient
          details removed.</li>
        <li>Reviews you wrote stay visible but show &ldquo;Former customer&rdquo; instead of your name.</li>
        <li>This can&apos;t be undone. You can always create a new account later.</li>
      </ul>
    </LegalSection>
  );

  if (done) {
    return (
      <LegalPage title="Your account has been deleted" updated="19 September 2026">
        <LegalSection title="Done">
          <p>Your account and personal information have been removed, and you&apos;ve been signed out on this
            device. Thanks for using {brand.name}.</p>
          <p><Link href="/" className="font-medium text-primary underline">Back to the home page</Link></p>
        </LegalSection>
      </LegalPage>
    );
  }

  return (
    <LegalPage
      title="Delete your account"
      updated="19 September 2026"
      intro={<p>You can permanently delete your {brand.name} account and the personal information linked to it.</p>}
    >
      {whatHappens}

      {session === undefined ? (
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      ) : session === null ? (
        <LegalSection title="How to delete it">
          <ol className="ml-5 flex list-decimal flex-col gap-1.5">
            <li>
              <Link href="/login?next=/delete-account" className="font-medium text-primary underline">Sign in</Link>{" "}
              with the account you want to delete.
            </li>
            <li>Come back to this page, type DELETE, and confirm.</li>
          </ol>
          <p>Can&apos;t sign in any more? Email{" "}
            <a href={`mailto:${brand.supportEmail}?subject=Delete%20my%20account`} className="font-medium text-primary underline">
              {brand.supportEmail}</a>{" "}
            from the email address or with the phone number on the account, and we&apos;ll delete it within 30 days.</p>
        </LegalSection>
      ) : session.role !== "CUSTOMER" ? (
        <LegalSection title="This is a business account">
          <p>Shop, staff and admin accounts are closed through support, so any payouts owed can be settled first.
            Email{" "}
            <a href={`mailto:${brand.supportEmail}?subject=Close%20my%20business%20account`} className="font-medium text-primary underline">
              {brand.supportEmail}</a>{" "}
            and we&apos;ll take it from there.</p>
        </LegalSection>
      ) : (
        <section className="rounded-2xl border border-error/30 bg-error/5 p-5">
          <h2 className="text-lg font-semibold">Delete {session.name}&apos;s account</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            If you have an order in progress, wait until it&apos;s collected or cancel it first.
          </p>
          <Label htmlFor="confirm" className="mt-4 block">Type DELETE to confirm</Label>
          <Input
            id="confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            className="mt-1"
          />
          {error && <p className="mt-3 text-sm text-error">{error}</p>}
          <Button
            variant="danger"
            className="mt-4 w-full"
            disabled={deleting || confirmText.trim() !== "DELETE"}
            onClick={deleteAccount}
          >
            {deleting ? "Deleting your account..." : "Permanently delete my account"}
          </Button>
        </section>
      )}
    </LegalPage>
  );
}

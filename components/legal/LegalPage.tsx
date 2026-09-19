import Link from "next/link";

/** Shared shell for /privacy, /terms and /delete-account — one readable measure and type
 * scale, since these are the pages people (and app-store reviewers) actually read line by
 * line. */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // pb-40: the last controls — including the delete button — must always scroll clear
    // of the floating cart bar and bottom nav on mobile.
    <main className="mx-auto max-w-2xl px-5 pb-40 pt-8 sm:pb-16">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Local Food Hub</p>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated {updated}</p>
      {intro && <div className="mt-5 text-[15px] leading-relaxed text-muted-foreground">{intro}</div>}
      <div className="mt-8 flex flex-col gap-8">{children}</div>
      <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-5 text-sm">
        <Link href="/privacy" className="font-medium text-primary">Privacy Policy</Link>
        <Link href="/terms" className="font-medium text-primary">Terms of Service</Link>
        <Link href="/delete-account" className="font-medium text-primary">Delete your account</Link>
      </nav>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 text-lg font-semibold">{title}</h2>
      <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-foreground/85 [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        {children}
      </div>
    </section>
  );
}

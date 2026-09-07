"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Logo } from "@/components/brand/Logo";

const EMPTY = {
  shopName: "",
  ownerName: "",
  email: "",
  password: "",
  phone: "",
  address: "",
  category: "",
  description: "",
};

export default function VendorApplyPage() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vendor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit application");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit application");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <h1 className="text-lg font-semibold">Application submitted!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Our team will review {form.shopName} and get back to you shortly. You can sign
          in already — your dashboard will unlock once your shop is approved.
        </p>
        <Button className="mt-5" onClick={() => router.push("/login")}>
          Go to sign in
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6 flex justify-center">
        <Logo />
      </div>
      <h1 className="text-center text-xl font-bold">Bring your local food business online</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        Get discovered, receive online orders, accept dine-in orders, create QR menus,
        manage tables, and track sales.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Field label="Shop name" value={form.shopName} onChange={(v) => set("shopName", v)} />
        <Field label="Your name" value={form.ownerName} onChange={(v) => set("ownerName", v)} />
        <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} />
        <Field label="Password" type="password" value={form.password} onChange={(v) => set("password", v)} />
        <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
        <Field label="Address" value={form.address} onChange={(v) => set("address", v)} />
        <Field label="Category (e.g. Bakery, Street food)" value={form.category} onChange={(v) => set("category", v)} />
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <Button type="submit" disabled={loading} size="lg">
          {loading ? "Submitting..." : "Join the marketplace"}
        </Button>
      </form>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} required />
    </div>
  );
}

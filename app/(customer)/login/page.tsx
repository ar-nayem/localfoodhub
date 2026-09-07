"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Logo } from "@/components/brand/Logo";
import { toast } from "@/components/ui/Toast";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      toast("Welcome back!", "success");
      const next = params.get("next");
      if (next) router.push(next);
      else if (data.role === "SHOP_OWNER" || data.role === "SHOP_STAFF" || data.role === "KITCHEN_STAFF")
        router.push("/vendor");
      else if (data.role === "ADMIN" || data.role === "SUPER_ADMIN") router.push("/admin");
      else router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center text-lg font-semibold">Sign in</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Customers, shop owners, and staff all sign in here.
        </p>

        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-4"
        />
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-4"
        />

        {error && <p className="mb-3 text-sm text-error">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in..." : "Sign in"}
        </Button>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          New here? <Link href="/register" className="font-medium text-primary">Create an account</Link>
        </p>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Own a local food business?{" "}
          <Link href="/apply" className="font-medium text-primary">
            Join the marketplace
          </Link>
        </p>
      </form>
    </main>
  );
}

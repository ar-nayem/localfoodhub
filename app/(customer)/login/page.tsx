"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Logo } from "@/components/brand/Logo";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { GoogleSignInButton } from "@/components/customer/GoogleSignInButton";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

type Method = "OTP" | "PASSWORD";

// The Google callback can only hand information back through the URL, since it arrives as
// a browser redirect rather than a fetch.
const OAUTH_ERRORS: Record<string, string> = {
  google_unavailable: "Google sign-in isn't set up yet. Use a code or password instead.",
  google_denied: "Google sign-in was cancelled.",
  google_state: "That sign-in link expired. Please try again.",
  google_failed: "Google sign-in didn't complete. Please try again.",
  google_unverified: "That Google account's email isn't verified.",
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [method, setMethod] = useState<Method>("OTP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(OAUTH_ERRORS[params.get("error") ?? ""] ?? null);

  // Password sign-in
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // OTP sign-in
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sentTo, setSentTo] = useState<{ channel: string; destination: string } | null>(null);

  function routeAfterLogin(role: string) {
    const next = params.get("next");
    if (next) router.push(next);
    else if (role === "SHOP_OWNER" || role === "SHOP_STAFF" || role === "KITCHEN_STAFF") router.push("/vendor");
    else if (role === "ADMIN" || role === "SUPER_ADMIN") router.push("/admin");
    else router.push("/");
    router.refresh();
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
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
      routeAfterLogin(data.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send a code");
      setSentTo({ channel: data.channel, destination: data.destination });
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, code, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not verify that code");
      toast("Signed in!", "success");
      routeAfterLogin(data.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify that code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center text-lg font-semibold">Sign in</h1>
        <p className="mb-5 text-center text-sm text-muted-foreground">
          Customers, shop owners, and staff all sign in here.
        </p>

        <GoogleSignInButton next={params.get("next")} />

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="mb-5 flex rounded-full border border-border p-0.5">
          {(["OTP", "PASSWORD"] as Method[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMethod(m);
                setError(null);
              }}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-sm font-semibold",
                method === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {m === "OTP" ? "Email or phone" : "Password"}
            </button>
          ))}
        </div>

        {method === "PASSWORD" ? (
          <form onSubmit={handlePasswordSubmit}>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mb-4" />
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
          </form>
        ) : !codeSent ? (
          <form onSubmit={requestCode}>
            <Label htmlFor="identifier">Email address or phone number</Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or 01711234567"
              required
              className="mb-4"
            />
            {error && <p className="mb-3 text-sm text-error">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending code..." : "Send me a code"}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              No account yet? Signing in with a code creates one.
            </p>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <p className="mb-4 rounded-xl bg-muted px-3.5 py-3 text-sm text-muted-foreground">
              We sent a 6-digit code to <span className="font-semibold text-foreground">{sentTo?.destination}</span>.
              It expires in 5 minutes.
            </p>

            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              required
              className="mb-4 tracking-[0.4em]"
            />

            <Label htmlFor="name">Your name (new accounts only)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
              className="mb-4"
            />

            {error && <p className="mb-3 text-sm text-error">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Verifying..." : "Verify and sign in"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setCodeSent(false);
                setCode("");
                setError(null);
              }}
              className="mt-3 w-full text-center text-sm font-medium text-primary"
            >
              Use a different email or phone
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          New here? <Link href="/register" className="font-medium text-primary">Create an account</Link>
        </p>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Own a local food business?{" "}
          <Link href="/apply" className="font-medium text-primary">
            Join the marketplace
          </Link>
        </p>
      </div>
    </main>
  );
}

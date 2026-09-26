"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Logo } from "@/components/brand/Logo";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type Method = "PASSWORD" | "OTP";

/** Only ever follow a same-site path — `next` comes from the URL, and pushing an arbitrary
 * one would turn this page into an open redirect. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/vendor";
}

/**
 * Sign-in for the Business app. Shop accounts only: every request carries `app: "business"`,
 * which makes the auth APIs refuse customer accounts and refuse to create new ones.
 * (Google sign-in is left out on purpose — its OAuth callback lives on the customer
 * hostname, so a Business-host session could not survive the round trip.)
 */
export function BusinessLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [method, setMethod] = useState<Method>("PASSWORD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function post(url: string, body: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, app: "business" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  }

  async function run(action: () => Promise<void>) {
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function signedIn() {
    toast("Welcome back!", "success");
    router.push(safeNext(params.get("next")));
    router.refresh();
  }

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    return run(async () => {
      await post("/api/auth/login", { email, password });
      signedIn();
    });
  };

  const requestCode = (e: React.FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const data = await post("/api/auth/otp/request", { identifier });
      setSentTo(data.destination);
      setCodeSent(true);
    });
  };

  const verifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    return run(async () => {
      await post("/api/auth/otp/verify", { identifier, code });
      signedIn();
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo variant="business" />
        </div>
        <h1 className="text-center text-lg font-semibold">Sign in to your shop</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          For shop owners and their staff — manage orders, your menu and QR codes.
        </p>

        <div className="mb-5 flex rounded-full border border-border p-0.5">
          {(["PASSWORD", "OTP"] as Method[]).map((m) => (
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
              {m === "PASSWORD" ? "Password" : "Email or phone code"}
            </button>
          ))}
        </div>

        {method === "PASSWORD" ? (
          <form onSubmit={submitPassword}>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mb-4"
            />
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
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
            <Label htmlFor="identifier">Shop email or phone number</Label>
            <Input
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="shop@example.com or 01711234567"
              required
              className="mb-4"
            />
            {error && <p className="mb-3 text-sm text-error">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending code..." : "Send me a code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode}>
            <p className="mb-4 rounded-xl bg-muted px-3.5 py-3 text-sm text-muted-foreground">
              We sent a 6-digit code to <span className="font-semibold text-foreground">{sentTo}</span>. It expires in
              5 minutes.
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

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Own a food business?{" "}
          <Link href="/vendor/apply" className="font-medium text-primary">
            Join the marketplace
          </Link>
        </p>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

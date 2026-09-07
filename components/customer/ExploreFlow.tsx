"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, formatMoney } from "@/lib/utils";
import { PRICE_BUCKETS, MOOD_TAGS, isOrderTypeActive } from "@/lib/constants";
import { useCartStore } from "@/lib/cart/store";
import { ExploreResultCard, type Recommendation } from "./ExploreResultCard";

const PEOPLE_OPTIONS = [
  { key: 1, label: "Just me", icon: "👤" },
  { key: 2, label: "2 people", icon: "👥" },
  { key: 4, label: "3–4 people", icon: "👥" },
  { key: 6, label: "5+ people", icon: "👨‍👩‍👧‍👦" },
];

const MODE_OPTIONS = [
  // Delivery is hidden while FEATURES.delivery is off.
  { key: "delivery", label: "Delivery", sub: "I'll eat at home", icon: "🚴", orderType: "DELIVERY" },
  { key: "pickup", label: "Pickup", sub: "I'll collect it", icon: "🥡" },
  { key: "dine-in", label: "Dine-in", sub: "I'm already out", icon: "🍽️" },
].filter((m) => isOrderTypeActive((m as { orderType?: string }).orderType ?? ""));

const MOOD_ICON: Record<string, string> = {
  spicy: "🌶️",
  sweet: "🍰",
  healthy: "🥗",
  vegetarian: "🥕",
  halal: "🕌",
  dessert: "🍨",
  drinks: "🥤",
};

type Step = "location" | "budget" | "people" | "mood" | "mode" | "summary" | "loading" | "result" | "empty";

interface Answers {
  locationId: string | null;
  budgetKey: string | null;
  people: number;
  moods: string[];
  mode: "delivery" | "pickup" | "dine-in" | null;
}

export function ExploreFlow({
  locations,
  presetLocationId,
  presetMode,
}: {
  locations: { id: string; name: string }[];
  presetLocationId?: string;
  presetMode?: "delivery" | "pickup" | "dine-in";
}) {
  const router = useRouter();
  const setDiscoveryPick = useCartStore((s) => s.setDiscoveryPick);
  const [answers, setAnswers] = useState<Answers>({
    locationId: presetLocationId ?? null,
    budgetKey: null,
    people: 2,
    moods: [],
    mode: presetMode ?? null,
  });
  const [shownIds, setShownIds] = useState<string[]>([]);
  const [current, setCurrent] = useState<Recommendation | null>(null);
  const [emptyReason, setEmptyReason] = useState<"no_matches" | "exhausted" | null>(null);

  const steps = useMemo(() => {
    const s: Step[] = [];
    if (!presetLocationId && locations.length > 1) s.push("location");
    s.push("budget", "people", "mood");
    if (!presetMode) s.push("mode");
    s.push("summary");
    return s;
  }, [presetLocationId, presetMode, locations.length]);

  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<"quiz" | "loading" | "result" | "empty">("quiz");
  const step = steps[stepIndex];

  function goNext() {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
  }
  function goBack() {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  async function fetchRecommendation(exclude: string[]) {
    setPhase("loading");
    const params = new URLSearchParams();
    if (answers.budgetKey) params.set("budget", answers.budgetKey);
    if (answers.mode) params.set("mode", answers.mode);
    if (answers.locationId) params.set("location", answers.locationId);
    if (answers.moods.length) params.set("moods", answers.moods.join(","));
    if (exclude.length) params.set("exclude", exclude.join(","));

    await new Promise((r) => setTimeout(r, 500)); // brief "finding something..." beat, not a fake long load
    const res = await fetch(`/api/discover?${params.toString()}`);
    const data = await res.json();

    if (data.empty) {
      setEmptyReason(data.reason);
      setPhase("empty");
      return;
    }
    setCurrent({ product: data.product, shop: data.shop, whyPicked: data.whyPicked });
    setShownIds(exclude.concat(data.product.id));
    setPhase("result");
  }

  function handlePass() {
    fetchRecommendation(shownIds);
  }

  async function handleChoose() {
    if (!current) return;
    await fetch("/api/discover/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: current.product.id, shopId: current.shop.id, action: "CLICKED" }),
    }).catch(() => undefined);
    setDiscoveryPick({ productId: current.product.id, shopId: current.shop.id });
    router.push(`/s/${current.shop.slug}/product/${current.product.id}`);
  }

  function startOver() {
    setAnswers({ locationId: presetLocationId ?? null, budgetKey: null, people: 2, moods: [], mode: presetMode ?? null });
    setShownIds([]);
    setCurrent(null);
    setStepIndex(0);
    setPhase("quiz");
  }

  function changePreferences() {
    setPhase("quiz");
    setStepIndex(0);
    setShownIds([]);
  }

  if (phase === "loading") {
    return <LoadingBeat />;
  }

  if (phase === "empty") {
    return (
      <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col items-center justify-center px-6 text-center">
        <Sparkles size={28} className="mb-3 text-muted-foreground" />
        <h1 className="text-lg font-semibold">
          {emptyReason === "exhausted"
            ? "Looks like we've shown you everything nearby."
            : "We couldn't find many matches nearby."}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Try loosening a preference.</p>
        <div className="mt-5 flex w-full flex-col gap-2">
          <Button onClick={changePreferences} className="w-full">
            Change preferences
          </Button>
          <Button onClick={() => router.push("/explore")} variant="outline" className="w-full">
            Browse all food
          </Button>
          <Button onClick={startOver} variant="ghost" className="w-full">
            Start over
          </Button>
        </div>
      </main>
    );
  }

  if (phase === "result" && current) {
    return (
      <ExploreResultCard
        recommendation={current}
        people={answers.people}
        onChoose={handleChoose}
        onPass={handlePass}
        onChangePreferences={changePreferences}
      />
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-10 pt-6">
      <div className="mb-5 flex items-center gap-3">
        {stepIndex > 0 && (
          <button onClick={goBack} className="text-muted-foreground" aria-label="Back">
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="flex flex-1 gap-1.5">
          {steps.map((s, i) => (
            <span
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i <= stepIndex ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
      </div>

      {step === "location" && (
        <QuizStep title="Where should we explore?">
          <OptionGrid
            options={[{ key: "", label: "Any area", icon: "📍" }, ...locations.map((l) => ({ key: l.id, label: l.name, icon: "📍" }))]}
            selected={[answers.locationId ?? ""]}
            onSelect={(key) => {
              setAnswers((a) => ({ ...a, locationId: key || null }));
              goNext();
            }}
          />
        </QuizStep>
      )}

      {step === "budget" && (
        <QuizStep title="What's your budget?">
          <OptionGrid
            options={[
              { key: "", label: "Any budget", sub: "", icon: "💫" },
              ...PRICE_BUCKETS.map((b) => ({
                key: b.key,
                label: b.label,
                sub: b.min && b.max ? `${formatMoney(b.min)}–${formatMoney(b.max)}` : b.max ? `Under ${formatMoney(b.max)}` : `${formatMoney(b.min!)}+`,
                icon: b.key === "budget" ? "💰" : b.key === "mid" ? "💰💰" : "💎",
              })),
            ]}
            selected={[answers.budgetKey ?? ""]}
            onSelect={(key) => {
              setAnswers((a) => ({ ...a, budgetKey: key || null }));
              goNext();
            }}
          />
        </QuizStep>
      )}

      {step === "people" && (
        <QuizStep title="How many people are eating?">
          <OptionGrid
            options={PEOPLE_OPTIONS.map((p) => ({ key: String(p.key), label: p.label, icon: p.icon }))}
            selected={[String(answers.people)]}
            onSelect={(key) => {
              setAnswers((a) => ({ ...a, people: Number(key) }));
              goNext();
            }}
          />
        </QuizStep>
      )}

      {step === "mood" && (
        <QuizStep title="What are you feeling like?" subtitle="Pick as many as you like, or skip.">
          <div className="flex flex-wrap gap-2">
            {MOOD_TAGS.map((m) => {
              const active = answers.moods.includes(m);
              return (
                <button
                  key={m}
                  onClick={() =>
                    setAnswers((a) => ({
                      ...a,
                      moods: active ? a.moods.filter((x) => x !== m) : [...a.moods, m],
                    }))
                  }
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium capitalize",
                    active ? "border-primary bg-primary/10 text-primary" : "border-border"
                  )}
                >
                  {MOOD_ICON[m]} {m}
                </button>
              );
            })}
          </div>
          <Button onClick={goNext} className="mt-6 w-full">
            {answers.moods.length > 0 ? "Continue" : "Anything is fine"}
          </Button>
        </QuizStep>
      )}

      {step === "mode" && (
        <QuizStep title="How do you want to enjoy it?">
          <OptionGrid
            options={MODE_OPTIONS.map((m) => ({ key: m.key, label: m.label, sub: m.sub, icon: m.icon }))}
            selected={[answers.mode ?? ""]}
            onSelect={(key) => {
              setAnswers((a) => ({ ...a, mode: key as Answers["mode"] }));
              goNext();
            }}
          />
        </QuizStep>
      )}

      {step === "summary" && (
        <QuizStep title="Your Explore">
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
            {answers.locationId && (
              <SummaryRow icon="📍" text={locations.find((l) => l.id === answers.locationId)?.name ?? "Selected area"} />
            )}
            <SummaryRow icon="👥" text={PEOPLE_OPTIONS.find((p) => p.key === answers.people)?.label ?? `${answers.people} people`} />
            <SummaryRow
              icon="💰"
              text={answers.budgetKey ? `Around ${PRICE_BUCKETS.find((b) => b.key === answers.budgetKey)?.label}` : "Any budget"}
            />
            {answers.moods.length > 0 && <SummaryRow icon="🍽️" text={answers.moods.join(", ")} />}
            {answers.mode && <SummaryRow icon={MODE_OPTIONS.find((m) => m.key === answers.mode)?.icon ?? "🍽️"} text={MODE_OPTIONS.find((m) => m.key === answers.mode)?.label ?? ""} />}
          </div>
          <Button onClick={() => fetchRecommendation([])} className="mt-6 w-full" size="lg">
            <Sparkles size={16} /> Explore Now
          </Button>
        </QuizStep>
      )}
    </main>
  );
}

function LoadingBeat() {
  const messages = ["Checking what's cooking nearby...", "Finding something that fits...", "Picking a local favorite..."];
  const [msg] = useState(() => messages[Math.floor(Math.random() * messages.length)]);
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm font-medium text-muted-foreground">{msg}</p>
    </main>
  );
}

function QuizStep({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="animate-slide-up">
      <h1 className="text-xl font-bold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function OptionGrid({
  options,
  selected,
  onSelect,
}: {
  options: { key: string; label: string; sub?: string; icon: string }[];
  selected: string[];
  onSelect: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => (
        <button
          key={opt.key || "any"}
          onClick={() => onSelect(opt.key)}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-5 text-center transition-transform active:scale-[0.97]",
            selected.includes(opt.key) ? "border-primary bg-primary/10" : "border-border bg-surface"
          )}
        >
          <span className="text-2xl">{opt.icon}</span>
          <span className="font-medium">{opt.label}</span>
          {opt.sub && <span className="text-xs text-muted-foreground">{opt.sub}</span>}
        </button>
      ))}
    </div>
  );
}

function SummaryRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

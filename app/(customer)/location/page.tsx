"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Navigation, MapPin, Star, Loader2, Plus, Search } from "lucide-react";
import { useGeolocation } from "@/lib/location/useGeolocation";
import { isGoogleMapsConfigured } from "@/lib/maps/loadGoogleMaps";
import { reverseGeocode } from "@/lib/maps/geocode";
import { PlaceAutocompleteInput } from "@/components/shared/PlaceAutocompleteInput";
import { AddressMapPicker, type SavedAddress } from "@/components/shared/AddressMapPicker";
import { cn, maskPhone } from "@/lib/utils";
import { toast } from "@/components/ui/Toast";
import type { PlaceResult } from "@/lib/maps/types";

const LABEL_STYLES: Record<string, string> = {
  Home: "bg-primary/10 text-primary",
  Work: "bg-info/10 text-info",
  School: "bg-warning/10 text-warning",
};

export default function LocationPage() {
  return (
    <Suspense fallback={null}>
      <LocationPageContent />
    </Suspense>
  );
}

/**
 * The one full-page destination for "where am I / where do I want to explore" — replaces
 * the old small bottom-sheet picker everywhere it was triggered from (the header pill,
 * Explore's "search another area"), per the Meituan reference: tapping location takes you
 * somewhere with real room for current-location tracking, saved addresses, and adding a
 * new one, not a cramped sheet.
 */
function LocationPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("returnTo") || "/";
  const { coords, status, refresh, setManual } = useGeolocation();
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [session, setSession] = useState<{ userId: string } | null | undefined>(undefined);
  const [addresses, setAddresses] = useState<SavedAddress[] | null>(null);
  const [adding, setAdding] = useState(false);
  const googleReady = isGoogleMapsConfigured();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setSession(d.session ? { userId: d.session.userId } : null));
  }, []);

  useEffect(() => {
    if (session) {
      fetch("/api/account/locations")
        .then((r) => (r.ok ? r.json() : []))
        .then(setAddresses);
    }
  }, [session]);

  useEffect(() => {
    if (!coords || !googleReady) return;
    let cancelled = false;
    setResolving(true);
    reverseGeocode(coords.lat, coords.lng)
      .then((place) => {
        if (!cancelled && place) setCurrentLabel(place.formattedAddress);
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coords, googleReady]);

  function useHere() {
    refresh();
    router.push(returnTo);
  }

  function pickPlace(place: PlaceResult) {
    setManual({ lat: place.lat, lng: place.lng });
    router.push(returnTo);
  }

  function selectSaved(addr: SavedAddress) {
    if (addr.latitude != null && addr.longitude != null) {
      setManual({ lat: addr.latitude, lng: addr.longitude });
    }
    router.push(returnTo);
  }

  async function setDefault(addr: SavedAddress, e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(`/api/account/locations/${addr.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: addr.label,
        line1: addr.line1,
        line2: addr.line2 ?? undefined,
        city: addr.city,
        notes: addr.notes ?? undefined,
        latitude: addr.latitude ?? undefined,
        longitude: addr.longitude ?? undefined,
        placeId: addr.placeId ?? undefined,
        recipientName: addr.recipientName ?? undefined,
        recipientPhone: addr.recipientPhone ?? undefined,
        isDefault: true,
      }),
    });
    if (res.ok) {
      setAddresses((prev) => prev?.map((a) => ({ ...a, isDefault: a.id === addr.id })) ?? null);
    } else {
      toast("Could not set default address", "error");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-surface px-3 py-3">
        <button
          onClick={() => router.push(returnTo)}
          aria-label="Back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-muted"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-semibold">Choose your location</h1>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4">
        {googleReady && (
          <div className="relative mb-4">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <PlaceAutocompleteInput
              placeholder="Search any city, area, or address..."
              onSelect={pickPlace}
              className="h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        )}

        <button
          onClick={useHere}
          className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-left"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {status === "locating" || resolving ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-primary">Use my current location</span>
            <span className="block truncate text-xs text-muted-foreground">
              {status === "locating"
                ? "Detecting..."
                : status === "denied"
                  ? "Location access denied — search or pick an address instead"
                  : resolving
                    ? "Locating..."
                    : currentLabel ?? (coords ? "Tap to use this location" : "Tap to detect automatically")}
            </span>
          </span>
        </button>

        {session === undefined ? null : session === null ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Sign in to save and reuse addresses.
          </p>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">SAVED ADDRESSES</p>
              <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs font-semibold text-primary">
                <Plus size={13} /> Add new
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {addresses?.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => selectSaved(addr)}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 text-left"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MapPin size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 flex flex-wrap items-center gap-1.5">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", LABEL_STYLES[addr.label] ?? "bg-muted text-muted-foreground")}>
                        {addr.label}
                      </span>
                      {addr.recipientName && <span className="text-xs font-medium">{addr.recipientName}</span>}
                      {addr.recipientPhone && <span className="text-xs text-muted-foreground">{maskPhone(addr.recipientPhone)}</span>}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {addr.line1}
                      {addr.line2 ? ` — ${addr.line2}` : ""}
                    </span>
                  </span>
                  <span
                    onClick={(e) => setDefault(addr, e)}
                    role="button"
                    aria-label={addr.isDefault ? "Default address" : "Set as default"}
                    className="shrink-0 pt-1"
                  >
                    <Star size={17} className={addr.isDefault ? "fill-warning text-warning" : "text-border"} />
                  </span>
                </button>
              ))}
              {addresses && addresses.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No saved addresses yet.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {adding && (
        <AddressMapPicker
          onClose={() => setAdding(false)}
          onSaved={(saved) => {
            setAddresses((prev) => (prev ? [saved, ...prev] : [saved]));
            setAdding(false);
            selectSaved(saved);
          }}
        />
      )}
    </div>
  );
}

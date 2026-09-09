"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Search, Navigation, MapPin, Loader2 } from "lucide-react";
import { loadGoogleMaps } from "@/lib/maps/loadGoogleMaps";
import { reverseGeocode } from "@/lib/maps/geocode";
import { splitCityFromAddress, type PlaceResult } from "@/lib/maps/types";
import { PlaceAutocompleteInput } from "./PlaceAutocompleteInput";
import { Input, Label } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export interface SavedAddress {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  isDefault: boolean;
}

const LABEL_OPTIONS = ["Home", "Work", "School", "Other"];

/**
 * Full-screen "drag the map, pin stays centered" address picker — the pattern every
 * Chinese delivery app (Meituan, Ele.me, ...) uses, and the one the user asked this to
 * match directly. Deliberately not a bottom-sheet-with-a-draggable-marker like the
 * vendor/shop picker: dragging the whole map under a fixed pin is what actually reads as
 * precise on a touchscreen, versus asking someone to land a fingertip exactly on a small
 * marker glyph.
 */
export function AddressMapPicker({
  existing,
  onClose,
  onSaved,
}: {
  existing?: SavedAddress | null;
  onClose: () => void;
  onSaved: (address: SavedAddress) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const skipNextIdleRef = useRef(false);

  const [place, setPlace] = useState<PlaceResult | null>(
    existing?.latitude != null && existing?.longitude != null
      ? {
          name: existing.line1,
          formattedAddress: existing.line1,
          lat: existing.latitude,
          lng: existing.longitude,
          placeId: existing.placeId,
        }
      : null
  );
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [line2, setLine2] = useState(existing?.line2 ?? "");
  const [recipientName, setRecipientName] = useState(existing?.recipientName ?? "");
  const [recipientPhone, setRecipientPhone] = useState(existing?.recipientPhone ?? "");
  const [label, setLabel] = useState(existing?.label ?? "Home");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((g) => {
        if (cancelled || !mapContainerRef.current || mapRef.current) return;
        const start = place ? { lat: place.lat, lng: place.lng } : { lat: 23.7808, lng: 90.4067 };
        const map = new g.maps.Map(mapContainerRef.current, {
          center: start,
          zoom: place ? 16 : 13,
          disableDefaultUI: true,
          gestureHandling: "greedy",
        });
        mapRef.current = map;
        // Fires after every drag/zoom/programmatic recenter settles — the one signal we
        // need, whatever caused the center to move.
        map.addListener("idle", async () => {
          if (skipNextIdleRef.current) {
            skipNextIdleRef.current = false;
            return;
          }
          const center = map.getCenter();
          if (!center) return;
          setResolving(true);
          const resolved = await reverseGeocode(center.lat(), center.lng());
          setResolving(false);
          if (resolved) setPlace(resolved);
        });
      })
      .catch(() => setLoadError(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function jumpTo(p: PlaceResult) {
    setPlace(p);
    // The programmatic recenter below also fires `idle`, which would otherwise trigger a
    // redundant reverse-geocode of coordinates we already have a full PlaceResult for.
    skipNextIdleRef.current = true;
    mapRef.current?.setCenter({ lat: p.lat, lng: p.lng });
    mapRef.current?.setZoom(16);
  }

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const resolved = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          if (resolved) jumpTo(resolved);
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  async function save() {
    if (!place) {
      toast("Pick a location on the map first.", "error");
      return;
    }
    setSaving(true);
    try {
      const body = {
        label,
        line1: place.formattedAddress,
        line2: line2 || undefined,
        city: splitCityFromAddress(place.formattedAddress),
        latitude: place.lat,
        longitude: place.lng,
        placeId: place.placeId ?? undefined,
        recipientName: recipientName || undefined,
        recipientPhone: recipientPhone || undefined,
      };
      const res = existing
        ? await fetch(`/api/account/locations/${existing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/account/locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save this address");
      onSaved(data);
      toast(existing ? "Address updated" : "Address saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save this address", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-3">
        <button
          onClick={onClose}
          aria-label="Back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-muted"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-semibold">{existing ? "Edit address" : "Add new address"}</h1>
      </div>

      {loadError ? (
        <p className="flex-1 p-8 text-center text-sm text-muted-foreground">
          Couldn&apos;t load the map right now. Please try again in a moment.
        </p>
      ) : (
        <>
          <div className="border-b border-border bg-surface px-3 pb-3">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <PlaceAutocompleteInput
                placeholder="Search for a place..."
                onSelect={jumpTo}
                className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="relative flex-1">
            <div ref={mapContainerRef} className="h-full w-full" />

            {/* Fixed center pin — the map moves underneath it. Tip lands exactly on the
                real target point; the small dot below it marks that point on the ground. */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
              <MapPin size={38} className="fill-primary text-primary-foreground drop-shadow-md" strokeWidth={1.25} />
            </div>
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 translate-y-1 rounded-full bg-foreground/25" />

            {(place || resolving) && (
              <div className="pointer-events-none absolute left-1/2 top-3 w-max max-w-[85%] -translate-x-1/2 rounded-xl bg-surface px-3.5 py-2 text-xs font-medium shadow-lg">
                {resolving ? "Locating..." : place?.formattedAddress}
              </div>
            )}

            <button
              onClick={useCurrentLocation}
              disabled={locating}
              aria-label="Use my current location"
              className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-primary shadow-lg disabled:opacity-50"
            >
              {locating ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
            </button>
          </div>

          <div className="flex max-h-[45vh] flex-col gap-3 overflow-y-auto border-t border-border bg-surface p-4">
            <div>
              <Label>House / unit / floor (optional)</Label>
              <Input value={line2} onChange={(e) => setLine2(e.target.value)} placeholder="e.g. Building 17, Room 803" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact name</Label>
                <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Label</Label>
              <div className="flex gap-2">
                {LABEL_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setLabel(opt)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm font-medium",
                      label === opt ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={save}
              disabled={saving || !place}
              className="mt-1 w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save address"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

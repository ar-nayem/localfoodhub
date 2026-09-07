"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";

interface LocationRow {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  _count: { shops: number };
}

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/locations");
    if (res.ok) setLocations(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Could not create location", "error");
      return;
    }
    setName("");
    setDescription("");
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Locations</h1>

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-surface p-4">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Riverside Food Court" className="w-56" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={1} />
        </div>
        <Button onClick={create} disabled={saving}>
          Add location
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {locations.map((loc) => (
          <div key={loc.id} className="rounded-2xl border border-border bg-surface p-4">
            <p className="font-semibold">{loc.name}</p>
            {loc.description && <p className="text-sm text-muted-foreground">{loc.description}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{loc._count.shops} shops</p>
          </div>
        ))}
        {locations.length === 0 && <p className="text-muted-foreground">No locations yet.</p>}
      </div>
    </div>
  );
}

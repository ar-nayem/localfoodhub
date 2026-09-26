"use client";

import { useEffect, useState } from "react";
import { useVendorShop } from "@/lib/vendor/useVendorShop";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";

interface StaffRow {
  id: string;
  role: string;
  user: { name: string; email: string };
}

export default function VendorStaffPage() {
  const { shop } = useVendorShop();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [form, setForm] = useState({ name: "", email: "", role: "SHOP_STAFF" });
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!shop) return;
    const res = await fetch(`/api/vendor/staff?shopId=${shop.id}`);
    if (res.ok) setStaff(await res.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  async function invite() {
    if (!shop || !form.name || !form.email) return;
    setSaving(true);
    const res = await fetch("/api/vendor/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: shop.id, ...form }),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Could not add staff", "error");
      return;
    }
    setForm({ name: "", email: "", role: "SHOP_STAFF" });
    toast("Staff member added", "success");
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Staff</h1>

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-surface p-4">
        <div>
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-40" />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-52" />
        </div>
        <div>
          <Label>Role</Label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="h-11 rounded-xl border border-border bg-surface px-3 text-sm"
          >
            <option value="SHOP_STAFF">Shop staff</option>
            <option value="KITCHEN_STAFF">Kitchen staff</option>
          </select>
        </div>
        <Button onClick={invite} disabled={saving}>
          {saving ? "Adding..." : "Add staff"}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {staff.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5">
            <div>
              <p className="font-medium">{s.user.name}</p>
              <p className="text-sm text-muted-foreground">{s.user.email}</p>
            </div>
            <Badge tone="primary">{s.role.replace("_", " ")}</Badge>
          </div>
        ))}
        {staff.length === 0 && <p className="text-muted-foreground">No staff added yet.</p>}
      </div>
    </div>
  );
}

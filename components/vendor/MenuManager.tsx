"use client";

import { useEffect, useState } from "react";
import { useVendorShop } from "@/lib/vendor/useVendorShop";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { toast } from "@/components/ui/Toast";

interface Category {
  id: string;
  name: string;
}
interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  discountPrice: number | null;
  imageUrl: string | null;
  status: string;
  prepTimeMinutes: number;
}

const EMPTY_FORM = {
  id: undefined as string | undefined,
  categoryId: "",
  name: "",
  description: "",
  price: "",
  discountPrice: "",
  imageUrl: "",
  status: "AVAILABLE",
  prepTimeMinutes: "10",
};

// NOTE: option/add-on editing (e.g. Size, Extra cheese) isn't in this pass's vendor UI —
// the data model and customer-facing rendering both already support them (see
// prisma/schema.prisma ProductOption/ProductAddon and ProductDetail.tsx), seeded demo
// products show them working end-to-end; a dedicated editor here is a follow-up.
export function MenuManager() {
  const { shop } = useVendorShop();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [form, setForm] = useState<typeof EMPTY_FORM | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!shop) return;
    const [c, p] = await Promise.all([
      fetch(`/api/vendor/categories?shopId=${shop.id}`).then((r) => r.json()),
      fetch(`/api/vendor/products?shopId=${shop.id}`).then((r) => r.json()),
    ]);
    setCategories(c);
    setProducts(p);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  async function addCategory() {
    if (!newCategory.trim() || !shop) return;
    await fetch("/api/vendor/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId: shop.id, name: newCategory.trim() }),
    });
    setNewCategory("");
    load();
  }

  async function deleteCategory(id: string) {
    if (!confirm("Delete this category and its items?")) return;
    await fetch(`/api/vendor/categories/${id}`, { method: "DELETE" });
    load();
  }

  function openAdd(categoryId: string) {
    setForm({ ...EMPTY_FORM, categoryId });
  }
  function openEdit(p: Product) {
    setForm({
      id: p.id,
      categoryId: p.categoryId,
      name: p.name,
      description: p.description,
      price: String(p.price),
      discountPrice: p.discountPrice ? String(p.discountPrice) : "",
      imageUrl: p.imageUrl ?? "",
      status: p.status,
      prepTimeMinutes: String(p.prepTimeMinutes),
    });
  }

  async function save() {
    if (!form || !shop) return;
    setSaving(true);
    const payload = {
      shopId: shop.id,
      categoryId: form.categoryId,
      name: form.name,
      description: form.description,
      price: Number(form.price),
      discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
      imageUrl: form.imageUrl || undefined,
      status: form.status,
      prepTimeMinutes: Number(form.prepTimeMinutes),
      ingredients: [],
      allergens: [],
      dietaryTags: [],
    };
    const res = await fetch(form.id ? `/api/vendor/products/${form.id}` : "/api/vendor/products", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      toast("Could not save item", "error");
      return;
    }
    setForm(null);
    load();
  }

  async function toggleAvailable(p: Product) {
    const nextStatus = p.status === "AVAILABLE" ? "SOLD_OUT" : "AVAILABLE";
    await fetch(`/api/vendor/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    load();
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/vendor/products/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-5 flex gap-2">
        <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category name" />
        <Button variant="outline" onClick={addCategory}>
          Add category
        </Button>
      </div>

      {categories.map((cat) => {
        const items = products.filter((p) => p.categoryId === cat.id);
        return (
          <div key={cat.id} className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{cat.name}</h2>
              <div className="flex gap-3">
                <button onClick={() => openAdd(cat.id)} className="text-sm font-medium text-primary">
                  + Add item
                </button>
                <button onClick={() => deleteCategory(cat.id)} className="text-sm text-error">
                  Delete category
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatMoney(p.discountPrice ?? p.price)} · {p.prepTimeMinutes} min
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={p.status === "AVAILABLE"} onCheckedChange={() => toggleAvailable(p)} />
                    <button onClick={() => openEdit(p)} className="text-sm font-medium text-primary">
                      Edit
                    </button>
                    <button onClick={() => deleteProduct(p.id)} className="text-sm text-error">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}
            </div>
          </div>
        );
      })}
      {categories.length === 0 && <p className="text-muted-foreground">Add a category to start building your menu.</p>}

      {form && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-5">
            <h3 className="mb-3 font-semibold">{form.id ? "Edit item" : "Add item"}</h3>
            <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
              <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>Price</Label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="flex-1">
                  <Label>Discount price</Label>
                  <Input
                    type="number"
                    value={form.discountPrice}
                    onChange={(e) => setForm({ ...form, discountPrice: e.target.value })}
                  />
                </div>
              </div>
              <Input
                placeholder="Image URL (optional)"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>Status</Label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="SOLD_OUT">Sold out</option>
                    <option value="HIDDEN">Hidden</option>
                  </select>
                </div>
                <div className="flex-1">
                  <Label>Prep time (min)</Label>
                  <Input
                    type="number"
                    value={form.prepTimeMinutes}
                    onChange={(e) => setForm({ ...form, prepTimeMinutes: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

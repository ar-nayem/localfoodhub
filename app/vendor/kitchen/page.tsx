import { OrderBoard } from "@/components/vendor/OrderBoard";

export default function VendorKitchenPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Kitchen Display</h1>
      <OrderBoard large />
    </div>
  );
}

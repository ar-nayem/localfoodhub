import { OrderBoard } from "@/components/vendor/OrderBoard";

export default function VendorOrdersPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Orders</h1>
      <OrderBoard />
    </div>
  );
}

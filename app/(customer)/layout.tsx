import { CustomerChrome } from "@/components/customer/CustomerChrome";
import { CartHydrator } from "@/components/customer/CartHydrator";
import { CartConflictDialog } from "@/components/customer/CartConflictDialog";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CartHydrator />
      <CustomerChrome>{children}</CustomerChrome>
      <CartConflictDialog />
    </>
  );
}

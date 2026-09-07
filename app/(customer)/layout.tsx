import { CustomerChrome } from "@/components/customer/CustomerChrome";
import { CartHydrator } from "@/components/customer/CartHydrator";
import { CartConflictDialog } from "@/components/customer/CartConflictDialog";
import { CartBar } from "@/components/customer/CartBar";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CartHydrator />
      <CustomerChrome>{children}</CustomerChrome>
      <CartBar />
      <CartConflictDialog />
    </>
  );
}

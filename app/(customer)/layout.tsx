import { CustomerChrome } from "@/components/customer/CustomerChrome";
import { CartHydrator } from "@/components/customer/CartHydrator";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CartHydrator />
      <CustomerChrome>{children}</CustomerChrome>
    </>
  );
}

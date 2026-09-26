import { ApplyForm } from "@/components/vendor/ApplyForm";

// With a Business hostname configured, middleware sends /apply to the Business app's own
// /vendor/apply before this ever renders. This page is what serves it on a single-host setup.
export default function VendorApplyPage() {
  return <ApplyForm signInHref="/login" />;
}

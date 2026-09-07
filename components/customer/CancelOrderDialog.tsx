"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CANCELLATION_REASONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Confirmation step for customer-initiated cancellation. The server re-checks every
 * rule this dialog implies — this is only here so the action is deliberate, never the
 * thing that actually enforces the policy. */
export function CancelOrderDialog({
  onConfirm,
  onClose,
  submitting,
  error,
}: {
  onConfirm: (reason: string | null) => void;
  onClose: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const [reason, setReason] = useState<string>("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, submitting]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-order-title"
        className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-lg outline-none"
      >
        <h2 id="cancel-order-title" className="text-lg font-semibold">
          Cancel order?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The shop hasn&apos;t accepted your order yet. If you cancel now, any payment
          already taken will be refunded according to the payment policy.
        </p>

        <label htmlFor="cancel-reason" className="mt-4 block text-sm font-medium">
          Reason (optional)
        </label>
        <select
          id="cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
        >
          <option value="">Prefer not to say</option>
          {CANCELLATION_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {error && <p className="mt-3 text-sm text-error">{error}</p>}

        <div className="mt-5 flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting} className="flex-1">
            Keep Order
          </Button>
          <button
            onClick={() => onConfirm(reason || null)}
            disabled={submitting}
            className={cn(
              "flex-1 rounded-xl bg-error px-4 py-2.5 text-sm font-semibold text-white",
              submitting && "opacity-60"
            )}
          >
            {submitting ? "Cancelling..." : "Cancel Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

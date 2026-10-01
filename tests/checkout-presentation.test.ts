import assert from "node:assert/strict";
import test from "node:test";
import { checkoutJourneyFor } from "../lib/customer/checkoutPresentation";

test("pickup checkout explains the handoff journey without promising delivery tracking", () => {
  assert.deepEqual(
    checkoutJourneyFor("PICKUP").map((step) => step.label),
    ["Order confirmed", "Kitchen prepares it", "Ready for pickup"],
  );
});

test("delivery checkout keeps the final delivery-status step", () => {
  assert.equal(checkoutJourneyFor("DELIVERY").at(-1)?.label, "On the way");
});

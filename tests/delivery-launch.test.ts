import assert from "node:assert/strict";
import test from "node:test";
import { createOrderSchema } from "../lib/validation/schemas";

const order = {
  idempotencyKey: "8f269eea-dfa5-4a91-a77e-1742a599f81e",
  shopId: "shop",
  items: [{ productId: "food", quantity: 1 }],
};

test("new delivery submissions are rejected while pickup and dine-in remain available", () => {
  assert.equal(createOrderSchema.safeParse({ ...order, orderType: "DELIVERY" }).success, false);
  assert.equal(createOrderSchema.safeParse({ ...order, orderType: "PICKUP" }).success, true);
  assert.equal(createOrderSchema.safeParse({ ...order, orderType: "DINE_IN" }).success, true);
});

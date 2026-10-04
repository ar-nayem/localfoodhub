import assert from "node:assert/strict";
import test from "node:test";
import { artworkForFood } from "../lib/customer/foodArtwork";

test("a missing Bangladeshi food photo receives a curated food artwork instead of an emoji placeholder", () => {
  assert.equal(artworkForFood("Chicken Rezala"), "/food-artwork/chicken-rezala.png");
});

test("a missing vegetable dish photo receives its own premium artwork", () => {
  assert.equal(artworkForFood("Mixed Vegetable Curry"), "/food-artwork/mixed-vegetable-curry.png");
});

import assert from "node:assert/strict";
import test from "node:test";
import { artworkForFood, foodImageSource } from "../lib/customer/foodArtwork";

test("a missing Bangladeshi food photo receives a curated food artwork instead of an emoji placeholder", () => {
  assert.equal(artworkForFood("Chicken Rezala"), "/food-artwork/chicken-rezala.png");
});

test("valid merchant photos remain visible even for dishes with curated artwork", () => {
  assert.equal(foodImageSource("/uploads/vendor/real-food.jpg", "Chicken Rezala"), "/uploads/vendor/real-food.jpg");
});

test("the known incorrect sample photo receives food artwork without deleting the upload", () => {
  assert.equal(foodImageSource("/uploads/cmtr02btv00047ugmvyml75e6/e0c6353a4ea488f3.jpeg", "Chicken Rezala"), "/food-artwork/chicken-rezala.png");
});

test("a missing vegetable dish photo receives its own premium artwork", () => {
  assert.equal(artworkForFood("Mixed Vegetable Curry"), "/food-artwork/mixed-vegetable-curry.png");
});

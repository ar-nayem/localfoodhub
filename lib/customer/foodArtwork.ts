const ARTWORK: Record<string, string> = {
  "chicken rezala": "/food-artwork/chicken-rezala.png",
  "beef bhuna": "/food-artwork/beef-bhuna.png",
  "mixed vegetable curry": "/food-artwork/mixed-vegetable-curry.png",
  "bangladeshi · local food": "/food-artwork/bangladeshi-restaurant.png",
};

export function artworkForFood(label: string): string | undefined {
  return ARTWORK[label.trim().toLowerCase()];
}

// These two uploaded sample files contain a craft product and a diploma. Preserve
// uploads in storage while presenting appropriate artwork until they are replaced.
const INCORRECT_SAMPLE_IMAGES = new Set([
  "/uploads/cmtr02btv00047ugmvyml75e6/e0c6353a4ea488f3.jpeg",
  "/uploads/cmtr02btv00047ugmvyml75e6/096851fe12193a1c.jpeg",
]);

export function foodImageSource(src: string | null | undefined, label: string): string | undefined {
  if (src && !INCORRECT_SAMPLE_IMAGES.has(src)) return src;
  return artworkForFood(label);
}

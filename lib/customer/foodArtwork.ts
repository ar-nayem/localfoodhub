const ARTWORK: Record<string, string> = {
  "chicken rezala": "/food-artwork/chicken-rezala.png",
  "beef bhuna": "/food-artwork/beef-bhuna.png",
  "mixed vegetable curry": "/food-artwork/mixed-vegetable-curry.png",
  "bangladeshi · local food": "/food-artwork/bangladeshi-restaurant.png",
};

export function artworkForFood(label: string): string | undefined {
  return ARTWORK[label.trim().toLowerCase()];
}

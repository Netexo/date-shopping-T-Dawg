export const START_BUDGET = 100;

export const categories = [
  { id: "all", label: "ALL" },
  { id: "activities", label: "ACTIVITIES" },
  { id: "food-drinks", label: "FOOD & DRINKS" },
  { id: "extras", label: "EXTRAS" },
];

export const products = [
  { id: "henna-tattoo", name: "Henna Tattoo", category: "activities", points: 20, icon: "henna" },
  { id: "walk", name: "Spaziergang", category: "activities", points: 5, icon: "walk" },
  { id: "bowling", name: "Bowling", category: "activities", points: 30, icon: "bowling" },
  { id: "arcade", name: "Arcade Halle", category: "activities", points: 25, icon: "arcade" },
  { id: "bar-sports", name: "Barsport (Kicker / Billard / Dart)", category: "activities", points: 20, icon: "dart" },
  { id: "bar", name: "Bar", category: "food-drinks", points: 20, icon: "cocktail" },
  { id: "pub", name: "Kneipe", category: "food-drinks", points: 15, icon: "beer" },
  { id: "restaurant", name: "Restaurant", category: "food-drinks", icon: "dinner", variants: [
    { id: "asian", name: "Asiate", points: 35 },
    { id: "fast-food", name: "Fast Food", points: 20 },
    { id: "greek", name: "Grieche", points: 35 },
    { id: "italian", name: "Italiener", points: 35 },
    { id: "all-you-can-eat", name: "All you can eat", points: 40 },
  ] },
  { id: "cards", name: "Kartendeck", category: "extras", points: 5, icon: "cards" },
  { id: "walking-beer", name: "Wegbier", category: "extras", points: 10, icon: "bottle" },
  { id: "whistle", name: "Trillerpfeife", category: "extras", points: 5, icon: "whistle" },
  { id: "fidget-spinner", name: "Fidget Spinner", category: "extras", points: 5, icon: "spinner" },
  { id: "jojo", name: "Jojo", category: "extras", points: 5, icon: "jojo" },
  { id: "unicorn", name: "Einhorn", category: "extras", points: 15, icon: "unicorn" },
  { id: "mystery-box", name: "Mystery Box", category: "extras", points: 25, icon: "gift" },
  { id: "interview", name: "5 Fragen", category: "extras", points: 5, icon: "interview" },
];

export const productsById = Object.fromEntries(products.map((product) => [product.id, product]));

export function categoryLabel(id) {
  return categories.find((category) => category.id === id)?.label || "ALL";
}

export function resolveCartItem(entry) {
  if (!entry || typeof entry !== "object" || !Object.hasOwn(productsById, entry.id)) return null;
  const product = productsById[entry.id];
  if (!product.variants) return product;
  const variant = product.variants.find((item) => item.id === entry.variantId);
  return variant ? { ...product, name: `${product.name} – ${variant.name}`, points: variant.points, variantId: variant.id } : null;
}

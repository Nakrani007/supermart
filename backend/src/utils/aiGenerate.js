/**
 * aiGenerate.js — Template-based content generation for categories.
 *
 * No external AI API needed: fills professional descriptions, tag lists,
 * meta titles, and slug suggestions from curated per-category data with
 * generic fallbacks.
 *
 * Designed to be swapped for a real LLM call later if needed.
 */

// ── Category knowledge base ───────────────────────────────────────────────────

const CATEGORY_DATA = {
  vegetables: {
    description: 'Shop fresh, farm-sourced vegetables delivered straight to your door. From everyday staples like onions, potatoes and tomatoes to seasonal greens — all handpicked for freshness.',
    tags: ['fresh', 'farm-fresh', 'organic', 'seasonal', 'healthy', 'greens', 'sabzi'],
    metaTitle: 'Fresh Vegetables Online — SuperMart',
  },
  fruits: {
    description: 'Order fresh fruits online — mangoes, bananas, apples, pomegranates and seasonal picks. Sourced daily for peak ripeness and sweetness.',
    tags: ['fresh', 'seasonal', 'sweet', 'vitamins', 'tropical', 'exotic', 'local'],
    metaTitle: 'Fresh Fruits Online — SuperMart',
  },
  dairy: {
    description: 'Full range of dairy essentials — Amul milk, curd, paneer, cheese, butter and ghee. Fresh stock delivered daily to keep your kitchen stocked.',
    tags: ['milk', 'curd', 'paneer', 'butter', 'ghee', 'Amul', 'protein', 'calcium'],
    metaTitle: 'Dairy Products Online — Milk, Curd & Paneer | SuperMart',
  },
  staples: {
    description: 'Stock up on daily grocery staples — atta, rice, dal, sugar, salt, pulses and more. Best prices on premium brands and bulk packs.',
    tags: ['atta', 'rice', 'dal', 'pulses', 'grocery', 'essential', 'bulk', 'daily'],
    metaTitle: 'Grocery Staples — Atta, Rice, Dal & More | SuperMart',
  },
  beverages: {
    description: 'Refreshing beverages for every mood — cold drinks, juices, teas, coffees, energy drinks and flavoured water. Perfect for home and office.',
    tags: ['drinks', 'juice', 'tea', 'coffee', 'cold drink', 'energy', 'refreshing'],
    metaTitle: 'Beverages — Cold Drinks, Juice & Tea | SuperMart',
  },
  snacks: {
    description: 'Munch on your favourite snacks — chips, biscuits, namkeen, cookies, popcorn and more. Best brands at daily-low prices.',
    tags: ['chips', 'biscuits', 'namkeen', 'cookies', 'popcorn', 'munching', 'teatime'],
    metaTitle: 'Snacks & Namkeen Online — SuperMart',
  },
  personal: {
    description: 'Complete personal care range — shampoos, soaps, face wash, deodorants, skincare and oral hygiene. Trusted brands at your doorstep.',
    tags: ['shampoo', 'soap', 'skincare', 'hygiene', 'grooming', 'beauty', 'oral care'],
    metaTitle: 'Personal Care Products — SuperMart',
  },
  oils: {
    description: 'Premium cooking oils and ghee — refined, cold-pressed and flavoured options. From everyday sunflower oil to desi ghee and mustard oil.',
    tags: ['cooking oil', 'ghee', 'sunflower', 'mustard', 'refined oil', 'cold pressed'],
    metaTitle: 'Cooking Oils & Ghee Online — SuperMart',
  },
  frozen: {
    description: 'Convenient frozen foods — ready-to-cook vegetables, parathas, snacks and more. Save time without compromising on taste.',
    tags: ['frozen', 'ready-to-cook', 'convenient', 'quick meals', 'vegetables', 'paratha'],
    metaTitle: 'Frozen Food Online — SuperMart',
  },
  bakery: {
    description: 'Fresh-baked breads, buns, cakes and rusks. From sliced bread to dinner rolls — perfect for breakfast and snack time.',
    tags: ['bread', 'buns', 'cakes', 'rusk', 'baked', 'fresh', 'bakery'],
    metaTitle: 'Bakery Products — Fresh Bread & Cakes | SuperMart',
  },
  cleaning: {
    description: 'Household cleaning essentials — detergents, floor cleaners, dishwash bars, toilet cleaners and air fresheners. Keep your home spotless.',
    tags: ['detergent', 'floor cleaner', 'dishwash', 'household', 'hygiene', 'toilet cleaner'],
    metaTitle: 'Household Cleaning Products — SuperMart',
  },
  baby: {
    description: 'Safe and gentle baby care products — diapers, wipes, baby food, lotions and shampoos. Trusted brands for your little one.',
    tags: ['diapers', 'baby food', 'wipes', 'gentle', 'safe', 'baby care', 'newborn'],
    metaTitle: 'Baby Care Products Online — SuperMart',
  },
};

// ── Slug generation ───────────────────────────────────────────────────────────

/**
 * Converts a category name to a URL-safe slug.
 * "Oils & Ghee" → "oils-ghee"
 */
export function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Main generator ────────────────────────────────────────────────────────────

/**
 * Generates SEO-ready content for a category.
 *
 * @param {string} name  - Category name (e.g. "Dairy Products")
 * @param {string} [slug] - Optional slug override; auto-generated if omitted
 * @returns {{ slug, description, tags, metaTitle }}
 */
export function generateCategoryContent(name, slug) {
  const derivedSlug = slug || generateSlug(name);

  // Lookup by slug first; then by any partial key match; finally use generic
  const known = CATEGORY_DATA[derivedSlug]
    || CATEGORY_DATA[Object.keys(CATEGORY_DATA).find((k) => derivedSlug.includes(k))]
    || null;

  const description = known?.description
    || `Shop the best ${name} products online at SuperMart. Great prices, fresh stock and fast delivery to your door in Surat.`;

  const tags = known?.tags
    || [name.toLowerCase(), 'online', 'grocery', 'supermart', 'surat'];

  const metaTitle = known?.metaTitle
    || `${name} Online — SuperMart`;

  return {
    slug:        derivedSlug,
    description,
    tags:        JSON.stringify(tags),   // stored as JSON string in DB
    metaTitle,
  };
}

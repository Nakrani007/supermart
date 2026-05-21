// Phonetic matching for Hindi and Gujarati product search.
// Solves a real Tier-2 problem: users search in transliterated form
// ("doodh" for दूध, "dudh" for દૂધ) and expect to find "Milk".
//
// Strategy: maintain a dictionary of common grocery terms with
// multiple phonetic variants → canonical English name.
// The search API already handles nameHi/nameGu lookups in DB;
// this handles the *transliteration* gap on the frontend before the API call.

const PHONETIC_MAP = {
  // Dairy
  doodh: 'milk', dudh: 'milk', milk: 'milk',
  dahi: 'curd', doi: 'curd', curd: 'curd', yogurt: 'curd',
  paneer: 'paneer', chana: 'paneer',
  makhan: 'butter', butter: 'butter',
  ghee: 'ghee', ghi: 'ghee',
  cream: 'cream',

  // Grains & Flour
  aata: 'wheat flour', atta: 'wheat flour', gehun: 'wheat flour',
  maida: 'all purpose flour', flour: 'flour',
  chawal: 'rice', basmati: 'basmati rice', rice: 'rice',
  dal: 'lentils', daal: 'lentils', lentil: 'lentils',
  besan: 'gram flour', chickpea: 'gram flour',

  // Vegetables (transliterated)
  aalu: 'potato', aloo: 'potato', batata: 'potato', potato: 'potato',
  tamatar: 'tomato', tameta: 'tomato', tomato: 'tomato',
  pyaz: 'onion', dungri: 'onion', kanda: 'onion', onion: 'onion',
  lehsun: 'garlic', lasan: 'garlic', garlic: 'garlic',
  adrak: 'ginger', adu: 'ginger', ginger: 'ginger',
  bhindi: 'okra', lady: 'okra',
  gobhi: 'cauliflower', phool: 'cauliflower',
  palak: 'spinach', spinach: 'spinach',

  // Oils & Spices
  tel: 'oil', oil: 'oil',
  sarso: 'mustard oil', mustard: 'mustard',
  mirchi: 'chilli', mirch: 'chilli', chilli: 'chilli',
  haldi: 'turmeric', turmeric: 'turmeric',
  namak: 'salt', salt: 'salt', mith: 'salt',
  cheeni: 'sugar', sakkar: 'sugar', sugar: 'sugar',

  // Packaged
  biscuit: 'biscuit', biskut: 'biscuit',
  chai: 'tea', chaha: 'tea', tea: 'tea',
  coffee: 'coffee',
  soap: 'soap', sabun: 'soap',
  shampoo: 'shampoo',
};

/**
 * Translates a possibly-transliterated search term to an English keyword.
 * Falls back to the original query if no match found.
 *
 * @param {string} query - Raw user input (may be Hindi/Gujarati transliteration)
 * @returns {string} - English keyword suitable for API search
 */
export function phoneticToEnglish(query) {
  const normalized = query.trim().toLowerCase();

  // Direct match
  if (PHONETIC_MAP[normalized]) return PHONETIC_MAP[normalized];

  // Partial prefix match — "doodh" maps if user typed "dood"
  const match = Object.keys(PHONETIC_MAP).find(
    (key) => key.startsWith(normalized) && normalized.length >= 3
  );
  if (match) return PHONETIC_MAP[match];

  // Reverse partial — user typed "potato" partially as "potat"
  const reverseMatch = Object.values(PHONETIC_MAP).find(
    (val) => val.startsWith(normalized) && normalized.length >= 3
  );
  if (reverseMatch) return reverseMatch;

  return query; // pass through as-is (English search, barcode, etc.)
}

/**
 * Returns all phonetic variants for a term (used for autocomplete suggestions).
 */
export function getPhoneticVariants(englishTerm) {
  return Object.entries(PHONETIC_MAP)
    .filter(([, val]) => val === englishTerm)
    .map(([key]) => key);
}

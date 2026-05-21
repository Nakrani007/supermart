// Indian currency formatting utilities.
// Uses Intl.NumberFormat with en-IN locale for proper lakh/crore grouping.

const fmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatINR(amount) {
  return fmt.format(Number(amount) || 0);
}

// Returns "₹49" (no decimals for whole numbers, "₹49.50" otherwise)
export function formatPrice(amount) {
  const n = Number(amount) || 0;
  return n % 1 === 0 ? `₹${n}` : `₹${n.toFixed(2)}`;
}

export function discountPercent(mrp, price) {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

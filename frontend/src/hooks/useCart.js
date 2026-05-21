// Thin hook that composes cart store actions with UI feedback.
// Components use this instead of importing store directly.

import { useCartStore } from '../store/cartStore.js';

export function useCart() {
  const { items, addItem, removeItem, updateQuantity, clearCart } = useCartStore();

  const getItemQuantity = (productId) =>
    items.find((i) => i.product.id === productId)?.quantity ?? 0;

  const isInCart = (productId) => items.some((i) => i.product.id === productId);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemQuantity,
    isInCart,
  };
}

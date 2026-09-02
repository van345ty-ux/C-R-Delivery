import type { CartItem, Product } from '../types';

// Derivada dos dados existentes: sacolas salvas não precisam de migração.
// JSON evita colisões entre IDs e observações que contenham separadores.
export const getCartItemKey = (item: CartItem): string =>
  JSON.stringify([item.product.id, item.observations ?? '']);

export function addCartItem(items: CartItem[], product: Product, quantity: number, observations?: string): CartItem[] {
  const newItem: CartItem = { product, quantity, observations };
  const key = getCartItemKey(newItem);
  const index = items.findIndex(item => getCartItemKey(item) === key);
  if (index === -1) return [...items, newItem];

  return items.map((item, itemIndex) => itemIndex === index
    ? { ...item, quantity: item.quantity + quantity }
    : item);
}

export const removeCartItem = (items: CartItem[], itemKey: string): CartItem[] =>
  items.filter(item => getCartItemKey(item) !== itemKey);

export function updateCartItemQuantity(items: CartItem[], itemKey: string, quantity: number): CartItem[] {
  if (quantity <= 0) return removeCartItem(items, itemKey);
  return items.map(item => getCartItemKey(item) === itemKey ? { ...item, quantity } : item);
}

// Ao recuperar uma tentativa antiga, mantém itens adicionados depois dela.
export function removeOrderedItems(items: CartItem[], orderedItems: CartItem[]): CartItem[] {
  const quantities = new Map<string, number>();
  for (const item of orderedItems) {
    const key = getCartItemKey(item);
    quantities.set(key, (quantities.get(key) ?? 0) + item.quantity);
  }
  return items.flatMap(item => {
    const key = getCartItemKey(item);
    const removed = Math.min(item.quantity, quantities.get(key) ?? 0);
    quantities.set(key, (quantities.get(key) ?? 0) - removed);
    return item.quantity > removed ? [{ ...item, quantity: item.quantity - removed }] : [];
  });
}

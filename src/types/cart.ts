import type { Product } from '@/pages/website/data/products';

export type CartItem = { id: string; color: string; qty: number };
export type CartQuote = {
  items: CartItem[];
  products: Product[];
  lines: { id: string; color: string; qty: number; unitPriceCents: number; totalCents: number }[];
  totalCents: number;
  currency: 'USD';
};
export type PreparedCheckout = { id: string; expiresAt: string; totalCents: number; currency: 'USD'; reserved: false };

import type { CartItem, CartQuote } from './cart';

export type DeliveryAddress = {
  departmentId: string; municipalityId: string; districtId: string;
  exactAddress: string; reference: string;
  location?: { latitude: number; longitude: number; accuracy: number; confirmed: true };
};
export type CheckoutInput = { items: CartItem[]; fulfillment: 'delivery' | 'pickup'; recipientName: string; phone: string; address: DeliveryAddress | null };
export type ShippingQuote = { available: boolean; feeCents: number | null; message: string; instructions: string | null };
export type CheckoutQuote = { cart: CartQuote; shipping: ShippingQuote; totalCents: number | null; wompiReady: boolean; paymentMessage: string };
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'paid_review';
export type OrderView = {
  id: string; status: OrderStatus; stockState: 'reserved' | 'released' | 'consumed'; fulfillment: 'delivery' | 'pickup';
  recipientName: string; email: string; phone: string; address: (DeliveryAddress & { department: string; municipality: string; district: string }) | null;
  pickupInstructions: string | null; subtotalCents: number; shippingCents: number; totalCents: number; currency: 'USD';
  expiresAt: string; createdAt: string; paymentUrl: string | null; paymentInitialization: string; paymentIssue: string | null;
  items: { id: string; name: string; image: string; color: string; qty: number; unitPriceCents: number }[];
};
export type LocationSuggestion = Partial<Pick<DeliveryAddress,'departmentId' | 'municipalityId' | 'districtId' | 'exactAddress'>> & { message: string };

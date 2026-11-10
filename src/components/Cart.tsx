import Link from 'next/link';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { productHref, productImage, formatPrice, type Product } from '@/pages/website/data/products';
import { useAuthSession } from './AuthSession';
import type { CartItem, CartQuote, PreparedCheckout } from '@/types/cart';

type Cart = { items: CartItem[]; count: number; ready: boolean; open: () => void; add: (item: CartItem, product: Product) => Promise<void> };
const Context = createContext<Cart | null>(null);
const KEY = 'petshop_cart';
function readCart(): CartItem[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 100).flatMap((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return [];
      const item = entry as Record<string, unknown>;
      if (typeof item.id !== 'string' || typeof item.qty !== 'number' || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99 || typeof item.color !== 'string') return [];
      const color = item.color === 'Pastel Pink' ? 'Rosa' : item.color === 'Sage Green' ? 'Verde' : item.color;
      return [{ id: item.id, qty: item.qty, color }];
    });
  } catch { return []; }
}
async function send<T>(path: string, data: unknown): Promise<T> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'No pudimos comprobar el carrito.');
  return result;
}
export function useCart() {
  const value = useContext(Context);
  if (!value) throw new Error('Falta CartProvider.');
  return value;
}
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const currentItems = useRef<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ready, setReady] = useState(false);
  const [opened, setOpened] = useState(false);
  const [busy, setBusy] = useState(false);
  const mutation = useRef(false);
  const quoteGeneration = useRef(0);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [preparation, setPreparation] = useState<PreparedCheckout | null>(null);
  const preparationKey = useRef<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const { user } = useAuthSession();
  const commit = (next: CartItem[]) => {
    ++quoteGeneration.current;
    currentItems.current = next; setItems(next); setPreparation(null); preparationKey.current = null;
  };
  const accept = (result: CartQuote) => { commit(result.items); setQuote(result); setProducts(current => [...current.filter(row => !result.products.some(product => product.id === row.id)), ...result.products]); };
  useEffect(() => {
    currentItems.current = readCart(); setItems(currentItems.current); setReady(true);
    void fetch('/api/catalog', { cache: 'no-store' }).then(response => response.ok ? response.json() : Promise.reject()).then(data => setProducts(data.products)).catch(() => {});
    const sync = (event: StorageEvent) => {
      if (event.key === KEY || event.key === null) { commit(readCart()); setQuote(null); setError(''); }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* Storage is optional. */ } } }, [items, ready]);
  useEffect(() => {
    if (opened) { dialog.current?.showModal(); document.body.style.overflow = 'hidden'; if (ready) void check(); }
    else { dialog.current?.close(); document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [opened, ready]);
  useEffect(() => { setPreparation(null); preparationKey.current = null; }, [user?.id]);
  const check = async () => {
    const generation = ++quoteGeneration.current;
    setError(''); setQuote(null); setPreparation(null);
    try { const result = await send<CartQuote>('/api/cart', { items: currentItems.current }); if (generation === quoteGeneration.current) { setQuote(result); setProducts(result.products); } }
    catch (error) { if (generation === quoteGeneration.current) setError((error as Error).message); }
  };
  const open = () => { setOpened(true); };
  const change = async (next: CartItem[], removing = false) => {
    if (mutation.current) throw new Error('Espera a que termine la comprobación anterior.');
    mutation.current = true; setBusy(true); setError(''); setQuote(null); setPreparation(null);
    ++quoteGeneration.current;
    try { accept(await send<CartQuote>('/api/cart', { items: next })); }
    catch (error) {
      if (removing) commit(next);
      setError((error as Error).message); throw error;
    } finally { mutation.current = false; setBusy(false); }
  };
  const add = async (item: CartItem, product: Product) => {
    const current = currentItems.current;
    const found = current.find(row => row.id === item.id && row.color === item.color);
    const next = found ? current.map(row => row === found ? { ...row, qty: row.qty + item.qty } : row) : [...current, item];
    await change(next);
    setProducts(rows => rows.some(row => row.id === product.id) ? rows : [...rows, product]);
    setOpened(true);
  };
  const count = items.reduce((sum, item) => sum + item.qty, 0);
  return <Context.Provider value={{ items, count, ready, open, add }}>
    {children}
    <dialog className="demo-cart" ref={dialog} aria-labelledby="cart-title" onCancel={() => setOpened(false)} onClose={() => setOpened(false)} onClick={(event) => {
      if (event.target !== dialog.current) return;
      const rect = dialog.current.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setOpened(false);
    }}>
      <div className="demo-cart__head"><h2 id="cart-title">Tu carrito ({count})</h2><button type="button" className="icon-button" onClick={() => setOpened(false)} aria-label="Cerrar carrito">×</button></div>
      <p className="demo-note">Comprobamos precios y stock en la tienda. Añadir al carrito o preparar el pedido no reserva existencias.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {items.length === 0 ? <p className="cart-empty">Tu carrito está vacío. ¡Encuentra una idea para tu compañero!</p> : <ul className="demo-cart__list">{items.map((item, index) => {
        const product = products.find(product => product.id === item.id);
        const image = product?.colors?.find(color => color.name === item.color)?.image ?? product?.image;
        return <li key={JSON.stringify([item.id,item.color])}>
          {image && <img src={productImage(image)} alt="" width="72" height="72" />}
          <div><Link href={productHref(item.id)} onClick={() => setOpened(false)}>{product?.name ?? item.id}</Link><p>{item.color && `${item.color} · `}Cantidad: {item.qty}</p>{product && <p>{product.stock === 0 ? 'Agotado' : formatPrice(product.price)}</p>}<label className="cart-quantity">Cantidad de {product?.name ?? item.id}<input type="number" min="1" max="99" defaultValue={item.qty} key={item.qty} disabled={busy} onBlur={event => {
            const input = event.currentTarget; const qty = input.valueAsNumber;
            if (qty !== item.qty) void change(currentItems.current.map((row, i) => i === index ? { ...row, qty } : row)).catch(() => { input.value = String(item.qty); });
          }} /></label><button disabled={busy} type="button" onClick={() => { void change(currentItems.current.filter((_, i) => i !== index), true).catch(() => {}); }} aria-label={`Quitar ${product?.name ?? item.id}`}>Quitar</button></div>
        </li>;
      })}</ul>}
      <div className="demo-cart__foot">{quote && items.length > 0 && <p aria-live="polite">Total de productos: {formatPrice(quote.totalCents / 100)}</p>}
        {items.length > 0 && (user ? <button className="btn btn--wine" type="button" disabled={busy} onClick={async () => {
          if (mutation.current) return;
          mutation.current = true; setBusy(true); setError(''); setPreparation(null);
          ++quoteGeneration.current;
          try {
            const checked = await send<CartQuote>('/api/cart', { items: currentItems.current }); setQuote(checked); setProducts(checked.products);
            preparationKey.current ??= crypto.randomUUID();
            const result = await send<{ preparation: PreparedCheckout }>('/api/checkout/prepare', { items: currentItems.current, idempotencyKey: preparationKey.current });
            setPreparation(result.preparation);
          } catch (error) { setQuote(null); setError((error as Error).message); preparationKey.current = null; }
          finally { mutation.current = false; setBusy(false); }
        }}>{busy ? 'Comprobando…' : 'Preparar pedido'}</button> : <Link className="btn btn--wine" href="/login" onClick={() => setOpened(false)}>Ingresar para preparar pedido</Link>)}
        {preparation && <p className="demo-note" role="status">Selección verificada. Referencia: {preparation.id}. La confirmación, envío y pago estarán disponibles en la siguiente etapa. El stock se comprobará de nuevo al confirmar.</p>}
        <Link className="btn btn--wine" href="/website/shop" onClick={() => setOpened(false)}>Seguir explorando</Link>{items.length > 0 && <button className="text-button" disabled={busy} type="button" onClick={() => { void change([], true).catch(() => {}); }}>Vaciar carrito</button>}
      </div>
    </dialog>
  </Context.Provider>;
}

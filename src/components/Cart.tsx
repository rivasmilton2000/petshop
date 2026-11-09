import Link from 'next/link';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { products, productHref, productImage } from '@/pages/website/data/products';

type Item = { id: string; color: string; qty: number };
type Cart = { items: Item[]; count: number; open: () => void; add: (item: Item) => void };
const Context = createContext<Cart | null>(null);
const KEY = 'petshop_cart';

function readCart(): Item[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 100).flatMap((entry: unknown) => {
      if (!entry || typeof entry !== 'object') return [];
      const item = entry as Record<string, unknown>;
      const product = products.find((p) => p.id === item.id);
      if (!product || typeof item.qty !== 'number' || !Number.isInteger(item.qty) || item.qty < 1) return [];
      const color = item.color === 'Pastel Pink' ? 'Rosa' : item.color === 'Sage Green' ? 'Verde' : item.color;
      if (product.colors && !product.colors.some((c) => c.name === color)) return [];
      return [{ id: product.id, color: product.colors ? String(color) : '', qty: Math.min(99, item.qty) }];
    });
  } catch { return []; }
}

export function useCart() {
  const value = useContext(Context);
  if (!value) throw new Error('Falta CartProvider.');
  return value;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);
  const [opened, setOpened] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    setItems(readCart());
    setReady(true);
    const sync = (event: StorageEvent) => { if (event.key === KEY || event.key === null) setItems(readCart()); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => {
    if (ready) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* Funciona también sin almacenamiento. */ } }
  }, [items, ready]);
  useEffect(() => {
    if (opened) { dialog.current?.showModal(); document.body.style.overflow = 'hidden'; }
    else { dialog.current?.close(); document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [opened]);
  const count = items.reduce((sum, item) => sum + item.qty, 0);
  const open = () => setOpened(true);
  const add = (item: Item) => {
    setItems((current) => {
      const found = current.find((it) => it.id === item.id && it.color === item.color);
      return found ? current.map((it) => it === found ? { ...it, qty: Math.min(99, it.qty + item.qty) } : it) : [...current, item];
    });
    open();
  };
  return <Context.Provider value={{ items, count, open, add }}>
    {children}
    <dialog className="demo-cart" ref={dialog} aria-labelledby="cart-title" onCancel={() => setOpened(false)} onClose={() => setOpened(false)} onClick={(event) => {
      if (event.target !== dialog.current) return;
      const rect = dialog.current.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setOpened(false);
    }}>
      <div className="demo-cart__head"><h2 id="cart-title">Carrito de ejemplo ({count})</h2><button type="button" className="icon-button" onClick={() => setOpened(false)} aria-label="Cerrar carrito">×</button></div>
      <p className="demo-note">Puedes guardar una selección de ejemplo. Las compras y los precios aún no están disponibles.</p>
      {items.length === 0 ? <p className="cart-empty">Tu carrito está vacío. ¡Encuentra una idea para tu compañero!</p> : <ul className="demo-cart__list">{items.map((item, index) => {
        const product = products.find((p) => p.id === item.id)!;
        const image = product.colors?.find((c) => c.name === item.color)?.image ?? product.image;
        return <li key={`${item.id}-${item.color}`}>
          <img src={productImage(image)} alt="" width="72" height="72" />
          <div><Link href={productHref(item.id)} onClick={() => setOpened(false)}>{product.name}</Link><p>{item.color && `${item.color} · `}Cantidad: {item.qty}</p><button type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))} aria-label={`Quitar ${product.name}`}>Quitar</button></div>
        </li>;
      })}</ul>}
      <div className="demo-cart__foot"><Link className="btn btn--wine" href="/website/shop" onClick={() => setOpened(false)}>Seguir explorando</Link>{items.length > 0 && <button className="text-button" type="button" onClick={() => setItems([])}>Vaciar carrito</button>}</div>
    </dialog>
  </Context.Provider>;
}

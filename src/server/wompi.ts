import './only-server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError } from './api';
import { appOrigin } from './auth';

export type PaymentMode = 'test' | 'live';
export class PaymentLinkNotCreatedError extends HttpError {
  constructor() { super(503,'No se pudo iniciar el pago. La tienda debe revisar la configuración de Wompi.'); }
}
export type VerifiedPayment = { id: string; approved: boolean; real: boolean; amountCents: number; currency: 'USD' };
export type PaymentInspection = { id: number; reference: string; mode: PaymentMode; amountCents: number; transaction: VerifiedPayment | null; failed: boolean };
export type RedirectProof = { identificadorEnlaceComercio: string; idTransaccion: string; idEnlace: string; monto: string; hash: string };
export interface PaymentGateway {
  mode: PaymentMode;
  createLink(order: { id: string; totalCents: number; expiresAt: string }): Promise<{ id: number; url: string }>;
  inspectLink(id: number, proof?: RedirectProof, notificationTransactionId?: string): Promise<PaymentInspection>;
  deactivateLink(id: number): Promise<void>;
}
export function wompiAvailability() {
  const mode = process.env.WOMPI_MODE || 'test';
  if (!['test','live'].includes(mode)) return { ready: false, message: 'El modo de Wompi necesita configuración.' };
  if (!process.env.WOMPI_CLIENT_ID || !process.env.WOMPI_CLIENT_SECRET) return { ready: false, message: 'El pago con Wompi estará disponible cuando la tienda configure sus credenciales.' };
  if (mode === 'live' && process.env.WOMPI_ENABLE_LIVE_PAYMENTS !== 'true') return { ready: false, message: 'Los pagos reales todavía no están habilitados.' };
  if (!appOrigin().startsWith('https://')) return { ready: false, message: 'Wompi necesita que la tienda configure una URL pública HTTPS para el retorno y las notificaciones.' };
  return { ready: true, message: mode === 'test' ? 'Wompi en modo de prueba: no se realizarán cobros reales.' : 'Pago seguro alojado por Wompi de Banco Agrícola.' };
}
export function requireWompi() {
  const availability = wompiAvailability();
  if (!availability.ready) throw new HttpError(503, availability.message);
}
export function amountToCents(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || Math.abs(value * 100 - Math.round(value * 100)) > 0.0001 || !Number.isSafeInteger(Math.round(value * 100))) throw new HttpError(502, 'Wompi devolvió un importe inválido.');
  return Math.round(value * 100);
}
export function validHmac(raw: string | Buffer, signature: unknown) {
  if (!process.env.WOMPI_CLIENT_SECRET || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', process.env.WOMPI_CLIENT_SECRET).update(raw).digest();
  return timingSafeEqual(expected,Buffer.from(signature,'hex'));
}
export function validRedirect(proof: RedirectProof) {
  return Object.values(proof).every(value=>typeof value==='string' && value.length <= 500) && validHmac(proof.identificadorEnlaceComercio + proof.idTransaccion + proof.idEnlace + proof.monto,proof.hash);
}
type ProviderTransaction = { idTransaccion: string; esAprobada: boolean; esReal: boolean; monto: number; currency?: string; moneda?: string };
type ProviderLink = { idEnlace: number; idAplicativo: string; nombreEnlace: string; monto: number; estaProductivo: boolean; usable: boolean; cantidadIntentoPagoFallidos: number; transacciones?: ProviderTransaction[]; transaccionCompra?: ProviderTransaction | null };

/** Official SV endpoints only. Test mode is selected on the merchant in Wompi's panel. */
export class WompiGateway implements PaymentGateway {
  mode: PaymentMode = process.env.WOMPI_MODE === 'live' ? 'live' : 'test';
  private token: { value: string; expires: number } | null = null;
  private applicationId: string | null = null;
  private async accessToken() {
    if (this.token && this.token.expires > Date.now()) return this.token.value;
    if (!process.env.WOMPI_CLIENT_ID || !process.env.WOMPI_CLIENT_SECRET) throw new HttpError(503, 'Faltan credenciales de Wompi.');
    const response = await fetch('https://id.wompi.sv/connect/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', audience: 'wompi_api', client_id: process.env.WOMPI_CLIENT_ID, client_secret: process.env.WOMPI_CLIENT_SECRET }), signal: AbortSignal.timeout(12000), redirect: 'error', cache: 'no-store' });
    if (!response.ok) throw new HttpError(502, 'No pudimos autenticar el pago con Wompi.');
    const data = await response.json();
    if (typeof data.access_token !== 'string' || !Number.isFinite(data.expires_in)) throw new HttpError(502, 'Respuesta de autenticación de Wompi inválida.');
    this.token = { value: data.access_token, expires: Date.now() + Math.max(0,data.expires_in - 60) * 1000 };
    return this.token.value;
  }
  private async api(path: string, method = 'GET', body?: unknown) {
    const response = await fetch(`https://api.wompi.sv${path}`, { method, headers: { Authorization: `Bearer ${await this.accessToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(12000), redirect: 'error', cache: 'no-store' });
    if (!response.ok) throw new HttpError(502, 'No pudimos comprobar el pago con Wompi. El pedido seguirá pendiente hasta verificarlo.');
    const text=await response.text();
    if(!text.trim())return null;
    try{return JSON.parse(text);}catch{throw new HttpError(502,'Wompi devolvió una respuesta no válida.');}
  }
  private async merchantIdentity() {
    if(this.applicationId) return this.applicationId;
    const application=await this.api('/Aplicativo');
    if ((application.clientIdApi || application.idAplicativo) !== process.env.WOMPI_CLIENT_ID || typeof application.idAplicativo!=='string' || application.estaProductivo !== (this.mode === 'live')) throw new HttpError(409,'El negocio de Wompi no coincide con la cuenta o el entorno configurados.');
    this.applicationId=application.idAplicativo;
    return this.applicationId;
  }
  async createLink(order: { id: string; totalCents: number; expiresAt: string }) {
    try { requireWompi(); await this.merchantIdentity(); }
    catch { throw new PaymentLinkNotCreatedError(); }
    const origin = appOrigin();
    const result = await this.api('/EnlacePago','POST',{
      identificadorEnlaceComercio: order.id, monto: order.totalCents / 100, nombreProducto: `LILAC & TOFFEE · Pedido ${order.id}`,
      formaPago: { permitirTarjetaCreditoDebido: true, permitirPagoConPuntoAgricola: false, permitirPagoEnCuotasAgricola: false, permitirPagoEnBitcoin: false, permitePagoQuickPay: false },
      configuracion: { urlRedirect: `${origin}/website/order?id=${order.id}`, urlRetorno: `${origin}/website/order?id=${order.id}`, urlWebhook: `${origin}/api/wompi/webhook`, esMontoEditable: false, esCantidadEditable: false, cantidadPorDefecto: 1, duracionInterfazIntentoMinutos: Math.max(1,Math.ceil((new Date(order.expiresAt).getTime()-Date.now())/60000)), notificarTransaccionCliente: true },
      vigencia: { fechaInicio: new Date().toISOString(), fechaFin: order.expiresAt },
      limitesDeUso: { cantidadMaximaPagosExitosos: 1, cantidadMaximaPagosFallidos: 1 },
    });
    if (!Number.isInteger(result.idEnlace) || result.idEnlace <= 0 || result.estaProductivo !== (this.mode === 'live') || typeof result.urlEnlace !== 'string') throw new HttpError(502, 'Wompi devolvió un enlace incompatible con el entorno del pedido.');
    const url = new URL(result.urlEnlace);
    if (url.protocol !== 'https:' || !['lk.wompi.sv','pagos.wompi.sv','wompi.sv','www.wompi.sv'].includes(url.hostname) || url.username || url.password || url.port) throw new HttpError(502, 'La dirección de pago de Wompi no es válida.');
    return { id: result.idEnlace as number, url: url.href };
  }
  async inspectLink(id: number, proof?: RedirectProof, notificationTransactionId?: string): Promise<PaymentInspection> {
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Enlace inválido.');
    const link = await this.api(`/EnlacePago/${id}`) as ProviderLink;
    if (link.idEnlace !== id || link.idAplicativo !== await this.merchantIdentity() || typeof link.estaProductivo !== 'boolean' || link.estaProductivo !== (this.mode === 'live') || typeof link.nombreEnlace !== 'string') throw new HttpError(409, 'La cuenta o el entorno del pago no coinciden con el pedido.');
    const transactions = [...(Array.isArray(link.transacciones) ? link.transacciones : []), ...(link.transaccionCompra ? [link.transaccionCompra] : [])];
    let selected = notificationTransactionId ? { idTransaccion: notificationTransactionId } as ProviderTransaction : transactions.find(transaction=>transaction.esAprobada === true) ?? transactions[0];
    // A declined transaction may not be in the link's successful-transactions list.
    // Only a valid official redirect signature can supply that extra transaction ID.
    if (!selected && proof && validRedirect(proof) && proof.identificadorEnlaceComercio === link.nombreEnlace && proof.idEnlace === String(id) && amountToCents(Number(proof.monto)) === amountToCents(link.monto)) selected = { idTransaccion: proof.idTransaccion } as ProviderTransaction;
    let transaction: VerifiedPayment | null = null;
    if (selected) {
      if (!/^[a-zA-Z0-9-]{1,100}$/.test(selected.idTransaccion)) throw new HttpError(502, 'Identificador de transacción inválido.');
      const verified = await this.api(`/TransaccionCompra/${encodeURIComponent(selected.idTransaccion)}`) as ProviderTransaction;
      if (verified.idTransaccion !== selected.idTransaccion || typeof verified.esAprobada !== 'boolean' || verified.esReal !== (this.mode === 'live') || (verified.currency ?? verified.moneda ?? 'USD') !== 'USD') throw new HttpError(409, 'El estado, la moneda o el entorno del pago no coinciden.');
      // The SV API defines monto in US dollars; unlike the Colombian API it has
      // no separate currency field. Any explicitly different currency is rejected.
      transaction = { id: verified.idTransaccion, approved: verified.esAprobada, real: verified.esReal, amountCents: amountToCents(verified.monto), currency: 'USD' };
    }
    return { id, reference: link.nombreEnlace, mode: this.mode, amountCents: amountToCents(link.monto), transaction, failed: !transaction?.approved && link.cantidadIntentoPagoFallidos > 0 };
  }
  async deactivateLink(id: number) { await this.api(`/EnlacePago/${id}/desactivar`,'PUT'); }
}
export const wompi = new WompiGateway();

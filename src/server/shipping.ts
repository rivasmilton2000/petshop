import './only-server';
import { HttpError } from './api';
import { findTerritory, territories } from '@/data/el-salvador';
import type { CheckoutInput, DeliveryAddress, ShippingQuote } from '@/types/checkout';

export function checkoutInput(body: Record<string, unknown>): CheckoutInput {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['items','fulfillment','recipientName','phone','address','idempotencyKey'].includes(key))) throw new HttpError(400, 'Datos de checkout inválidos. No envíes precios ni totales.');
  if (body.fulfillment !== 'delivery' && body.fulfillment !== 'pickup') throw new HttpError(400, 'Selecciona entrega a domicilio o recogida en tienda.');
  const recipientName = typeof body.recipientName === 'string' ? body.recipientName.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (recipientName.length < 2 || recipientName.length > 80) throw new HttpError(400, 'Indica el nombre de quien recibirá el pedido.');
  if (phone && (!/^[+\d() -]{8,25}$/.test(phone) || phone.replace(/\D/g,'').length < 8 || phone.replace(/\D/g,'').length > 15)) throw new HttpError(400, 'Revisa el teléfono de contacto.');
  let address: DeliveryAddress | null = null;
  if (body.fulfillment === 'delivery') {
    const value = body.address as Record<string, unknown> | null;
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['departmentId','municipalityId','districtId','exactAddress','reference','location'].includes(key))) throw new HttpError(400, 'Completa la dirección de entrega.');
    const territory = findTerritory(value.departmentId,value.municipalityId,value.districtId);
    if (!territory) throw new HttpError(400, 'El departamento, municipio y distrito seleccionados no corresponden entre sí.');
    const exactAddress = typeof value.exactAddress === 'string' ? value.exactAddress.trim() : '';
    const reference = typeof value.reference === 'string' ? value.reference.trim() : '';
    if (exactAddress.length < 10 || exactAddress.length > 500 || reference.length > 300) throw new HttpError(400, 'Indica una dirección exacta de 10 a 500 caracteres y una referencia de hasta 300.');
    address = { departmentId: territory.department.id, municipalityId: territory.municipality.id, districtId: territory.district.id, exactAddress, reference };
    if (value.location !== undefined && value.location !== null) {
      const location = value.location as Record<string, unknown>;
      if (typeof location !== 'object' || Array.isArray(location) || Object.keys(location).some(key=>!['latitude','longitude','accuracy','confirmed'].includes(key)) || location.confirmed !== true || typeof location.latitude !== 'number' || !Number.isFinite(location.latitude) || location.latitude < 13 || location.latitude > 14.6 || typeof location.longitude !== 'number' || !Number.isFinite(location.longitude) || location.longitude < -90.3 || location.longitude > -87.5 || typeof location.accuracy !== 'number' || !Number.isFinite(location.accuracy) || location.accuracy < 0 || location.accuracy > 10000) throw new HttpError(400, 'La ubicación opcional debe ser válida y estar confirmada. Puedes continuar con la dirección manual.');
      address.location = { latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy, confirmed: true };
    }
  } else if (body.address !== null && body.address !== undefined) throw new HttpError(400, 'La recogida no necesita dirección de entrega.');
  return { items: body.items as CheckoutInput['items'], fulfillment: body.fulfillment, recipientName, phone, address };
}

function cents(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 100000000; }
export function shippingQuote(input: Pick<CheckoutInput,'fulfillment' | 'address'>): ShippingQuote {
  if (input.fulfillment === 'pickup') {
    const raw = process.env.PICKUP_FEE_CENTS;
    const fee = raw && /^\d+$/.test(raw) ? Number(raw) : null;
    const instructions = process.env.PICKUP_INSTRUCTIONS?.trim() ?? '';
    if (!cents(fee) || !instructions) return { available: false, feeCents: null, instructions: null, message: 'La recogida está disponible como opción, pero faltan confirmar su tarifa y las instrucciones de la tienda.' };
    return { available: true, feeCents: fee, instructions, message: 'Recogida en tienda' };
  }
  const address = input.address;
  if (!address || !findTerritory(address.departmentId,address.municipalityId,address.districtId)) throw new HttpError(400, 'Selecciona un destino válido.');
  let rates: Record<string, Record<string, unknown>>;
  try { rates = JSON.parse(process.env.SHIPPING_RATES_JSON ?? '{}'); } catch { throw new HttpError(503, 'La configuración de envíos necesita revisión.'); }
  if (!rates || typeof rates !== 'object' || Array.isArray(rates) || Object.keys(rates).some(key=>!['departments','municipalities','districts'].includes(key))) throw new HttpError(503, 'La configuración de envíos necesita revisión.');
  const lookups: [string,string,Set<string>][] = [
    ['districts',address.districtId,new Set(territories.flatMap(d=>d.municipalities.flatMap(m=>m.districts.map(x=>x.id))))],
    ['municipalities',address.municipalityId,new Set(territories.flatMap(d=>d.municipalities.map(m=>m.id)))],
    ['departments',address.departmentId,new Set(territories.map(d=>d.id))],
  ];
  let fee: number | null = null;
  for (const [level,id,validIds] of lookups) {
    const values = rates[level];
    if (values !== undefined && (!values || typeof values !== 'object' || Array.isArray(values) || Object.entries(values).some(([key,value])=>!validIds.has(key) || !cents(value)))) throw new HttpError(503, 'La configuración de envíos necesita revisión.');
    if (fee === null && values && Object.hasOwn(values,id)) fee = values[id] as number;
  }
  return fee === null ? { available: false, feeCents: null, instructions: null, message: 'Todavía no hay una tarifa de envío confirmada para este destino. No podemos cobrar el pedido hasta confirmarla.' } : { available: true, feeCents: fee, instructions: null, message: 'Entrega a domicilio' };
}

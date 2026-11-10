import './only-server';
import { territories, normalizePlace } from '@/data/el-salvador';
import { HttpError } from './api';
import type { LocationSuggestion } from '@/types/checkout';

type Component = { long_name: string; short_name: string; types: string[] };
type Result = { address_components: Component[]; formatted_address?: string; partial_match?: boolean; types?: string[]; geometry?: { location_type?: string } };
const normalized = (value: string) => normalizePlace(value).replace(/ (department|departamento)$/,'');
export function suggestTerritory(results: Result[], accuracy: number): LocationSuggestion {
  const valid = results.filter(result=>Array.isArray(result.address_components) && result.address_components.some(component=>component.types.includes('country') && component.short_name === 'SV'));
  if (!valid.length) return { message: 'No pudimos identificar una dirección salvadoreña con certeza. Completa los campos manualmente.' };
  const components = valid.flatMap(result=>result.address_components);
  const stateNames = components.filter(component=>component.types.includes('administrative_area_level_1')).map(component=>normalized(component.long_name));
  const states = territories.filter(department=>stateNames.includes(normalized(department.name)));
  let department = states.length === 1 ? states[0] : undefined;
  if (states.length > 1) return { message: 'El proveedor devolvió departamentos distintos. Selecciona el destino manualmente.' };
  if (accuracy > 1000) return { ...(department ? { departmentId: department.id } : {}), message: 'La ubicación tiene poca precisión. Solo sugerimos el departamento identificable; completa y revisa el resto manualmente.' };
  const names = components.filter(component=>component.types.some(type=>['locality','administrative_area_level_2','administrative_area_level_3','administrative_area_level_4'].includes(type))).map(component=>normalized(component.long_name));
  const municipalities = territories.flatMap(d=>d.municipalities.map(m=>({ d,m }))).filter(row=>(!department || department.id===row.d.id) && names.includes(normalized(row.m.name)));
  let municipality = municipalities.length === 1 ? municipalities[0].m : undefined;
  if (municipality && !department) department = municipalities[0].d;
  const candidates = territories.flatMap(d=>d.municipalities.flatMap(m=>m.districts.map(district=>({ d,m,district })))).filter(row=>(!department || row.d.id===department.id) && [row.district.name,...(row.district.aliases ?? [])].some(name=>names.includes(normalized(name))));
  if(municipality&&candidates.length>0&&!candidates.some(row=>row.m.id===municipality!.id))return{...(department?{departmentId:department.id}:{}),message:'El municipio y el distrito del proveedor son incompatibles. Selecciona ambos manualmente.'};
  const districts = candidates.filter(row=>!municipality || row.m.id===municipality.id);
  const district = districts.length === 1 ? districts[0].district : undefined;
  if (district) { department = districts[0].d; municipality = districts[0].m; }
  const street = district && accuracy <= 100 ? valid.find(result=>!result.partial_match && ['ROOFTOP','RANGE_INTERPOLATED'].includes(result.geometry?.location_type ?? '') && result.types?.some(type=>['street_address','premise','subpremise'].includes(type))) : undefined;
  return { ...(department ? { departmentId: department.id } : {}), ...(municipality ? { municipalityId: municipality.id } : {}), ...(district ? { districtId: district.id } : {}), ...(street?.formatted_address ? { exactAddress: street.formatted_address.slice(0,500) } : {}), message: district ? 'Revisa la sugerencia. La ubicación y los campos sugeridos solo se usarán después de tu confirmación.' : 'Hay datos territoriales ambiguos. Solo sugerimos las coincidencias únicas del catálogo oficial; completa los campos restantes.' };
}
export async function reverseGeocode(body: Record<string,unknown>): Promise<LocationSuggestion> {
  if (Object.keys(body).some(key=>!['latitude','longitude','accuracy'].includes(key))) throw new HttpError(400, 'Solicitud de ubicación inválida.');
  const { latitude,longitude,accuracy } = body;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude<13 || latitude>14.6 || typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -90.3 || longitude > -87.5 || typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy<0 || accuracy>10000) throw new HttpError(400, 'La ubicación no tiene precisión suficiente o está fuera de El Salvador. Puedes completar la dirección manualmente.');
  if (!process.env.GOOGLE_MAPS_API_KEY) throw new HttpError(503, 'El servicio de mapas no está configurado. La dirección manual sigue disponible.');
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.search = new URLSearchParams({ latlng: `${latitude},${longitude}`, language: 'es', region: 'sv', key: process.env.GOOGLE_MAPS_API_KEY }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: 'error', cache: 'no-store' });
    if (!response.ok) throw new Error('Geocoding unavailable');
    const data = await response.json();
    if (data.status !== 'OK' || !Array.isArray(data.results)) throw new Error('Geocoding unavailable');
    return suggestTerritory(data.results,accuracy);
  } catch { throw new HttpError(503, 'No pudimos consultar el mapa. Completa la dirección manualmente o vuelve a intentarlo.'); }
}

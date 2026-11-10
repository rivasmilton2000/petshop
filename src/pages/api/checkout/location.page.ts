import { endpoint, requireMutation, requireUser, HttpError } from '@/server/api';
import { reverseGeocode } from '@/server/geolocation';
import { consumeRateLimit } from '@/server/auth';

export const config = { api: { bodyParser: { sizeLimit: '4kb' } } };
export default endpoint(async (req,res)=>{
  requireMutation(req,res); const user = await requireUser(req);
  if (!await consumeRateLimit(`geocode:${user.id}`,30,3600)) throw new HttpError(429, 'Espera antes de volver a consultar la ubicación. El formulario manual sigue disponible.');
  res.status(200).json({ suggestion: await reverseGeocode(req.body) });
});

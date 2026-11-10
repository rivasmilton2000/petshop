import { endpoint, requireMethod, HttpError } from '@/server/api';
import { processWompiNotification } from '@/server/wompi-notifications';

export const config = { api: { bodyParser: false } };
export default endpoint(async (req,res)=>{
  requireMethod(req,res,'POST');
  const chunks: Buffer[] = []; let size=0;
  for await (const chunk of req) { const buffer=Buffer.from(chunk); size+=buffer.length; if (size>65536) throw new HttpError(413,'Notificación demasiado grande.'); chunks.push(buffer); }
  const raw = Buffer.concat(chunks);
  await processWompiNotification(raw,req.headers.wompi_hash);
  res.status(200).json({ received:true });
});

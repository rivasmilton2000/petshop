import { endpoint, requireUser, requireMutation, HttpError } from '@/server/api';
import { adminProduct, saveProduct, validSlug } from '@/server/catalog';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };
export default endpoint(async (req,res) => {
  const user = await requireUser(req,'administrador');
  if (!validSlug(req.query.id)) throw new HttpError(400,'Identificador inválido.');
  if (req.method==='GET') { res.status(200).json({ product: await adminProduct(user,req.query.id) }); return; }
  requireMutation(req,res);
  res.status(200).json({ product: await saveProduct(user,req.body,req.query.id) });
});

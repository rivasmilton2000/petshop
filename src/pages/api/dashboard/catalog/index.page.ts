import { endpoint, requireUser, requireMutation } from '@/server/api';
import { adminCatalog, saveProduct } from '@/server/catalog';

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };
export default endpoint(async (req,res) => {
  const user = await requireUser(req,'administrador');
  if (req.method==='GET') { res.status(200).json({ products: await adminCatalog(user) }); return; }
  requireMutation(req,res);
  res.status(201).json({ product: await saveProduct(user,req.body) });
});

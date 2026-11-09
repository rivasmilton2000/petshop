import { endpoint, requireMethod } from '@/server/api';
import { publicCatalog } from '@/server/catalog';

export default endpoint(async (req, res) => { requireMethod(req, res, 'GET'); res.status(200).json({ products: await publicCatalog() }); });

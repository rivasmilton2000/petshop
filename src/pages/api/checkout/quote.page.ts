import { endpoint, requireMutation, requireUser } from '@/server/api';
import { checkoutQuote } from '@/server/orders';
export const config = { api: { bodyParser: { sizeLimit: '32kb' } } };
export default endpoint(async (req,res)=>{ requireMutation(req,res); await requireUser(req); res.status(200).json(await checkoutQuote(req.body)); });

import { endpoint, requireUser, requireMethod } from '@/server/api';
import { accountList } from '@/server/dashboard';

export default endpoint(async (req, res) => { const user = await requireUser(req, 'administrador'); requireMethod(req,res,'GET'); res.status(200).json({ accounts: await accountList(user) }); });

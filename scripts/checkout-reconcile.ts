import './database/env.mjs';
import { reconcileOrders } from '../src/server/orders';
import { getDatabase } from '../src/server/db';
try { console.log(await reconcileOrders()); }
finally { await getDatabase().end(); }

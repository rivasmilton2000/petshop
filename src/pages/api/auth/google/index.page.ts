import { endpoint, requireMethod, HttpError } from '@/server/api';
import { getSessionUser, setCookie, OAUTH_COOKIE, consumeRateLimit } from '@/server/auth';
import { googleAvailable, startGoogleFlow } from '@/server/google';

export default endpoint(async (req, res) => {
  requireMethod(req, res, 'GET');
  if (!googleAvailable()) { res.redirect(303, '/login?error=google_unavailable'); return; }
  if (!await consumeRateLimit(`google:${req.socket.remoteAddress ?? 'local'}`, 30, 900)) throw new HttpError(429, 'Demasiados intentos. Inténtalo más tarde.');
  const user = req.query.link === '1' ? await getSessionUser(req) : null;
  if (req.query.link === '1' && !user) { res.redirect(303, '/login'); return; }
  const flow = await startGoogleFlow(user?.id ?? null);
  setCookie(res, OAUTH_COOKIE, flow.browser, 600, '/api/auth/google');
  res.redirect(302, flow.url);
});

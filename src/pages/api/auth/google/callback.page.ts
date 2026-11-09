import { endpoint, requireMethod } from '@/server/api';
import { getSessionUser, setCookie, OAUTH_COOKIE, createSession } from '@/server/auth';
import { consumeGoogleFlow, exchangeGoogleCode, googleUser } from '@/server/google';

export default endpoint(async (req, res) => {
  requireMethod(req, res, 'GET');
  try {
    const flow = await consumeGoogleFlow(req);
    setCookie(res, OAUTH_COOKIE, '', 0, '/api/auth/google');
    if (req.query.error || typeof req.query.code !== 'string' || req.query.code.length > 2048) { res.redirect(303, '/login?error=google_cancelled'); return; }
    if (flow.user_id && (await getSessionUser(req))?.id !== flow.user_id) { res.redirect(303, '/login?error=google_invalid'); return; }
    const identity = await exchangeGoogleCode(req.query.code, flow.code_verifier, flow.nonce);
    const user = await googleUser(identity, flow.user_id);
    await createSession(req, res, user.id);
    res.redirect(303, '/login/account');
  } catch (error) {
    setCookie(res, OAUTH_COOKIE, '', 0, '/api/auth/google');
    const code = error instanceof Error && error.message.startsWith('Inicia sesión con tu contraseña') ? 'google_link_required' : 'google_invalid';
    res.redirect(303, `/login?error=${code}`);
  }
});

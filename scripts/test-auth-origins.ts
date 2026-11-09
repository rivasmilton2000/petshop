import './database/env.mjs';
import assert from 'node:assert/strict';
import type { NextApiRequest, NextApiResponse } from 'next';
import { isAllowedMutationOrigin } from '../src/server/auth';
import { HttpError, requireMutation } from '../src/server/api';

const originalURL = process.env.APP_URL;
const req = (origin?: string, extra: Record<string, string> = {}) => ({
  method: 'POST', body: {}, headers: { 'content-type': 'application/json', ...(origin !== undefined ? { origin } : {}), ...extra },
}) as unknown as NextApiRequest;
const res = { setHeader() {} } as unknown as NextApiResponse;
const denied = (origin?: string, extra: Record<string, string> = {}) => assert.throws(
  () => requireMutation(req(origin, extra), res),
  (error: unknown) => error instanceof HttpError && error.status === 403,
);

try {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
    process.env.APP_URL = `http://${hostname}:3000`;
    for (const alias of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000']) {
      assert.equal(isAllowedMutationOrigin(alias), true);
      assert.doesNotThrow(() => requireMutation(req(alias, { 'sec-fetch-site': 'same-origin' }), res));
    }
    for (const foreign of [
      'http://localhost:3001', 'http://127.0.0.1:4000', 'https://localhost:3000',
      'http://192.168.1.2:3000', 'http://localhost.atacante.example:3000',
      'http://127.0.0.1.atacante.example:3000', 'http://localhost:3000.atacante.example',
      'http://localhost:3000/ruta', 'http://atacante@localhost:3000', 'null', '',
    ]) denied(foreign);
    denied();
    denied('http://localhost:3000', { 'sec-fetch-site': 'cross-site' });
    denied('https://atacante.example', { host: 'localhost:3000', 'x-forwarded-host': 'localhost:3000' });
  }
  process.env.APP_URL = 'https://tienda.example';
  assert.doesNotThrow(() => requireMutation(req('https://tienda.example'), res));
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://tienda.example.atacante.example', 'http://tienda.example', 'https://tienda.example:444']) denied(origin);
  console.log('Origen: alias locales del mismo protocolo/puerto aceptados; otros puertos, sitios externos, valores nulos y Host falsificado rechazados. Produccion conserva origen exacto.');
} finally {
  if (originalURL === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = originalURL;
}

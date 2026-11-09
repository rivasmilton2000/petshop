# Etapa 2: PostgreSQL, usuarios y autenticación

## Estado y alcance

Se implementa únicamente la etapa 2 sobre la presentación de la etapa 1. La instalación local detectada es PostgreSQL 18.3, servicio Windows `postgresql-x64-18`, host `localhost`, puerto `5432`, usuario PostgreSQL `postgres`. No había variables `PGHOST`, `PGPORT` ni `PGUSER` configuradas; se verificaron esos valores mediante una conexión al servidor. La base `petshop` no existía y se creó sin modificar otras bases ni roles del servidor PostgreSQL.

La contraseña de conexión local indicada por el usuario se guardó exclusivamente en `.env.local`. Ese archivo está excluido mediante `.gitignore` y se verificó con `git check-ignore .env.local`. `.env.example` contiene únicamente ejemplos. Los scripts no imprimen contraseñas ni la URL con credenciales.

## Configurar la base en otro entorno

Requisitos: Node.js 22+, npm y PostgreSQL activo. En PowerShell:

```powershell
cd C:\xampp\htdocs\petshop\petshop
npm.cmd ci

# Solo si aún no existe .env.local. Sustituye los ejemplos por tu entorno.
$env:PGUSER = 'postgres'
$env:PGHOST = 'localhost'
$env:PGPORT = '5432'
$env:PGPASSWORD = 'CONTRASENA_LOCAL'
npm.cmd run db:configure
Remove-Item Env:PGPASSWORD

npm.cmd run db:create
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run db:check
npm.cmd run dev
```

`db:configure` crea `.env.local` una sola vez, usa las variables `PG*` y genera contraseñas aleatorias para las dos cuentas de prueba. Si el archivo ya existe, se detiene sin sobrescribirlo. Alternativamente, copia `.env.example` a `.env.local` y sustituye todos los ejemplos. La URL debe apuntar a `/petshop`. `db:create` se conecta a la base administrativa `postgres` y crea `petshop` si falta, con el propietario que ejecuta el comando. Ese usuario necesita permiso de creación de bases. Si ya existe, no elimina ni recrea su contenido.

La configuración local actual ya está hecha. Para repetir migraciones y seed basta con:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run db:check
```

Abre `http://localhost:3000`. Para acceso local con correo y contraseña, si `APP_URL` apunta a loopback, también se admiten los alias exactos `localhost`, `127.0.0.1` y `[::1]` con el mismo protocolo y puerto. No se admiten otros puertos, direcciones de red, subdominios ni orígenes derivados de encabezados Host. Si `APP_URL` usa un dominio público, se exige coincidencia exacta con ese origen. Si cambias el puerto o el dominio, actualiza esa variable y reinicia Next.js. Google sigue usando el origen canónico de `APP_URL` para su callback. Fuera del entorno local, la aplicación exige HTTPS y añade `Secure` a las cookies.

Para producción local de prueba:

```powershell
npm.cmd run build
npm.cmd run start
```

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL, solo del servidor: `postgresql://USUARIO:CONTRASENA@HOST:PUERTO/petshop`. Escapa caracteres especiales de usuario y contraseña como componentes de URL. |
| `APP_URL` | Origen público exacto. Local: `http://localhost:3000`. No incluye rutas. |
| `SEED_USER_EMAIL` | Correo de la cuenta de prueba de rol `usuario`. |
| `SEED_USER_PASSWORD` | Contraseña de esa cuenta, de 12 a 128 caracteres. |
| `SEED_ADMIN_EMAIL` | Correo diferente para la cuenta de prueba de rol `administrador`. |
| `SEED_ADMIN_PASSWORD` | Contraseña de esa cuenta, de 12 a 128 caracteres. |
| `GOOGLE_CLIENT_ID` | ID real del cliente OAuth de Google, solo en el servidor. |
| `GOOGLE_CLIENT_SECRET` | Secreto real del cliente OAuth, solo en el servidor. |
| `TEST_BASE_URL` | Opcional: URL del servidor para las pruebas. No reemplaza el origen permitido de `APP_URL`. |

El seed local usa `usuario@petshop.test` y `administrador@petshop.test`. Sus contraseñas aleatorias están en `.env.local` como `SEED_USER_PASSWORD` y `SEED_ADMIN_PASSWORD`; no se publican en esta documentación. Las cuentas de aplicación son distintas del usuario PostgreSQL de la conexión.

`db:seed` es transaccional: conserva el ID de cada cuenta identificada por `seed_key`, actualiza su contraseña y rol de prueba y revoca sus sesiones. No duplica cuentas. Si el correo configurado pertenece a otra cuenta pública, falla sin promoverla ni sobrescribirla. Cambiar las variables y repetir el seed solo actualiza las cuentas creadas por ese seed.

## Investigación de los datos de origen

Se revisaron el árbol actual, `conexion/`, los PHP del commit original `3bd101c6b8fe80c4f79a0943057591277be000c8`, el inventario de etapa 1 y el respaldo `.migration-backup/etapa-1-originales.zip`. No se encontraron archivos SQL, esquemas, dumps, consultas PDO/mysqli, usuarios persistidos ni conexiones PHP. `conexion`, `login` y `dashboard` estaban vacíos en el proyecto de origen.

`productos.php` tenía nueve productos de demostración en un array. No había relaciones SQL que trasladar. El catálogo actual conserva esos slugs e imágenes en TypeScript, con precios `null`; no depende de una base de datos y no se convierte en inventario comercial. No se requiere ni se ejecuta una importación de datos de tienda. Las relaciones nuevas de autenticación se validan con claves foráneas y pruebas de integridad.

## Migraciones y acceso a PostgreSQL

`src/server/db.ts` mantiene un pool `pg` por proceso, reutilizado durante recargas de desarrollo, con máximo de cinco conexiones y tiempo de conexión limitado. Solo lo importan API Routes, `getServerSideProps` y herramientas de servidor. Next.js elimina esos imports de los bundles del navegador. Se comprueba además que los bundles públicos no contengan credenciales ni código de hashes. El guard de `src/server/only-server.ts` evita su ejecución accidental en el navegador; el paquete `server-only` de React no se usa porque esta versión de Next lo restringe al App Router.

`db:migrate` aplica los archivos `database/migrations/*.sql` en orden. Usa un bloqueo PostgreSQL para evitar dos ejecuciones simultáneas, una transacción por archivo y un SHA-256 registrado en `schema_migrations`. Si cambia un archivo ya aplicado, rechaza la ejecución: los cambios siguientes deben ir en una migración nueva. No hay comandos automáticos de borrado ni rollback destructivo.

| Tabla | Función y relaciones |
| --- | --- |
| `schema_migrations` | Nombre, checksum y fecha de cada migración aplicada. |
| `roles` | Roles de aplicación `usuario` y `administrador`. |
| `users` | UUID, correo único normalizado, nombre, hash opcional, rol con FK, verificación de correo y marcador del seed. |
| `sessions` | SHA-256 del token aleatorio, usuario con FK y vencimiento. Borrado en cascada al eliminar el usuario. |
| `oauth_accounts` | Identificador estable `sub` de Google y usuario con FK. Una vinculación por proveedor/usuario. |
| `oauth_flows` | Estado de OAuth de un solo uso, prueba del navegador, nonce, verificador PKCE, sesión de vinculación y vencimiento de diez minutos. |
| `auth_rate_limits` | Contadores y ventanas de intentos, identificados mediante hashes, compartidos entre procesos. |

## Páginas y endpoints

| Ruta | Comportamiento |
| --- | --- |
| `/login` | Inicio con correo/contraseña y «Iniciar sesión con Google». |
| `/login/register` | Nombre, correo, contraseña, confirmación y «Registrarse con Google». |
| `/login/account` | Sesión validada por el servidor; muestra el rol y permite vincular Google o cerrar sesión. |
| `/dashboard` | Vista mínima para comprobar acceso de administrador; 403 al usuario y redirección al inicio de sesión si no hay sesión. No implementa gestión comercial. |
| `POST /api/auth/register` | Crea exclusivamente usuarios de rol `usuario` e inicia sesión. Rechaza campos de rol o permisos. |
| `POST /api/auth/login` | Verifica contraseña y crea una sesión nueva, revocando el token anterior del navegador. |
| `POST /api/auth/logout` | Revoca la sesión en PostgreSQL y elimina su cookie. |
| `GET /api/auth/session` | Devuelve el usuario actual o `null`, sin hashes ni tokens. |
| `GET /api/auth/admin` | Requiere sesión y rol `administrador` leídos de PostgreSQL; 401 o 403 en caso contrario. |
| `GET /api/auth/google` | Inicio del único flujo OAuth compartido. `?link=1` exige una sesión existente para vincular la cuenta. |
| `GET /api/auth/google/callback` | Consume y valida el flujo, verifica la identidad y crea la sesión local. |

Las contraseñas se guardan con Argon2id: memoria 19 MiB, tres iteraciones y paralelismo uno, con sal aleatoria de la biblioteca. No se guarda texto plano. El registro acepta entre 12 y 128 caracteres. Las sesiones usan 32 bytes aleatorios, solo su hash se persiste, caducan a los siete días y se entregan mediante cookie HttpOnly, SameSite=Lax y Path=/. El rol no se toma de formularios, cookies de rol ni claims enviados por el cliente: se relee de `users` para cada acceso protegido.

Las operaciones POST requieren JSON y un `Origin` del conjunto permitido: el origen configurado o, únicamente con una configuración de loopback, sus tres alias explícitos del mismo protocolo y puerto. Se rechazan solicitudes marcadas como `cross-site`, sin origen o provenientes de otros sitios. Hay límites persistidos para registro, inicio con correo y OAuth. Las consultas usan parámetros. El correo de registro local todavía no se verifica mediante envío de mensajes; no se ha implementado recuperación de contraseña, MFA ni envío de correo como parte de esta etapa.

## Configurar y probar Google

En Google Cloud, crea un cliente OAuth de tipo **Aplicación web** y configura la pantalla de consentimiento. Si está en modo de prueba, incluye los correos que participarán como usuarios de prueba. Guarda el ID y secreto reales en `.env.local` y reinicia la aplicación.

Registra exactamente:

```text
Origen local: http://localhost:3000
URI de redirección autorizada: http://localhost:3000/api/auth/google/callback
```

El callback se calcula como `${APP_URL}/api/auth/google/callback`. Para otro dominio/puerto, registra el callback correspondiente. Los dos botones públicos usan `/api/auth/google`; el servidor solicita únicamente `openid email profile`, código de autorización, PKCE S256, `state` y `nonce`. El callback valida el estado vinculado al navegador, su caducidad y uso único, e intercambia el código con Google. Verifica la firma RS256 con las claves de Google, emisor, audiencia, authorized party cuando corresponda, expiración, antigüedad del token, nonce y correo verificado. No guarda access tokens ni refresh tokens.

Una cuenta Google nueva recibe `usuario`, sin leer roles del proveedor. Si el `sub` ya está vinculado, conserva su ID y el rol actual de PostgreSQL. Si ya existe una cuenta local con ese correo, no se vincula automáticamente: inicia sesión con contraseña, abre **Mi cuenta → Vincular Google** y autoriza una cuenta de Google con el mismo correo. Esto también permite probar que un administrador conserva su rol. El callback de vinculación exige que siga vigente la misma sesión local.

**Pendiente real:** `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` aún están vacíos. No se verificaron consentimiento, intercambio de código ni callback contra una cuenta real de Google. Los botones muestran el estado de disponibilidad sin afirmar un inicio exitoso. Sí se probaron localmente la criptografía y el estado OAuth con tokens/identidades de ensayo, altas de rol usuario, conservación del rol existente y rechazo de estados o tokens inválidos. No hay bypass público para esas identidades de ensayo.

## Comprobaciones realizadas

```powershell
npm.cmd run check
npx.cmd playwright install chromium
# Con npm.cmd run start ejecutándose en otra terminal:
npm.cmd run test:auth
npm.cmd run test:auth-origins
npm.cmd run test:smoke
```

Las pruebas de autenticación verifican conexión, migración y seed repetidos sin duplicados ni cambios de ID, integridad de claves foráneas, registro real, normalización, duplicados, contraseña incorrecta, hash Argon2id, inicio y cierre, cookie HttpOnly, hash del token, rotación, revocación, caducidad y lectura del rol actualizado. Prueban ambos roles en páginas y API, y confirman que un registro con `role: administrador` es rechazado y no crea una cuenta.

Las pruebas de Google usan claves y tokens de ensayo para aceptar una firma válida y rechazar firma, emisor, audiencia, vencimiento, nonce o correo verificado inválidos. También cubren state de un solo uso, vinculación al navegador, caducidad, PKCE y rechazo de callbacks falsificados. Esta evidencia se distingue de la prueba pendiente con el proveedor real.

Se probaron los formularios en 1440, 390 y 320 px con registro, inicio y cierre desde el navegador. Se revisaron capturas de marca y adaptación móvil. Las pruebas públicas de etapa 1 verifican nuevamente las cinco páginas, redirecciones, imágenes y funciones de la tienda en cuatro tamaños. Los informes y capturas están en `artifacts/auth-verification.json`, `artifacts/verification.json` y `artifacts/auth-*.png`, sin seguimiento Git.

`test:auth` elimina únicamente sus cuentas temporales identificadas por correos aleatorios y sus flujos de ensayo. Repite el seed, por lo que revoca sesiones de las cuentas de prueba. No modifica productos ni datos comerciales. También se ejecutaron `git diff --check`, `git check-ignore .env.local` y `npm audit --omit=dev`.

Se detiene el trabajo al finalizar esta etapa. No se implementan inventario comercial, gestión de pedidos, pagos ni una etapa posterior.

## Referencias técnicas

- [API Routes de Next.js Pages Router](https://nextjs.org/docs/pages/building-your-application/routing/api-routes).
- [Pool reutilizable de node-postgres](https://node-postgres.com/features/pooling).
- [OpenID Connect de Google](https://developers.google.com/identity/openid-connect/openid-connect).
- [Almacenamiento de contraseñas de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

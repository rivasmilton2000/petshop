# LILAC & TOFFEE - PET SHOP

Etapas 1 y 2 terminadas: tienda en Next.js 16, React 19 y TypeScript usando **Pages Router**, con usuarios, roles, sesiones y autenticación en PostgreSQL. La implementación de la portada está en `index.tsx`, junto a `package.json`, y las demás páginas de la tienda permanecen en `src/pages/website`, con estilos en `src/pages/website/css/website.css`. Se conservan la plantilla editorial, el logo y las imágenes. Google está implementado; falta probar el proveedor real cuando se configuren sus credenciales.

## Ejecutar en Windows

Requisitos: Node.js 22 o superior y npm. Abre la carpeta del repositorio **interior**:

```powershell
cd C:\xampp\htdocs\petshop\petshop
npm.cmd ci
npm.cmd run db:create
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Abre **http://localhost:3000/**. `npm.cmd` evita el bloqueo de `npm.ps1` en PowerShell; no hace falta cambiar la política de ejecución de Windows.

Para el arranque diario, con las dependencias y la base ya configuradas, basta con mantener esta terminal abierta:

```powershell
cd C:\xampp\htdocs\petshop\petshop
npm.cmd run dev
```

`npm run dev` (o `npm.cmd run dev` en PowerShell) ejecuta `next dev`; el paso `predev` prepara automáticamente las imágenes, el logo y el CSS público. La URL correcta de la tienda es **http://localhost:3000/**, el inicio de sesión está en **http://localhost:3000/login** y el registro en **http://localhost:3000/login/register**. Mantén libre el puerto 3000 para que coincida con `APP_URL` y con el callback local de Google.

La URL anterior de XAMPP, `http://localhost/petshop/petshop/`, apunta a Apache y puede mostrar un listado de carpetas. Abrir `index.tsx` directamente, como archivo o mediante Apache, muestra el código y no ejecuta React. Accede a la tienda desde la URL del servidor Next.js; el archivo TSX es código de la aplicación y Next.js lo compila para generar la página.

La conexión local ya está configurada en `.env.local`, excluido de Git. En otra máquina, configura primero ese archivo siguiendo [docs/ETAPA-2.md](docs/ETAPA-2.md). PostgreSQL debe estar activo; las credenciales y los comandos de configuración se describen allí. El acceso local con correo y contraseña admite `localhost`, `127.0.0.1` y `[::1]` con el mismo protocolo y puerto de `APP_URL`. Así, con la configuración actual, puedes iniciar sesión tanto en `http://localhost:3000/login` como en `http://127.0.0.1:3000/login`. Otros puertos y sitios externos siguen bloqueados. Google mantiene el callback del origen exacto configurado en `APP_URL`.

Para producción:

```powershell
npm.cmd run build
npm.cmd run start
```

Esta aplicación corre en Node.js. XAMPP/PHP ya no ejecuta las páginas del proyecto. Si se sirve bajo un dominio de Apache, el servidor debe reenviar las peticiones al proceso de Next.js; las redirecciones de esta aplicación se resuelven en ese proceso. No se modificó la configuración global de Apache.

## Demo temporal para compartir

Se prepararon `scripts/Start-Demo.ps1` y `scripts/Stop-Demo.ps1` para ejecutar Next.js en producción y publicar solo `127.0.0.1:3000` mediante un túnel HTTPS de Cloudflare, sin abrir puertos del router. El enlace activo está en `artifacts/demo/state.json`. Las instrucciones para compartir, mantener los procesos abiertos, apagar la demo y la configuración pendiente de Google están en [docs/DEMO-TEMPORAL.md](docs/DEMO-TEMPORAL.md). PostgreSQL y Apache quedan fuera del túnel.

## Estructura y rutas

| Archivo | Ruta |
| --- | --- |
| `index.tsx` | Implementación real de la portada en la raíz del proyecto, fuera de `src` |
| `src/pages/index.tsx` | Puente mínimo: importa y exporta la portada raíz para servir `/` |
| `src/pages/website/about.page.tsx` | `/website/about` |
| `src/pages/website/shop.page.tsx` | `/website/shop?cat=cats` y demás categorías |
| `src/pages/website/product-detail.page.tsx` | `/website/product-detail?id=adjustable-eco-collar` |
| `src/pages/website/contact.page.tsx` | `/website/contact` |
| `src/pages/website/data/products.ts` | Datos tipados de ejemplo; no es una ruta |
| `src/components/` | Cabecera, pie, metadatos, carrito, tarjetas y motivos SVG |
| `src/pages/login/index.page.tsx` | `/login`, inicio de sesión |
| `src/pages/login/register.page.tsx` | `/login/register`, registro |
| `src/pages/login/account.page.tsx` | `/login/account`, cuenta con sesión validada en servidor |
| `src/pages/dashboard/index.page.tsx` | `/dashboard`, acceso mínimo restringido al administrador |
| `src/pages/api/auth/` | Registro, inicio, cierre, sesión, comprobación del administrador y OAuth Google |
| `src/server/db.ts` | Pool PostgreSQL reutilizable del lado del servidor |
| `database/migrations/` | Migraciones SQL versionadas con checksum y transacciones |

Next.js necesita un archivo de entrada dentro de `src/pages` para servir `/`. `src/pages/index.tsx` solo importa y exporta el componente de `../../index`; la implementación vive en la raíz, junto a `package.json`. La portada no tiene `getStaticProps`, `getServerSideProps` ni `getStaticPaths`, por lo que no hay funciones de carga que reexportar. Si se incorporan en el futuro, también deberán exportarse explícitamente desde el puente de la ruta.

`pageExtensions` admite `page.tsx`, `page.ts` y `tsx`. Así reconoce el puente `index.tsx` sin renombrar `_app.page.tsx`, `_document.page.tsx`, el login, el registro, las páginas públicas ni los endpoints `*.page.ts`. No admite `.ts` sin sufijo: `src/pages/website/data/products.ts` sigue sin convertirse en ruta; los componentes auxiliares permanecen en `src/components`, fuera de `src/pages`. Los estilos e imágenes tampoco son páginas. Se retiraron los dos `index.page.tsx` anteriores para evitar entradas duplicadas. `/website` conserva su redirección permanente a `/`.

Las cinco rutas PHP originales redirigen con HTTP 308 a sus reemplazos. Se mantienen `?cat=` y `?id=`. También se admiten los prefijos históricos de XAMPP `/petshop` y `/petshop/petshop`, así como los alias `/website/*.php`. Los IDs desconocidos devuelven 404; la ruta de detalle sin ID conserva el collar por defecto.

Los recursos originales siguen en `img/` y `src/pages/website/img/`. `npm run assets`, ejecutado automáticamente antes de desarrollo y compilación, los copia a `public/`, la carpeta que Next.js sirve por HTTP. Se excluyen los textos de prompt. El logo no se redibuja ni modifica. Las URLs antiguas de imágenes y CSS tienen reescrituras de compatibilidad. Las fuentes Playfair Display y Montserrat se sirven localmente mediante Fontsource.

## Contenido y alcance

Se aplica la paleta `#B69BC1`, `#AD7653`, `#F7EEE7`, `#493234`, `#E8CFCC`, `#FFFFFF`, con huella, hueso y corazón como detalles. El nombre exacto de la marca aparece en cabecera, pie y metadatos. La navegación y el contenido están en español.

El catálogo original estaba identificado como ejemplo. Conserva sus nueve slugs y fotografías para revisar la presentación; sus precios son ahora `null`. No se publican ofertas, testimonios, certificaciones, contactos, horarios, direcciones, mapas ni condiciones comerciales ficticias. El carrito permite guardar una selección de ejemplo en el navegador, sin pedidos ni pagos. El formulario prepara un texto para copiar y no envía ni persiste datos personales.

**PostgreSQL ya gestiona la autenticación.** El registro público asigna exclusivamente el rol `usuario`; las contraseñas usan Argon2id. Las sesiones de siete días se guardan en PostgreSQL mediante hashes de tokens aleatorios, con cookie HttpOnly. El rol se consulta en el servidor en cada acceso protegido. El seed repetible prepara una cuenta `usuario` y otra `administrador`, con credenciales tomadas de las variables `SEED_*` de `.env.local`. El área `/dashboard` solo comprueba el acceso de administrador; no incluye gestión de inventario, pedidos o pagos.

El PHP original no tenía esquema, consultas SQL ni datos persistidos; su catálogo era un array de ejemplos. Por eso el catálogo conserva sus datos TypeScript y no se importa como inventario comercial. El flujo compartido de Google valida tokens y crea nuevas cuentas como `usuario`, conservando los permisos de cuentas ya vinculadas. La vinculación de cuentas locales exige iniciar sesión con contraseña y usar el mismo correo de Google.

## Comprobaciones

```powershell
npm.cmd run check
npx.cmd playwright install chromium
# Con npm.cmd run start ejecutándose en otra terminal:
npm.cmd run test:smoke
npm.cmd run test:auth
npm.cmd run test:auth-origins
```

`check` ejecuta TypeScript estricto y la compilación de producción. Las pruebas de navegador verifican cinco páginas en 1440, 768, 390 y 320 px; redirecciones, parámetros, imágenes, fuentes, navegación móvil, búsqueda, categorías, orden, galería, variantes, cantidades, carrito persistente, cierre y foco con Escape, consulta local y preguntas con enlace directo. Se comprueban errores de JavaScript, solicitudes fallidas y desbordamiento horizontal. Las capturas y el informe se generan en `artifacts/` (sin seguimiento Git).

El inventario previo, las decisiones de migración y el plan de continuación están en [docs/ETAPA-1.md](docs/ETAPA-1.md). Los originales PHP se retiraron solo después de verificar sus reemplazos; hay un respaldo local en `.migration-backup/etapa-1-originales.zip` y las versiones originales siguen en Git.

La configuración de PostgreSQL, el esquema, las variables del seed, las pruebas de autenticación, el callback de Google y las limitaciones verificadas están en [docs/ETAPA-2.md](docs/ETAPA-2.md). No se ha iniciado una etapa posterior.

# LILAC & TOFFEE - PET SHOP

Tienda, autenticación, inventario y checkout implementados (Wompi real pendiente de credenciales): tienda en Next.js 16, React 19 y TypeScript usando **Pages Router**, con autenticación, dashboard compartido por roles y catálogo en PostgreSQL. La implementación de la portada está en `index.tsx`, junto a `package.json`, y las demás páginas de la tienda permanecen en `src/pages/website`, con estilos en `src/pages/website/css/website.css`. Se conservan la plantilla editorial, el logo y las imágenes. Google está implementado; falta probar el proveedor real cuando se configuren sus credenciales.

## Ejecutar en Windows

Requisitos: Node.js 22 o superior y npm. Abre la carpeta del repositorio **interior**:

```powershell
cd C:\xampp\htdocs\petshop\petshop
npm.cmd ci
npm.cmd run db:create
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run db:catalog
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

Si la demo está activa, usa su enlace HTTPS para iniciar sesión. Para volver a desarrollo local en el puerto 3000, apágala con `scripts/Stop-Demo.ps1` y después ejecuta `npm.cmd run dev`. El proceso de la demo usa su dominio HTTPS como origen autorizado, sin cambiar `.env.local`.

Los scripts ejecutan Next.js en producción y publican solo su puerto local mediante Cloudflare, sin abrir puertos del router. PostgreSQL y Apache quedan fuera del túnel. Para encender:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/Start-Demo.ps1
```

Si ya está encendida, devuelve el mismo enlace. Si el puerto está ocupado por `next dev` del mismo proyecto, lo sustituye por el servidor de producción; si pertenece a otro servicio, lo conserva y selecciona un puerto libre. Los registros viejos se limpian sin detener procesos ajenos. El enlace y el puerto reales se guardan en `artifacts/demo/state.json`.

Para recompilar una demo activa, añade `-Restart`; se generará un enlace nuevo. Para apagar:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/Stop-Demo.ps1
```

Next.js y cloudflared quedan en segundo plano. Mantén el PC encendido, con Internet y sin suspensión. Google sigue pendiente de credenciales y de autorizar el callback del dominio temporal.

## Estructura y rutas

| Archivo | Ruta |
| --- | --- |
| `index.tsx` | Implementación real de la portada en la raíz del proyecto, fuera de `src` |
| `src/pages/index.tsx` | Puente hacia la portada raíz y carga de catálogo del servidor para `/` |
| `src/pages/website/about.page.tsx` | `/website/about` |
| `src/pages/website/shop.page.tsx` | `/website/shop?cat=cats` y demás categorías |
| `src/pages/website/product-detail.page.tsx` | `/website/product-detail?id=adjustable-eco-collar` |
| `src/pages/website/contact.page.tsx` | `/website/contact` |
| `src/pages/website/data/products.ts` | Datos tipados de ejemplo; no es una ruta |
| `src/components/` | Cabecera, pie, metadatos, carrito, tarjetas y motivos SVG |
| `src/pages/login/index.page.tsx` | `/login`, inicio de sesión |
| `src/pages/login/register.page.tsx` | `/login/register`, registro |
| `src/pages/login/account.page.tsx` | Redirección compatible al perfil del dashboard |
| `src/pages/dashboard/index.tsx` | `/dashboard`, única página y componentes del panel compartido por roles |
| `src/pages/dashboard/types.ts` y `dashboard.module.css` | Tipos, constantes y estilos propios del panel, sin rutas adicionales |
| `src/pages/api/dashboard/` | Perfil y sesiones propios; catálogo y cuentas solo para administradores |
| `src/pages/api/auth/` | Registro, inicio, cierre, sesión, comprobación del administrador y OAuth Google |
| `src/server/db.ts` | Pool PostgreSQL reutilizable del lado del servidor |
| `database/migrations/` | Migraciones SQL versionadas con checksum y transacciones |

Next.js necesita un archivo de entrada dentro de `src/pages` para servir `/`. `src/pages/index.tsx` importa y exporta el componente de `../../index`; la implementación visual vive en la raíz, junto a `package.json`. Desde la etapa 3, la ruta añade `getServerSideProps` para cargar el catálogo de PostgreSQL. La consulta permanece en la ruta para excluir el código del servidor del bundle público.

`pageExtensions` admite `page.tsx`, `page.ts` y `tsx`. Así reconoce el puente `index.tsx` sin renombrar `_app.page.tsx`, `_document.page.tsx`, el login, el registro, las páginas públicas ni los endpoints `*.page.ts`. No admite `.ts` sin sufijo: los datos y tipos no se convierten en rutas. Los componentes específicos del panel se colocan en su único `index.tsx`, con tipos y CSS al lado, para evitar rutas accidentales. Los componentes generales permanecen en `src/components`. Se retiraron los antiguos `index.page.tsx` de portada y dashboard para evitar duplicados. `/website` conserva su redirección permanente a `/`.

Las cinco rutas PHP originales redirigen con HTTP 308 a sus reemplazos. Se mantienen `?cat=` y `?id=`. También se admiten los prefijos históricos de XAMPP `/petshop` y `/petshop/petshop`, así como los alias `/website/*.php`. Los IDs desconocidos devuelven 404; la ruta de detalle sin ID conserva el collar por defecto.

Los recursos originales siguen en `img/` y `src/pages/website/img/`. `npm run assets`, ejecutado automáticamente antes de desarrollo y compilación, los copia a `public/`, la carpeta que Next.js sirve por HTTP. Se excluyen los textos de prompt. El logo no se redibuja ni modifica. Las URLs antiguas de imágenes y CSS tienen reescrituras de compatibilidad. Las fuentes Playfair Display y Montserrat se sirven localmente mediante Fontsource.

## Contenido y alcance

Se aplica la paleta `#B69BC1`, `#AD7653`, `#F7EEE7`, `#493234`, `#E8CFCC`, `#FFFFFF`, con huella, hueso y corazón como detalles. El nombre exacto de la marca aparece en cabecera, pie y metadatos. La navegación y el contenido están en español.

El catálogo original estaba identificado como ejemplo. Sus nueve slugs, textos, imágenes y variantes se importan de forma repetible a PostgreSQL mediante `db:catalog`, sin sobrescribir posteriores ediciones del administrador. Sus precios siguen siendo `null`. Portada, catálogo y detalle consultan solo los productos visibles de la base. No se publican ofertas, testimonios, certificaciones, contactos, horarios, direcciones, mapas ni condiciones comerciales ficticias. El carrito conserva la selección en el navegador y verifica precios y stock en PostgreSQL al modificarla y preparar un pedido. El checkout añade entrega/recogida y pago alojado con Wompi SV. Al iniciar el pago se reserva stock; solo una confirmación verificada por el servidor lo descuenta. Las preparaciones anteriores siguen siendo comprobaciones sin reserva. El formulario de contacto prepara un texto para copiar y no envía ni persiste datos personales.

**PostgreSQL gestiona autenticación y catálogo.** El registro público asigna exclusivamente el rol `usuario`; las contraseñas usan Argon2id. Las sesiones de siete días se guardan mediante hashes de tokens aleatorios, con cookie HttpOnly. El rol se consulta en el servidor en cada acceso protegido. El seed repetible prepara una cuenta `usuario` y otra `administrador`, con credenciales tomadas de las variables `SEED_*` de `.env.local`.

Ambos roles se dirigen a `/dashboard`: el usuario consulta/edita su perfil y administra sus propias sesiones; el administrador añade Productos, Inventario, Notificaciones y consulta de cuentas reales. Administra precios y stock; los productos agotados siguen visibles y la eliminación archiva el historial. La sección Pedidos permite consultar estados; las confirmaciones tardías sin stock generan una revisión administrativa. El PHP original no tenía esquema SQL; la etapa 3 crea el esquema del catálogo y conserva sus datos TypeScript únicamente como fuente de importación inicial. El flujo compartido de Google valida tokens y crea nuevas cuentas como `usuario`, conservando los permisos existentes. La vinculación requiere sesión local y el mismo correo de Google.

## Comprobaciones

```powershell
npm.cmd run check
npx.cmd playwright install chromium
# Con npm.cmd run start ejecutándose en otra terminal:
npm.cmd run test:smoke
npm.cmd run test:auth
npm.cmd run test:auth-origins
npm.cmd run test:dashboard
npm.cmd run test:inventory
npm.cmd run test:checkout
npm.cmd run test:public-design
```

`check` ejecuta TypeScript estricto y la compilación de producción. Las pruebas de navegador verifican cinco páginas en 1440, 768, 390 y 320 px; redirecciones, parámetros, imágenes, fuentes, navegación móvil, búsqueda, categorías, orden, galería, variantes, cantidades, carrito persistente, cierre y foco con Escape, consulta local y preguntas con enlace directo. Se comprueban errores de JavaScript, solicitudes fallidas y desbordamiento horizontal. Las capturas y el informe se generan en `artifacts/` (sin seguimiento Git).

El inventario previo, las decisiones de migración y el plan de continuación están en [docs/ETAPA-1.md](docs/ETAPA-1.md). Los originales PHP se retiraron solo después de verificar sus reemplazos; hay un respaldo local en `.migration-backup/etapa-1-originales.zip` y las versiones originales siguen en Git.

La configuración de PostgreSQL, el seed y Google están en [docs/ETAPA-2.md](docs/ETAPA-2.md). Las funciones por rol, las nuevas migraciones, la seguridad del panel y sus pruebas están en [docs/ETAPA-3.md](docs/ETAPA-3.md). La sesión visible, el inventario, las alertas, las API para preparar el checkout y la migración 003 se describen en [docs/ETAPA-4-INVENTARIO.md](docs/ETAPA-4-INVENTARIO.md). Los productos heredados empiezan con stock 0 y mantienen sus precios pendientes hasta que el administrador confirme esos datos. La entrega, ubicación opcional, reservas y pago Wompi SV están documentados en [docs/ETAPA-5-CHECKOUT.md](docs/ETAPA-5-CHECKOUT.md), con la migración 004, variables y datos que faltan para probar con el banco. No se inventaron tarifas ni credenciales.

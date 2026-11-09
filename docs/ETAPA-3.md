# Etapa 3: dashboard compartido y catálogo PostgreSQL

## Funciones por rol

Los dos roles entran a la misma ruta `/dashboard`, con el mismo layout, cabecera, navegación, logo, paleta oficial, Playfair Display y Montserrat. El login, el registro y el callback de Google dirigen a esa ruta. `/login/account` permanece como redirección al perfil del panel.

| Función | Usuario | Administrador |
| --- | --- | --- |
| Inicio | Datos de su cuenta, sesiones activas y estado de vinculación Google | Conteos reales de productos, productos visibles y cuentas |
| Mi perfil | Consulta sus datos y actualiza su nombre | Las mismas operaciones, sobre su propia cuenta |
| Seguridad | Consulta sus sesiones y cierra las demás, conservando la actual | Las mismas operaciones, sobre su propia cuenta |
| Google | Consulta su vinculación; puede vincular cuando esté configurado | Igual comportamiento |
| Catálogo | Sin acceso por menú, URL ni API administrativa | Crea y edita productos, especies, categoría, imagen y variantes; publica o archiva |
| Cuentas | Sin acceso | Consulta las últimas 200 cuentas reales, sus roles, fechas y vinculación Google |

No hay módulos de ventas, pagos, pedidos ni existencias: el proyecto no maneja esos datos. El carrito de ejemplo sigue siendo local al navegador y no se presenta como historial de pedidos ni como información privada de una cuenta. La consulta de cuentas es de lectura; no incluye cambios de rol, contraseñas o eliminación de usuarios.

## Una sola página del panel

`src/pages/dashboard/index.tsx` es la única página del dashboard. Contiene los componentes propios `DashboardLayout`, `Overview`, `ProfilePanel`, `SecurityPanel`, `CatalogPanel`, `ProductEditor` y `AccountsPanel`. Se colocan en ese archivo para que el soporte existente de `.tsx` no convierta archivos auxiliares en rutas. Los tipos y constantes están en `src/pages/dashboard/types.ts`, excluido de las extensiones de página, y los estilos se aíslan en `dashboard.module.css`. Se retira `index.page.tsx`.

La selección del módulo utiliza `?section=profile`, `security`, `catalog` o `users`, siempre dentro de `/dashboard`. La página valida la sesión y el rol mediante `getServerSideProps` en cada petición, incluidas las navegaciones de Next. Sin sesión redirige al login. Un usuario que solicita un módulo administrativo recibe HTTP 403 y no recibe sus datos en las props.

## Datos de catálogo

Se aplica la migración `002_catalog.sql`: categorías, productos y variantes, con claves foráneas, fechas, visibilidad, marca de ejemplo, versión para concurrencia y referencia al administrador que actualiza un registro.

`db:catalog` importa explícitamente los nueve productos de ejemplo existentes en TypeScript, con sus slugs, textos, imágenes y dos variantes del collar. No inventa productos comerciales ni precios. Todos conservan `is_demo=true` y precio `NULL`. Al repetir la importación solo inserta slugs ausentes; no sobrescribe ediciones, variantes ni archivos del administrador. La importación completa se ejecuta en una transacción con bloqueo.

El panel permite trabajar con esos registros e incorporar otros productos de ejemplo. Las imágenes se eligen entre los diez recursos existentes de la tienda; no se implementa carga de archivos. Los productos nuevos comienzan ocultos, salvo que el administrador marque su visibilidad. Archivar retira el producto de la tienda sin eliminar su registro. Los precios y existencias no se editan ni se publican en esta etapa porque siguen pendientes de confirmación comercial.

Portada, catálogo, detalle y carrito consultan el catálogo público de PostgreSQL. Los productos archivados no aparecen en la selección pública y su detalle devuelve 404. El servidor conserva el orden inicial y los enlaces existentes. No hay copia estática de respaldo que oculte fallos de conexión ni que vuelva a publicar un producto archivado.

`index.tsx` continúa en la raíz con la implementación visual de la portada. `src/pages/index.tsx` importa ese componente y añade la carga de catálogo mediante `getServerSideProps`. La consulta se define en la ruta para que Next.js elimine las dependencias PostgreSQL del bundle del navegador.

## Protección del servidor

Todas las operaciones usan el pool de `src/server/db.ts`. La sesión se valida contra PostgreSQL; el rol se relee en cada petición. Ocultar opciones de navegación no es la barrera de autorización.

| Endpoint | Permiso y comportamiento |
| --- | --- |
| `GET /api/catalog` | Público; solo productos visibles, sin metadatos internos de edición |
| `GET /api/dashboard/profile` | Solo el perfil de la sesión actual |
| `POST /api/dashboard/profile` | Solo admite `name`; el ID se toma de la sesión, no del cliente |
| `GET /api/dashboard/sessions` | Solo sesiones propias, sin tokens ni hashes |
| `POST /api/dashboard/sessions` | Cierra otras sesiones propias; conserva la sesión que hace la petición |
| `GET /api/dashboard/users` | Solo administrador; no devuelve hashes, contraseñas ni tokens |
| `GET/POST /api/dashboard/catalog` | Solo administrador; listado y creación |
| `GET/POST /api/dashboard/catalog/:id` | Solo administrador; consulta y edición, incluida visibilidad |

Perfil y sesiones rechazan selectores de otra cuenta o campos de permisos. Los módulos administrativos responden 401 sin sesión y 403 con rol usuario. Todas las mutaciones mantienen las comprobaciones de origen y JSON de la etapa 2; las consultas usan parámetros. La página y las API personales usan `Cache-Control: no-store`.

La creación/edición de productos valida identificadores, longitudes, categorías, especies, imágenes y variantes. Las escrituras son transaccionales. La versión del registro debe coincidir al editar: si otra operación lo cambió, responde 409 para evitar sobrescribir cambios. El identificador de un producto existente no se modifica. Las fechas del perfil y las sesiones se serializan como ISO para el navegador.

## Ejecutar y actualizar

Con la base y `.env.local` de la etapa 2:

```powershell
cd C:\xampp\htdocs\petshop\petshop
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run db:catalog
npm.cmd run dev
```

En una instalación nueva también se ejecutan `db:create` y `db:seed`, como se describe en ETAPA-2. No es necesario repetir el seed de usuarios para actualizar a esta etapa; las credenciales existentes se conservan.

## Pruebas

```powershell
npm.cmd run check
npm.cmd run test:auth-origins
# Con el servidor Next.js ejecutándose en otra terminal:
npm.cmd run test:dashboard
npm.cmd run test:auth
npm.cmd run test:smoke
```

`test:dashboard` crea cuentas y productos temporales identificados por UUID, verifica permisos y persistencia, y los elimina al terminar. Comprueba:

- Ambos roles llegan a `/dashboard` tras el login y usan el mismo layout.
- Sin sesión se redirige al login y las API protegidas responden 401.
- El usuario no ve módulos administrativos y recibe 403 si los abre por URL o API, incluso enviando un rol falso.
- Un ID ajeno no permite leer ni cambiar perfiles o sesiones; cerrar otros accesos no afecta otra cuenta.
- El nombre se guarda en PostgreSQL; las sesiones no exponen tokens ni hashes.
- El administrador crea, edita, publica y archiva productos con variantes; el catálogo y el detalle públicos reflejan el cambio.
- Se rechazan duplicados, versiones obsoletas, imágenes fuera de la lista, campos de precio no autorizados y orígenes externos.
- El rol actualizado en PostgreSQL se respeta incluso con una cookie anterior.
- Los formularios, menús y acciones funcionan en escritorio 1440 px y móviles 390/320 px, sin errores JavaScript ni desbordamiento horizontal.

La autenticación de etapa 2 se actualiza para verificar el dashboard compartido, conservando la prohibición de registro como administrador. Las pruebas públicas cubren portada, catálogo, imágenes, fuentes, filtros, carrito y rutas históricas. El build confirma una sola ruta `/dashboard`, sin rutas para `types.ts` ni componentes auxiliares.

Las evidencias se generan en `artifacts/dashboard-verification.json` y `artifacts/dashboard-*.png`; no se guardan contraseñas en esos artefactos. Google continúa pendiente de credenciales y de una prueba real con el proveedor, como en la etapa 2. No se avanza a una etapa posterior.

La verificación final del panel también se ejecutó contra la compilación de producción, mediante el túnel HTTPS que ya estaba abierto. Se conservó su enlace al actualizar únicamente el proceso Next.js; el registro local `artifacts/demo/state.json` se actualizó para que `Stop-Demo.ps1` pueda apagarlo correctamente. La portada raíz y su puente permanecen en sus ubicaciones anteriores.

Referencias: [getServerSideProps de Next.js](https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props) y [transacciones de node-postgres](https://node-postgres.com/features/transactions).

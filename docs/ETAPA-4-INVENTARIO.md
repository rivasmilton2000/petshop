# Sesión visible, catálogo e inventario

Se reutilizan la autenticación con cookie HttpOnly, los roles `usuario` y
`administrador`, el pool de PostgreSQL y el catálogo de la etapa anterior.
Login y registro siguen en `src/pages/login`; existe un único dashboard en
`src/pages/dashboard/index.tsx`. No se añadieron páginas de panel separadas.

## Migración aplicada

`database/migrations/003_inventory_checkout.sql`, después de `001_auth.sql` y
`002_catalog.sql`. Se ejecuta desde la raíz interior del repositorio:

```powershell
cd C:\xampp\htdocs\petshop\petshop
npm.cmd run db:migrate
```

El ejecutor existente usa transacciones, exclusión mutua y checksums; repetir
el comando no duplica ni vuelve a modificar los datos. No edites migraciones
aplicadas: crea otra si hay que evolucionar el esquema.

La migración añade:

- `catalog_products.stock`, entero de 0 a 1 000 000, y `archived_at`.
- Un índice para productos activos agotados y una restricción que impide
  marcar como activo un producto retirado.
- `inventory_movements`, con stock anterior, stock nuevo, motivo y administrador.
- `checkout_preparations` y `checkout_preparation_items`, con propietario,
  clave de idempotencia, vencimiento, nombres e imágenes de referencia y precios
  en centavos. Sus claves foráneas conservan la relación histórica con el producto.

Los productos, slugs, variantes, descripciones, imágenes y precios anteriores
se conservan. Como no había stock registrado, se inicializa en **0**. No se
inventaron existencias ni precios: los nueve ejemplos originales mantienen su
precio pendiente hasta que el administrador lo indique. `db:catalog` sigue
sin sobrescribir los registros existentes y usa stock 0 para nuevas importaciones.

## Uso

El encabezado muestra “Ingresar” cuando la sesión se ha comprobado y no hay
usuario. Con sesión muestra su nombre real; el desplegable identifica el rol,
enlaza a “Ver mi perfil” y permite “Cerrar sesión”. El perfil existente sigue
en `/dashboard?section=profile`; `/login/account` conserva su redirección.
La sesión se vuelve a consultar al navegar, recargar y recuperar el foco.
Cerrar sesión elimina la cookie y revoca el token en PostgreSQL; las otras
pestañas reciben una señal para consultar la sesión de nuevo.

El administrador dispone de:

- **Productos** (`section=catalog`): crear, editar nombre, descripción, precio,
  stock, categoría, especies, imagen, variantes y visibilidad; retirar con
  confirmación. Se usan las imágenes existentes, no una carga de archivos nueva.
- **Inventario** (`section=inventory`): consultar y establecer el stock total.
  “Reponer stock” abre el campo y “Guardar stock” persiste el valor.
- **Notificaciones** (`section=notifications`): una fila por producto activo
  con stock 0, con las mismas acciones de reposición y eliminación. Son una
  consulta, no registros insertados en cada carga. Se actualizan al guardar,
  volver a la pestaña y cada 30 segundos mientras la página está visible.

Las secciones previas de inicio, perfil, seguridad y cuentas se mantienen.
La navegación lateral se puede abrir, cerrar y cerrar con Escape en móvil.
Las páginas y las API comprueban el rol real en el servidor.

“Eliminar producto” realiza **archivo lógico** (`active=false`, `archived_at`),
también si aún no tiene referencias: así se conserva todo el historial y el
identificador no se reutiliza accidentalmente. Desaparece de las listas de
gestión ordinaria, del catálogo y de las alertas; su detalle público devuelve 404.
Las claves foráneas impiden el borrado físico si tiene historial. Un producto
retirado no puede volver a activarse mediante la API de edición.

Los agotados permanecen en el catálogo, muestran “Agotado” y bloquean la acción
de añadir al carrito. Los productos sin precio confirmado también bloquean
la compra. Una página antigua puede mostrar información anterior, pero el
servidor vuelve a comprobarla antes de aceptar cualquier cantidad.

## API y contrato para checkout

Todas las respuestas son `no-store`. Las mutaciones requieren origen autorizado
y JSON; no se confía en el rol, los precios ni los totales del navegador.

| Ruta | Acceso y operación |
| --- | --- |
| `GET /api/catalog` | Catálogo público actual, incluidos stock y precio; excluye retirados y ocultos. |
| `GET/POST /api/dashboard/catalog` | Administrador: listar y crear productos. |
| `GET/POST/DELETE /api/dashboard/catalog/:id` | Administrador: consultar, editar y retirar. |
| `GET/POST /api/dashboard/inventory` | Administrador: listar y actualizar `{id, stock, version}`. |
| `GET /api/dashboard/notifications` | Administrador: productos activos agotados, uno por ID. |
| `POST /api/cart` | Público, mismo origen: validar el carrito completo y devolver precios y totales vigentes. |
| `POST /api/checkout/prepare` | Usuario autenticado: revalidar y guardar una preparación idempotente. |

Ediciones y eliminaciones exigen `version`; un formulario antiguo recibe 409.
Precio: número no negativo, máximo dos decimales; stock: entero dentro del límite.
Se permite conservar `null` en precios heredados durante una edición por API,
pero no crear un producto nuevo sin precio ni preparar la compra de uno sin precio.
Las categorías, imágenes y especies deben pertenecer a las opciones admitidas.

`/api/cart` recibe exclusivamente:

```json
{"items":[{"id":"producto","color":"","qty":2}]}
```

Acepta hasta 100 líneas; cada cantidad debe ser entera entre 1 y 99. Se agrupan
líneas duplicadas y se suma el consumo de todas las variantes del mismo producto
contra su stock total. Se rechazan fracciones, negativos, ceros, cantidades
excesivas, variantes inexistentes y productos retirados, ocultos o agotados.
Devuelve `CartQuote` de `src/types/cart.ts`, con productos, líneas, moneda USD
y totales enteros en centavos obtenidos de PostgreSQL. El carrito conserva el
almacenamiento local existente, sin tratar esos datos como inventario autorizado.

`/api/checkout/prepare` recibe `items` y una `idempotencyKey` UUID v4. Devuelve
`PreparedCheckout` con ID, vencimiento a 15 minutos, total y `reserved:false`.
Reintentar la misma clave y selección no duplica la preparación. Los precios
cambiados, las preparaciones vencidas y el stock insuficiente invalidan el
reintento. Las filas de productos se bloquean en orden estable durante la
validación y la captura histórica; cambios de variantes se leen después de
adquirir los bloqueos, sin mezclar versiones de producto.

**La preparación no confirma una venta, no reserva ni descuenta stock y no
procesa pagos.** El botón del carrito lo explica. La siguiente etapa debe usar
la preparación del usuario correspondiente, comprobar vencimiento y volver a
validar stock/precios dentro de la misma transacción que crea el pedido y
descuenta existencias con una actualización condicionada (`stock >= cantidad`).
Debe aplicar idempotencia a esa confirmación. No debe aceptar un total del
cliente ni descontar usando solo una preparación anterior. La restricción de
PostgreSQL impide stock negativo incluso si una futura ruta comete un error.

## Verificación

Con PostgreSQL activo y Next.js usando el mismo origen de `APP_URL`:

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:auth-origins
# Si las pruebas usan un puerto alternativo, inicia Next con APP_URL coincidente:
$env:APP_URL = 'http://localhost:3001'
# En una terminal: npm.cmd run dev -- --port 3001
$env:TEST_BASE_URL = 'http://localhost:3001'
npm.cmd run test:inventory
npm.cmd run test:dashboard
npm.cmd run test:auth
npm.cmd run test:smoke
npm.cmd run test:public-design
```

`test:inventory` crea cuentas y productos temporales y elimina solo sus propios
datos al terminar. Verifica:

- API administrativas denegadas a anónimos/clientes, incluso eliminación;
  denegación por página y comprobación del rol actual en las suites existentes.
- Precio, stock, cantidades, variantes, duplicados, CSRF y totales manipulados.
- Stock compartido por variantes y edición concurrente con conflicto de versión.
- Restricciones de stock no negativo y conservación de referencias históricas.
- Preparación autenticada, idempotencia concurrente, cambios de precio,
  vencimiento y rechazo después de agotar/retirar el producto.
- En 1440, 390 y 320 px: sesión visible, ingreso/recarga/perfil/rol/cierre,
  permisos de cliente, crear/publicar, modificar cantidades del carrito,
  agotar con una página abierta, alerta única tras recargar, reponer y retirar
  con confirmación, conservando el historial.

Los resultados y capturas están en `artifacts/inventory/verification.json` y
`artifacts/inventory/`. Las otras suites conservan sus informes en `artifacts/`.
Se completaron TypeScript, compilación de producción, `test:inventory`,
`test:dashboard`, `test:auth`, `test:auth-origins`, `test:smoke` y
`test:public-design`. Las pruebas funcionales usaron el servidor de desarrollo
en `http://localhost:3001`, con `APP_URL` coincidente. La revisión automática
bloqueó el arranque adicional de producción en el puerto 3000 con
“blocked by policy”, sin proporcionar otro motivo; no se verificó ese arranque.
Google se prueba con identidades de ensayo en la suite existente; no se ha
verificado el proveedor real porque faltan sus credenciales.

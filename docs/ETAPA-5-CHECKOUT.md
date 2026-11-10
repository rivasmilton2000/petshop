# Checkout, entrega y Wompi de Banco Agrícola (El Salvador)

## Alcance y rutas

Se conservan Next.js con TypeScript, Pages Router, la sesión HttpOnly, PostgreSQL,
el carrito local validado por el servidor, el catálogo y el dashboard único.

- `/website/checkout`: contacto, entrega/recogida, dirección, ubicación opcional,
  resumen y botón **Pagar con Wompi**. Se accede desde el carrito.
- `/website/order?id=UUID`: estado y detalle privado. Solo el propietario y un
  administrador pueden leerlo. Los parámetros del navegador nunca marcan pagado.
- `/dashboard?section=orders`: pedidos propios; los administradores ven los pedidos
  de la tienda. Se mantiene la misma página de dashboard.
- `/dashboard?section=notifications`: también avisa de pagos aprobados que necesitan
  revisión de entrega o de un cobro adicional inesperado.

El login local conserva el destino del checkout al entrar o cambiar entre acceso
y registro. El formulario no recoge números de tarjeta ni CVV: esos datos se
ingresan únicamente en la interfaz alojada de Wompi.

## Fuente territorial oficial

El catálogo versionado está en `src/data/el-salvador.ts`: **14 departamentos,
44 municipios y 262 distritos**, con IDs de distrito calificados por municipio
para evitar homónimos. No se consulta un mapa para llenar estos selectores.

Se contrastaron los grupos de municipios/distritos del artículo 1 del
[Decreto Legislativo 762, texto consolidado de la Corte Suprema de Justicia](https://www.jurisprudencia.gob.sv/DocumentosBoveda/D/2/2020-2029/2023/06/F9625.PDF),
incluida la denominación de San Salvador y Capital de la República conforme a la
[reforma DL 978](https://www.jurisprudencia.gob.sv/DocumentosBoveda/R/2/2020-2029/2023/06/100A8A.HTML).
Revisión realizada el 9 de noviembre de 2026. Se normalizan acentos y mayúsculas
solo para reconocer nombres de geocodificación; los selectores conservan los
nombres del catálogo. La denominación corta «San Salvador» es un alias de búsqueda.

Al cambiar departamento se limpian municipio y distrito; al cambiar municipio se
limpia distrito. El servidor valida que los tres IDs pertenezcan a una misma rama.
La dirección exacta es obligatoria para entrega (10–500 caracteres), y la referencia
es opcional (hasta 300). En recogida se rechaza una dirección enviada por el cliente.
Los nombres territoriales se copian al pedido para conservar la dirección histórica.

## Ubicación opcional

El botón llama `navigator.geolocation.getCurrentPosition` exclusivamente después
de pulsarlo, con permiso del navegador, espera máxima de 15 segundos y sin reutilizar
una posición vieja. Se requiere **HTTPS**; los navegadores admiten `localhost` como
contexto confiable de desarrollo. Una política `Permissions-Policy` del hosting
también puede bloquear geolocalización: habilitar `geolocation=(self)` si se configura.

La geocodificación inversa se hace en el servidor con Google Geocoding API, clave
privada `GOOGLE_MAPS_API_KEY`, API habilitada y configuración de facturación/cuotas
del proveedor. Restringir la clave a esa API y a las IP del servidor cuando sea
posible. No usar `NEXT_PUBLIC_` ni enviar la clave al navegador.

La sugerencia se cruza por coincidencias normalizadas únicas con el catálogo local:

- Se exige país `SV`. No se inventan municipios a partir de texto parecido.
- Precisión GPS superior a 1 km: solo departamento si se reconoce inequívocamente.
- Distrito/municipio ambiguos o contradictorios: únicamente niveles identificables.
- Dirección sugerida solo con precisión GPS de hasta 100 m y resultado de tipo
  dirección/premisa con precisión `ROOFTOP` o `RANGE_INTERPOLATED`, sin coincidencia parcial.
- Nada se aplica automáticamente: se muestra una revisión y **Confirmar y usar
  sugerencia** o **Descartar**. Todos los campos siguen editables. Cambios incompatibles
  en la dirección retiran la ubicación opcional; editar solo la referencia la conserva.
- Permiso denegado, timeout, falta de clave o fallo del proveedor mantienen el formulario manual.

No se persiste ni se cachea la respuesta cruda del proveedor. El pedido recibe solo
los datos de entrega que el cliente confirma y envía; las coordenadas opcionales
provienen del navegador. Se muestra atribución Google Maps junto a la sugerencia.
Antes de habilitar el proveedor en un comercio público, completar sus páginas reales
de privacidad/términos y revisar las condiciones aplicables a su cuenta del proveedor.

Referencias técnicas: [geocodificación inversa](https://developers.google.com/maps/documentation/geocoding/requests-reverse-geocoding),
[atribución y políticas](https://developers.google.com/maps/documentation/geocoding/policies),
[permiso de geolocalización](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition).

## Tarifas: sin importes comerciales inventados

No había tarifas confirmadas. Por defecto la compra se **bloquea** con una
explicación cuando falta la tarifa del destino o de recogida.

Variables privadas de configuración:

| Variable | Contenido |
| --- | --- |
| `SHIPPING_RATES_JSON` | JSON con mapas `departments`, `municipalities`, `districts`. Cada clave es un ID del catálogo y cada valor es un entero de centavos USD. |
| `PICKUP_FEE_CENTS` | Costo confirmado de recogida en centavos; `0` solo si se confirma que es gratuita. |
| `PICKUP_INSTRUCTIONS` | Dirección, horario e instrucciones reales para recoger. Sin estas instrucciones también se bloquea recogida. |

Estructura inicial sin tarifas:

```json
{"departments":{},"municipalities":{},"districts":{}}
```

La prioridad es distrito → municipio → departamento. Un importe en centavos
representa una tarifa fija para ese destino; no se usa distancia del mapa.
No hay valor por defecto que convierta un envío desconocido en gratuito.
Como referencia aritmética, USD 5.00 equivale a 500 centavos; **esto no es una tarifa
configurada de la tienda**. Los costos se calculan y se vuelven a validar en el
servidor al crear el pedido. No se aceptan subtotales, envío ni totales del navegador.

## Integración oficial Wompi SV

Se usa **Enlace de Pago alojado**, apropiado para ingresar el medio de pago fuera
del sitio. No se usa la API de Colombia, ni llaves `pub_test`, ni moneda COP.

Fuentes oficiales consultadas:

- [Autenticación OAuth client credentials](https://docs.wompi.sv/autenticacion/autenticacion):
  `POST https://id.wompi.sv/connect/token`, `grant_type=client_credentials`,
  `audience=wompi_api`, App ID y API Secret del negocio.
- [Crear enlace](https://docs.wompi.sv/metodos-api/enlace-de-pago):
  `POST https://api.wompi.sv/EnlacePago`.
- [OpenAPI oficial](https://api.wompi.sv/swagger/v1/swagger.json):
  `GET /Aplicativo`, `GET /EnlacePago/{id}`, `GET /TransaccionCompra/{id}` y
  `PUT /EnlacePago/{id}/desactivar` (también se admite respuesta 200 sin cuerpo).
- [Validar webhook](https://docs.wompi.sv/webhook/validar-webhook):
  `wompi_hash`, HMAC-SHA256 del cuerpo exacto con el API Secret.
- [Hash del regreso de un enlace](https://docs.wompi.sv/redirect-url/validar-parametros-url-redirect):
  concatenación exacta de `identificadorEnlaceComercio + idTransaccion + idEnlace + monto`.
- [Modo desarrollo/pruebas](https://docs.wompi.sv/metodos-api/transaccion_prueba):
  se selecciona en el negocio del panel Wompi; usa la misma API SV. La documentación
  indica CVV `111` para simular rechazo en pagos normales y advierte que esto no
  simula rechazos 3DS. El escenario de prueba permitido debe confirmarse con la cuenta.

Las variables nuevas están documentadas **solo por nombre** en `.env.example`:

| Variable | Uso |
| --- | --- |
| `WOMPI_CLIENT_ID` | App ID del negocio. |
| `WOMPI_CLIENT_SECRET` | API Secret, también utilizado para validar HMAC. |
| `WOMPI_MODE` | `test` (predeterminado) o `live`. Debe coincidir con el negocio y el pago. |
| `WOMPI_ENABLE_LIVE_PAYMENTS` | Solo `true` habilita creación de pagos reales en modo `live`. |
| `APP_URL` | Origen público HTTPS de la tienda, necesario para retorno y webhook. |
| `CHECKOUT_RESERVATION_MINUTES` | Entero 5–60; predeterminado 15. |
| `CHECKOUT_JOB_SECRET` | Secreto de al menos 32 caracteres para el endpoint de conciliación, si se usa HTTP. |

La creación valida con `/Aplicativo` la identidad del negocio y su modo. El enlace
usa el UUID del pedido como referencia, monto/cantidad no editables, cantidad 1,
máximo un pago exitoso/un intento fallido y vigencia hasta el fin de la reserva.
Se aceptan tarjetas en el formulario alojado según la configuración de la cuenta;
no se habilitan puntos, cuotas u otros medios sin confirmación comercial.

URLs configuradas por pedido:

- Retorno/redirect: `APP_URL/website/order?id=UUID`.
- Notificación servidor a servidor: `APP_URL/api/wompi/webhook`.

El webhook lee bytes crudos (`bodyParser:false`), valida HMAC en tiempo constante,
referencia, monto y entorno, y después consulta el enlace y la transacción con OAuth.
No basta con una notificación sin firma ni con `esAprobada=true` en el navegador.
Se comprueban cuenta, enlace, referencia y monto contra el pedido persistido.
La API SV documenta el monto en dólares y no expone un campo de moneda en esos
DTO: se normaliza a USD exclusivamente para este adaptador SV y se rechaza cualquier
moneda explícitamente distinta que el proveedor devolviera. El esquema solo permite USD.

## Pedidos, reservas y confirmaciones tardías

La migración aplicada es `004_orders_wompi.sql`, sin editar las anteriores ni
eliminar productos, usuarios, variantes, preparaciones o movimientos existentes:

```powershell
cd C:\xampp\htdocs\petshop\petshop
npm.cmd run db:migrate
```

Añade `reserved_stock` (inicial 0), restricciones `0 <= reserved_stock <= stock`,
`shop_orders`, `shop_order_items`, `shop_payment_events` y el motivo de inventario
`sold`. Las claves foráneas conservan el historial al archivar productos.

- `stock` es existencia física; disponible = `stock - reserved_stock`.
- Al pulsar pagar, el servidor bloquea productos en orden estable, recalcula precios
  y envío, crea el pedido pendiente y aumenta la reserva en la **misma transacción**.
- Solo después se crea el enlace alojado. Dos clientes no pueden reservar la última unidad.
- Un UUID de idempotencia por checkout y locks de PostgreSQL impiden crear dos pedidos
  o enlaces por reintentar el mismo pago. Si la petición al proveedor queda incierta,
  no se crea otro enlace automáticamente. Se muestra pendiente de verificación.
- Fallos anteriores a enviar la creación del enlace liberan la reserva. Si no se puede
  saber si Wompi recibió la creación, se conserva hasta verificar o vencer.
- Pago aprobado verificado: se descuentan existencia física y reserva una vez, se registra
  el movimiento y se marca pagado, todo atómicamente con el evento de pago.
- Rechazo verificado o vencimiento: se libera solo la reserva, sin aumentar stock físico.
  Volver con el navegador sin pagar mantiene pendiente hasta un resultado definitivo o vencimiento.
- Notificaciones repetidas no descuentan otra vez. Un resultado inicialmente no aprobado
  que el proveedor confirme después como aprobado puede avanzar con el mismo ID de transacción.
- Aprobación tardía tras liberar: se adquieren otra vez las unidades si aún están disponibles.
  Si otra persona ya las reservó/compró o el producto fue retirado, se registra el pago como
  `paid_review`, sin stock negativo ni apropiarse de la otra reserva.
- Un segundo cobro aprobado inesperado con otro ID se registra para revisión sin repetir
  el descuento. El enlace ya está limitado a un pago exitoso como primera protección.

Estados visibles: pendiente, aprobado, fallido, vencido y **aprobado con entrega en
revisión**. Este último aparece también al administrador. La tienda debe resolverlo
antes de enviar (entrega acordada o devolución desde los medios oficiales de su cuenta).
No se inventó una API de reembolso de tarjetas ni se marca un pago aprobado como si
no existiera. Los pagos de prueba muestran que no hubo un cobro real.

## Conciliación y vencimiento en operación

Se liberan reservas vencidas al consultar catálogo/carrito/inventario o crear un
checkout y al consultar el pedido. Para conciliación incluso sin visitas, ejecutar
periódicamente (recomendado cada minuto) en el servidor:

```powershell
npm.cmd run checkout:reconcile
```

Alternativamente, un scheduler puede hacer `POST /api/checkout/reconcile` con
`Authorization: Bearer <CHECKOUT_JOB_SECRET>` sobre HTTPS. El secreto no va en la URL.
No se instaló una tarea del sistema operativo ni se publicó un túnel nuevo.

El job consulta pagos pendientes y fallidos/vencidos recientes (últimos 7 días),
libera vencimientos y reintenta la verificación. Los webhooks y la actualización
autenticada de un pedido permiten procesar confirmaciones más antiguas. Los enlaces
fallidos/vencidos se desactivan con el método oficial cuando el proveedor responde;
su propia vigencia también queda limitada por la reserva. Un fallo de red no se
interpreta como pago aprobado. Configurar supervisión del job en el despliegue real.

## Verificación realizada y límites

```powershell
npm.cmd run typecheck
npm.cmd run build
# Next activo en un origen coincidente con APP_URL:
$env:TEST_BASE_URL='http://localhost:3001'
$env:APP_URL='http://localhost:3001'
npm.cmd run test:checkout
npm.cmd run test:inventory
npm.cmd run test:dashboard
npm.cmd run test:auth
npm.cmd run test:auth-origins
npm.cmd run test:smoke
npm.cmd run test:public-design
```

`test:checkout` usa PostgreSQL real y cuentas/productos sintéticos que se eliminan
al terminar, preservando los registros originales. Comprueba:

- Catálogo 14/44/262, todas las opciones dependientes en escritorio, limpieza al
  cambiar padres y rechazo de combinaciones inválidas en el servidor.
- Formulario manual, recogida sin dirección, tarifas por prioridad y bloqueo sin tarifa.
- Permiso del navegador denegado/concedido con coordenadas de ensayo, fallo de mapas,
  precisión insuficiente, país incorrecto, homónimos y confirmación explícita antes de usar datos.
- Dos pedidos simultáneos por la última unidad, protección de reservas ante ediciones,
  idempotencia de pedido/enlace, monto/referencia/entorno inválidos, firma de bytes crudos,
  duplicados concurrentes y un único descuento de inventario.
- Fallos, expiración, timeout incierto y confirmaciones tardías con y sin stock; pagos
  inicialmente rechazados que se aprueban posteriormente y cobros adicionales inesperados.
- Privacidad del pedido, regreso manipulado que no marca pagado y estados de UI.
- Pantallas de checkout y pedido en 1440, 390 y 320 px, sin errores JavaScript ni overflow.
- Adaptador Wompi contra un transporte simulado con el contrato oficial OAuth/API;
  no hay una opción de «pago simulado» accesible desde las API de la tienda.

Capturas e informe: `artifacts/checkout/verification.json`, `form-*.png`,
`approved-*.png`, `late-payment-review.png`. **Los pagos aprobados/fallidos de estas
pruebas son simulaciones locales del proveedor; no son pruebas bancarias reales.**

Faltan para una prueba real de punta a punta:

1. App ID y API Secret del negocio Wompi, con acceso a EnlacePago y el negocio en desarrollo.
2. URL pública HTTPS y configuración/alcance de notificaciones del negocio para recibir el webhook.
3. Tarifas reales por destinos cubiertos y tarifa/instrucciones confirmadas de recogida.
4. Producto de prueba con precio y existencias confirmados y escenario de tarjeta de prueba
   admitido por la cuenta (incluido cómo probar rechazo si la cuenta impone 3DS).
5. Para probar geocodificación real, clave Google Geocoding habilitada; no es necesaria para comprar manualmente.

No se encontraron esas credenciales ni tarifas en `.env.local`; no se sobrescribió
ese archivo, no se hicieron cobros, no se introdujeron direcciones comerciales
ficticias ni se dio por exitosa una prueba contra Wompi real.

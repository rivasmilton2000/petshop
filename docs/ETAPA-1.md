# Etapa 1: inventario y migración de la presentación

## Inventario previo a cambios

Revisado el 8 de noviembre de 2026. El repositorio Git está en la carpeta interior `petshop/` del espacio de trabajo. No había configuración de Node ni instrucciones AGENTS.md. El logo `img/LILAC&TOFEE_LOGO.png` ya existía como archivo sin seguimiento y se conserva.

| Archivo original | Función y dependencias |
| --- | --- |
| `index.php` | Portada: collage de siete fotos de Unsplash, categorías, destacados, carrusel, temporada, pasos, testimonios y pie. Arrays locales, año del servidor, escape HTML y función para URLs de Unsplash. Menú y carrito vacío mediante JavaScript. |
| `src/pages/website/about.php` | Presentación y cuatro valores de ejemplo. Imágenes locales `about-hero.png` y `about-footer-dog.png`. Menú móvil. |
| `src/pages/website/shop.php` | Catálogo de nueve ejemplos; incluye `data/productos.php`. Filtra `?cat=`, precio y orden mediante JavaScript. Color, cantidad de paquetes y sabor eran filtros solo visuales. Carrito `petshop_cart` en localStorage; finalizar compra no hacía nada. |
| `src/pages/website/product-detail.php` | Busca `?id=` en el array compartido; usa el collar por defecto incluso ante un ID desconocido. Galería, variantes de collar, cantidad, acordeones y carrito local. Comprar ahora solo agregaba al carrito. |
| `src/pages/website/contact.php` | Formulario que abría un mailto a una dirección de ejemplo; no enviaba ni guardaba mensajes. Preguntas de relleno con búsqueda, categorías, compartir y enlace directo. Mapa ilustrativo de San Francisco, horarios y dirección ficticios. |
| `src/pages/website/data/productos.php` | Catálogo explícitamente identificado como datos de ejemplo: slugs, nombres, precios, etiquetas, imágenes, descripciones, variantes y búsqueda por ID. Sin consultas SQL. |
| `src/pages/website/css/website.css` | Hoja compartida de 2.259 líneas: composición editorial, cabecera flotante, collage, tarjetas, catálogo, detalle, contacto y puntos de adaptación móvil. Paleta y fuentes originales distintas de las solicitadas. |
| `src/pages/website/img/` | Tres PNG de presentación/contacto y diez JPG de productos. También un texto de prompt que no constituye contenido público ni instrucciones para esta migración. |
| `conexion/`, `src/pages/login/`, `src/pages/dashboard/` | Carpetas vacías; no existe conexión, autenticación ni panel PHP que migrar. |

Las rutas públicas existentes son `/index.php` y `/src/pages/website/{about,shop,product-detail,contact}.php`. Los enlaces de login.php y cart.php no tenían archivo de destino. Los enlaces legales eran fragmentos sin contenido. Imágenes y CSS usaban rutas relativas; las fuentes se cargaban desde Google Fonts. Ningún PHP consulta una base de datos, recibe pedidos o procesa pagos.

## Alcance autorizado

Solo etapa 1: Next.js con React, TypeScript y Pages Router; identidad y contenido público en español; compatibilidad de rutas y recursos. PostgreSQL se prepara como destino, sin crear tablas ni migrar datos. Los precios y afirmaciones comerciales de los ejemplos no se consideran datos confirmados. Las imágenes adjuntas son referencias visuales; se aplican los seis códigos hexadecimales y las fuentes indicados explícitamente por el usuario, aunque los nombres de los adjuntos aparecen intercambiados respecto de su contenido.

## Implementación y compatibilidad

Se mantiene Pages Router. La portada está en `src/pages/website/index.page.tsx`; `src/pages/index.page.tsx` la reexporta para servir `/`. El sufijo `.page` permite mantener datos, CSS e imágenes junto a las páginas sin que Next los interprete como entradas. Esta elección sigue la documentación de [extensiones de página](https://nextjs.org/docs/pages/api-reference/config/next-config-js/pageExtensions). Los redireccionamientos se configuran mediante [redirects de Next.js](https://nextjs.org/docs/pages/api-reference/config/next-config-js/redirects); las query strings se conservan.

| URL anterior | Destino |
| --- | --- |
| `/index.php` | `/` |
| `/src/pages/website/about.php` | `/website/about` |
| `/src/pages/website/shop.php?cat=...` | `/website/shop?cat=...` |
| `/src/pages/website/product-detail.php?id=...` | `/website/product-detail?id=...` |
| `/src/pages/website/contact.php` | `/website/contact` |

Se aceptan estas rutas con los prefijos `/petshop` y `/petshop/petshop`, además de los alias `/website/*.php`. Las entradas de directorio `/petshop`, `/petshop/petshop` y `/website` redirigen a `/`. Las URLs históricas de imágenes y CSS se reescriben a los recursos de `public/`. La compatibilidad se verifica en el servidor Next, no en Apache; mantener el mismo dominio de Apache requiere un proxy a Node.

`scripts/sync-assets.mjs` prepara los recursos antes de `dev` y `build`, conservando los originales y el logo en sus carpetas. El logo servido se verifica por SHA-256. Los siete retratos del collage y las cuatro fotos de categorías son descargas de las mismas URLs de Unsplash utilizadas por `index.php`, ahora guardadas en `src/pages/website/img/home/`. Sus identificadores están en el inventario PHP del commit original `3bd101c6b8fe80c4f79a0943057591277be000c8`. Las fuentes se instalan desde Fontsource y no dependen de Google Fonts en tiempo de ejecución.

Se mantienen las composiciones de la plantilla y sus puntos de adaptación: cabecera flotante, collage con tarjeta central, categorías escalonadas, destacados, carrusel, bloque de accesorios, pasos, catálogo, galería y pie fotográfico. Se usan motivos SVG propios inspirados en las referencias, sin sustituir el logo. El menú, los filtros, el orden, la galería, las cantidades, las preguntas frecuentes y el carrito ahora son componentes React con estado tipado. El diálogo nativo del carrito gestiona el foco, Escape y el aislamiento del fondo. Se conserva la clave local `petshop_cart`; se validan los datos heredados y se descartan los precios antiguos. Cuando el almacenamiento está bloqueado, el carrito sigue funcionando durante la sesión de página.

Las funciones de precio y los filtros por importe se retiran de la presentación porque no existen precios confirmados. Los filtros decorativos de color, paquetes y sabor no se presentan como funciones disponibles. El orden por nombre, la búsqueda y las categorías sí funcionan. El catálogo y el carrito indican que son ejemplos. Las variantes del collar son opciones de la maqueta, no inventario vendible. Los IDs inválidos reciben una página 404 en lugar de mostrar un producto distinto.

Se retiran testimonios inventados, promesas ambientales, descuentos, dirección, correo, teléfono, horarios y mapa ilustrativos. Las secciones de envíos, devoluciones, privacidad y términos declaran que la información está pendiente de confirmación. El formulario prepara un borrador de texto local sin un destinatario ficticio y sin envío, almacenamiento o afirmación de entrega.

## Funcionalidad dependiente de datos: retomar en etapa 2

No existe base de datos ni SQL de origen en este repositorio. No se puede inferir un inventario comercial real de los arrays de demostración. En esta etapa solo se instala `pg`, se define `.env.example` con `DATABASE_URL` y se prepara `src/server/db.ts`, exclusivo del servidor y de inicialización diferida. Ninguna página importa ni llama al pool. No se ejecutó SQL ni se modificó un servidor PostgreSQL.

| Área | Situación actual | Continuación con PostgreSQL, previa autorización de etapa 2 |
| --- | --- | --- |
| Productos y categorías | Array TypeScript con nueve ejemplos, precio `null` | Confirmar fuente de datos; definir productos, categorías, asociaciones por especie, variantes e imágenes. Conservar los slugs públicos. Importar únicamente información revisada. |
| Precios, stock y filtros | Importes no publicados; solo filtros por categoría y nombre | Modelar importes exactos con moneda y existencias por variante; reemplazar el array por consultas desde el servidor; recuperar filtros y orden por importe cuando haya datos reales. |
| Carrito y compra | Selección local sin subtotal ni checkout | Validar precios y existencias en servidor, definir carritos, pedidos y líneas. Autorización de compra y proveedor de pago quedan fuera de esta etapa. Nunca confiar en precios de localStorage. |
| Usuarios y panel | Carpetas `login` y `dashboard` vacías | Diseñar usuarios, permisos, sesiones y gestión del catálogo. No había autenticación PHP que conservar. |
| Contacto | Texto en memoria, sin envío ni registro | Confirmar destinatario y canal; definir recepción de mensajes, validación, protección contra abuso y tratamiento de datos antes de habilitar el envío. |
| Información comercial | Datos pendientes de confirmación | Recibir dirección, teléfono, correo, horarios y políticas aprobados por el negocio; decidir si se gestionarán como contenido en PostgreSQL. |
| Migración operativa | Sin scripts SQL ni datos reales | Definir esquema, migraciones versionadas, copia de seguridad, validación de conteos e integridad, carga de ensayo y cambio de origen. Revisar moneda, zona horaria, manejo de secretos y conexión de producción. |

## Comprobaciones y retiro de PHP

Se verificó `npm.cmd run check` (TypeScript estricto y `next build`) y una ejecución del servidor de producción con `next start`. Las pruebas Playwright abren las cinco páginas en escritorio 1440×1000, tableta 768×1024 y móviles 390×844 y 320×740. Comprueban HTTP 200, idioma, título, una cabecera h1, imágenes completas, tipografías, ausencia de desbordamiento y errores de navegador. También cubren menú móvil, categorías y parámetros, orden y búsqueda, estados vacíos, variantes, validación de color, cantidades, carrito entre páginas y recargas, eliminación, almacenamiento corrupto, cierre con Escape y restauración de foco, preparación de consulta sin persistir datos personales, búsqueda de preguntas y enlaces directos. Se revisaron visualmente capturas de portada, catálogo, nosotros, contacto y detalle en escritorio y móvil.

Se prueban 15 solicitudes a las rutas PHP originales con sus prefijos, 12 alias PHP y 3 entradas de directorio, con redirección 308; conservación de query strings; producto por defecto; IDs inválidos y repetidos con 404; y recursos por sus URLs históricas. `artifacts/verification.json` y las diez capturas se regeneran mediante `npm.cmd run test:smoke`.

Los seis PHP se retiran después de la primera verificación completa de sus reemplazos. Se conserva una copia local de los originales, incluido el CSS, en `.migration-backup/etapa-1-originales.zip` (ignorada por Git), además del historial del repositorio. Las carpetas vacías `conexion`, `login` y `dashboard` se conservan. El archivo `img/LILAC&TOFEE_LOGO.png` permanece intacto.

No se avanzó a la etapa 2 y no se desplegó el sitio en un servicio externo.

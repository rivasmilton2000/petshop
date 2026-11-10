# Actualización visual pública

Se conservan Next.js, TypeScript, Pages Router, el index raíz y el puente de
`src/pages/index.tsx`. Los estilos siguen en `src/pages/website/css/website.css`.

## Archivos de esta implementación

- `index.tsx`: hero, categorías, fotos, servicios y eliminación de franjas.
- `src/components/Layout.tsx`: nombre visible y foto final compartida.
- `src/components/Collar.tsx`: SVG y activación del cierre al entrar en pantalla.
- `src/components/ServiceIcon.tsx`: iconos de tienda, entrega y suscripción.
- `src/pages/website/css/website.css`: composición, encuadres, animación y adaptación móvil.
- `package.json`: comando `test:public-design`.
- `scripts/verify-public-design.mjs`: comprobaciones y capturas de la portada.
- `scripts/smoke.mjs` y `scripts/test-dashboard.ts`: expectativa del nombre actualizado.
- `scripts/Start-Demo.ps1`: solo se cambió el texto de reconocimiento de la portada;
  se conservaron las modificaciones que ya tenía.
- `docs/public-visual-refresh.md`: inventario de recursos y verificación.

Next.js generó `AGENTS.md` al iniciar desarrollo. `next-env.d.ts` es administrado
por Next.js y ya tenía diferencias al comenzar. Se preservaron los cambios
previos de README, los scripts de demo y las imágenes entregadas por el cliente.

## Recursos revisados

| Original | Uso |
| --- | --- |
| `img/LILAC&TOFEE_LOGO.png` | Logotipo existente, conservado sin alteraciones. |
| `img/punto2.jpeg` | Foto grupal de perros sobre rosa: fondo del hero y categoría Perros. |
| `img/punto10.jpeg` | Terrier con juguete de cuerda: bloque de juego y fotografía final compartida por las páginas públicas. |

`npm run assets`, ejecutado también antes de dev/build, copia los originales a
`public/img`. El navegador utiliza `/img/punto2.jpeg` y `/img/punto10.jpeg`.
No se cambian las rutas ni los datos del catálogo.

No hay piezas de hebilla entre los recursos recibidos. `Collar.tsx` dibuja ambas
correas, sus costuras, el regulador y las piezas macho/hembra en SVG. Un
IntersectionObserver inicia las dos animaciones simultáneas una sola vez al
entrar en pantalla. Tras el encaje hay un pequeño ajuste y el collar permanece
cerrado. Sin JavaScript o con movimiento reducido se muestra cerrado.

## Sustituciones pendientes por falta de recursos específicos

- Gatos: `src/pages/website/img/home/category-cats.jpg`.
- Pequeñas mascotas: `src/pages/website/img/home/category-small-pets.jpg`.
- Aves: `src/pages/website/img/home/category-birds.jpg`.
- Productos y variantes: las diez fotos de `src/pages/website/img/products/`;
  aparecen en portada, catálogo, detalle y carrito. Las fotos grupales no
  identifican estos productos concretos.
- Nosotros: `src/pages/website/img/about-hero.png` muestra una pareja con su perro.
- Contacto: `src/pages/website/img/contact-dog-walk.png` muestra un paseo.

Se conservaron estas fotos para evitar asociaciones incorrectas. Los dos nuevos
archivos sí tienen una correspondencia visual clara. No se recibió un archivo
adicional con la referencia de “Cómo funciona”; se aplicó la composición descrita:
fondo lila, tres tarjetas café, iconos y los textos solicitados.

## Verificación reproducible

```powershell
npm.cmd run typecheck
npm.cmd run build
# Con Next.js iniciado en el puerto de pruebas:
$env:TEST_BASE_URL = 'http://127.0.0.1:3001'
npm.cmd run test:smoke
npm.cmd run test:public-design
```

El smoke existente recorre cinco páginas públicas en 1440, 768, 390 y 320 px,
comprobando imágenes, fuentes, navegación, filtros, variantes, carrito y contacto.
La comprobación visual adicional verifica textos, enlaces de portada, tarjetas
adaptables, movimiento reducido y las posiciones de las dos piezas en cada
fase del cierre, además del salto al pasar el mouse. Las capturas y el informe
se guardan en `artifacts/public-design/` (no versionado).

Typecheck, compilación, smoke y comprobación visual terminaron correctamente.
Los dos últimos también se ejecutaron contra el servidor local de producción
en el puerto 3000. Se revisaron visualmente las capturas del hero, servicios,
foto final y las piezas de la hebilla antes y después del cierre.

También se actualizó el texto que usa `Start-Demo.ps1` para reconocer la portada,
así como las expectativas de marca de los tests existentes.

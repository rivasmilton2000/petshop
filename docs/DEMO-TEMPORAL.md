# Demo temporal desde este PC Windows

La demo ejecuta la compilación de producción de Next.js en `127.0.0.1:3000` y publica únicamente ese servicio mediante un Quick Tunnel HTTPS de Cloudflare. No publica PostgreSQL, Apache, XAMPP, phpMyAdmin ni el directorio del proyecto. No se modifican puertos del router ni reglas de firewall.

La portada real permanece en `index.tsx`, junto a `package.json`, y `src/pages/index.tsx` conserva el puente mínimo. PostgreSQL local sigue siendo necesario para las cuentas y sesiones. El catálogo de ejemplo se puede visitar sin iniciar sesión.

## Demo activa

El enlace actual, los PIDs y el puerto real están en `artifacts/demo/state.json`. Ese archivo y los logs son locales y están excluidos de Git. Para ver el enlace:

```powershell
cd C:\xampp\htdocs\petshop\petshop
(Get-Content artifacts/demo/state.json -Raw | ConvertFrom-Json).url
```

Se dejan abiertos en segundo plano el proceso `npm.cmd run start` con sus procesos Node.js y `cloudflared.exe`. Mantén el PC encendido, con Internet y sin suspensión; PostgreSQL debe seguir funcionando para el acceso de usuarios. No es necesario conservar una ventana de terminal abierta. Apache puede seguir su funcionamiento habitual: no participa en la demo.

## Apagar al terminar

```powershell
cd C:\xampp\htdocs\petshop\petshop
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/Stop-Demo.ps1
```

El script valida el proyecto, los PIDs, la fecha de creación y el comando de cada proceso registrado antes de detener sus árboles. No detiene PostgreSQL ni Apache. Al cerrar cloudflared, el enlace temporal deja de servir la tienda. La excepción de política de ejecución se limita a ese proceso PowerShell; no cambia la configuración de Windows.

## Iniciar otra demo

Con el puerto 3000 libre, PostgreSQL activo y las dependencias instaladas:

```powershell
cd C:\xampp\htdocs\petshop\petshop
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/Start-Demo.ps1
```

El script compila con `npm.cmd run build`, inicia `npm.cmd run start -- --hostname 127.0.0.1 --port 3000`, crea el túnel y muestra el nuevo enlace. Si ya compilaste y no cambió el código, admite `-SkipBuild`. Si existe una demo registrada, apágala primero. Si otro servidor ocupa el puerto, ciérralo antes de iniciar la demo. El enlace cambia al crear un túnel nuevo.

Se usa cloudflared instalado si está en PATH; en este PC se descargó la versión portátil oficial en `artifacts/demo/tools/cloudflared.exe` y se comprobó su SHA-256 contra el digest de la publicación oficial. No requiere instalación administrativa ni inicio de sesión para el Quick Tunnel. Si falta la herramienta en otra máquina, puede instalarse con:

```powershell
winget install --id Cloudflare.cloudflared --exact
```

También se puede descargar `cloudflared-windows-amd64.exe` desde las [publicaciones oficiales](https://github.com/cloudflare/cloudflared/releases) y guardarlo como `artifacts/demo/tools/cloudflared.exe`. No se instala como servicio de Windows.

## Origen HTTPS y cuentas

El proceso Next.js de la demo recibe `APP_URL` con el dominio HTTPS exacto del túnel. Esto permite el inicio y cierre de sesión y cookies Secure sin permitir orígenes externos arbitrarios. `.env.local` conserva su configuración local original; las credenciales no se copian a los logs ni al estado de la demo. Al apagar la demo, el siguiente `npm.cmd run dev` vuelve a usar la configuración local.

Se verificó el acceso público con la cuenta de prueba de rol **usuario** y se comprobó que no accede al endpoint administrativo. No se proporciona una cuenta de administrador al cliente. Para entregar acceso opcional, usa `SEED_USER_EMAIL` y `SEED_USER_PASSWORD` de `.env.local`; no son necesarios para recorrer la portada y el catálogo.

## Google pendiente

`GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` siguen sin configurar. No se ha probado el consentimiento ni el intercambio de código contra Google real. El callback que tendría que autorizarse en el cliente OAuth es:

```text
https://DOMINIO-TEMPORAL.trycloudflare.com/api/auth/google/callback
```

Sustituye el dominio por el enlace actual de `state.json`. Cuando cambia el túnel cambia ese callback. Si Google requiere verificar el dominio o no permite autorizar el dominio temporal, se necesita un dominio estable que se pueda verificar. Hasta disponer de las credenciales y de un callback autorizado, se usa el acceso por correo y contraseña.

## Verificación realizada

Se ejecutó `npm.cmd run build` correctamente y se confirmó Next.js de producción escuchando exclusivamente en `127.0.0.1:3000`. Se abrieron la portada y `/website/shop` por HTTP local y por el dominio HTTPS público: HTTP 200, diseño renderizado, nueve productos de ejemplo, logo, todas las imágenes y las fuentes locales completas. Se probaron inicio, rol usuario, cookie Secure y cierre de sesión a través del túnel. Las rutas `/.env.local`, `/.git/config`, `/package.json`, `/index.tsx`, `/src/pages/index.tsx` y `/phpmyadmin` devolvieron 404 por el enlace público.

La evidencia está en `artifacts/demo/verification.json` y en las capturas `public-home.png` y `public-catalog.png`. La verificación HTTPS se hizo desde el navegador a través de Cloudflare; no sustituye una prueba física desde el teléfono del cliente u otra red. No se ejecutó ninguna tarea de la etapa 3.

Cloudflare indica que los [Quick Tunnels son temporales](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/), no requieren cuenta y finalizan al detener el proceso. El enlace permite acceder a quien lo tenga mientras la demo permanezca activa.

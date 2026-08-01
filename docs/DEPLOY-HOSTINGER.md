# Hostinger: activar el CRM real

Este procedimiento no debe ejecutarse hasta tener un dominio HTTPS y las credenciales históricas revocadas.

## 1. Base de datos

1. Crea una base MySQL nueva y un usuario con permisos únicamente sobre esa base.
2. Importa `api/schema.sql` desde phpMyAdmin.
3. Genera un hash de contraseña en el servidor:

```bash
php -r "echo password_hash('CambiaEstaClavePorUnaLarga', PASSWORD_DEFAULT), PHP_EOL;"
```

4. Inserta el primer usuario usando el hash generado. No guardes la contraseña en SQL ni en Git.

## 2. API

1. Sube `api/` al mismo dominio que `portal/`.
2. Copia `api/config.example.php` como `api/config.php`.
3. Completa DSN, usuario y contraseña de la base.
4. Genera `app_key` con `bin2hex(random_bytes(32))` y guárdala únicamente en `api/config.php`.
5. Deja `session_secure` en `true` cuando HTTPS esté activo.
6. Verifica que `api/config.php` no sea descargable; el `.htaccess` lo bloquea, pero la protección de servidor debe confirmarse.

The imported schema also creates `password_reset_tokens` and `role_permissions`. Keep both tables: recovery and profile policy depend on them.

Configure a private mail adapter for recovery delivery. The API response is intentionally generic and never sends the raw reset token to the browser.

## 3. Frontend

En la copia de producción modifica únicamente:

```js
window.ORIUS_CONFIG = Object.freeze({
  demoMode: false,
  apiBase: "/api/index.php",
});
```

La rama pública de GitHub Pages debe conservar `demoMode: true` y los datos sintéticos.

## 4. Google Drive

La generación de PDF debe ejecutarse desde el servidor o un Apps Script privado. El navegador no debe recibir tokens OAuth, IDs de carpetas privadas ni credenciales. Configura una carpeta de salida privada y registra en la base únicamente el identificador del documento y su estado.

## 5. Prueba mínima

- Login correcto y contraseña incorrecta.
- Cierre de sesión y cookie expirada.
- Usuario `viewer` intentando crear una garantía: debe recibir `403`.
- Creación duplicada y payload con campos largos.
- Transferencia simultánea del mismo activo.
- Descarga de documentos sin autorización.
- Revocación de usuario y restauración de una copia de la base.

Additional access tests:

- A viewer opening users or permissions must receive `403`.
- An authorized operator can create a user only with an allowed profile.
- Only an administrator can save the permission matrix with a valid CSRF token.
- Recovery requests for known and unknown emails must expose the same response.

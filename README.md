# Orius Solar Operations

Reactivación y modernización de un proyecto legado de operaciones solares para portafolio. La primera entrega es una demo estática, segura para mostrar, que reconstruye los flujos de garantías, inventario y trazabilidad sin conectarse a los datos antiguos de Orius Solar.

## Qué encontré en el legado

- `Proyecto Warranty/Warranty.py`: aplicación Tkinter que toma nueve campos, reemplaza marcadores `INPUT01`–`INPUT09` en tres plantillas DOCX y convierte los documentos a PDF.
- `Proyecto Warranty/Warranty.html`: formulario público que enviaba datos directamente a una URL de Google Apps Script con `mode: no-cors`, por lo que el navegador no podía comprobar la respuesta real.
- `Proyecto Project Docs/StockOriuSolar/` y los formularios de creación: prototipos de inventario, vehículos y perfiles que llamaban URLs de Apps Script/Cloudflare desde el cliente.
- `Cambios.txt`, `Notas.txt` y `URLS.txt`: backlog de herramientas por vehículo, checklists, GPS, devoluciones y movimientos de almacén.

El proyecto no tenía `package.json`, pruebas, historial Git ni una API verificable. Por eso la reconstrucción separa el producto demostrable del backend de producción, en vez de fingir que las integraciones antiguas siguen vivas.

## Demo actual

La demo está en `portal/` y guarda datos sintéticos en `localStorage`:

- **Overview:** muestra el workbench y conecta certificado, proyecto y activos.
- **Warranties:** busca registros y crea certificados sintéticos con validación básica.
- **Inventory:** muestra custodia de herramientas y permite registrar un traslado.
- **Traceability:** presenta la línea de auditoría conectada al proyecto.
- **Account recovery:** inicia un flujo de recuperación con respuesta genérica para no revelar si un correo existe.
- **Users:** permite crear operadores sintéticos y asignarles un perfil de mínimo privilegio.
- **Permissions:** muestra y modifica la matriz de permisos por perfil en modo demo.

Todos los registros son locales y tienen una etiqueta visible de demo. No hay llamadas de red ni endpoints privados en el frontend.

La demo ahora tiene un CRM mínimo con entrada por usuario y contraseña, recuperación segura, sesión de navegador, menú de usuario, administración de usuarios, matriz de permisos y cierre de sesión. Credenciales sintéticas públicas:

```text
Email:    demo@orius.local
Password: SolarOps!Demo#2026_X7
```

Estas credenciales son únicamente para la demo pública. No deben reutilizarse en producción.

## Stack elegido

Se mantiene **Vite + JavaScript modular + CSS propio** en el frontend para que el proyecto siga siendo liviano y desplegable como archivos estáticos. Se agrega **PHP 8 + PDO + MySQL** como API opcional en `api/`, porque es una combinación compatible con el hosting económico de Hostinger y no obliga a mantener un proceso Node permanente. No añadí React ni una librería visual pesada: en este proyecto habría aumentado el costo operativo sin resolver la persistencia ni la autorización.

## Ejecutar localmente

Requiere Node.js 20+ y pnpm.

```bash
pnpm install
pnpm dev
```

Abre la URL que indique Vite. Para revisión rápida de sintaxis:

```bash
pnpm check:html
```

No ejecuto build como parte de esta reactivación, de acuerdo con la restricción del proyecto. El workflow de GitHub Pages queda preparado para que el repositorio construya y publique en CI.

## Despliegue recomendado sin costo adicional

1. **GitHub Pages:** publica `portal/` como demo pública del portafolio. El workflow en `.github/workflows/deploy-pages.yml` mantiene el despliegue reproducible.
2. **Hostinger económico:** sirve el contenido generado de `portal/` como sitio estático. Si se agrega persistencia, usar el PHP/MySQL del plan y mantener las credenciales únicamente en variables del servidor.
3. **Google Drive:** integrar la generación de PDF mediante un backend/Google Apps Script privado. La cuenta de servicio o token nunca debe aparecer en `portal/app.js`.

La demo simula el acceso y funciona como experiencia pública. Para multiusuario real, copia `api/config.example.php` a `api/config.php`, crea las tablas con `api/schema.sql`, configura `portal/config.js` con `demoMode: false` y crea el primer usuario usando un hash generado por `password_hash`.

## Seguridad pendiente antes de producción

Se encontraron credenciales y URLs históricas en archivos de texto y HTML. **Deben revocarse y rotarse antes de subir cualquier copia del legado a GitHub.** Ver `SECURITY.md` para el inventario y el plan de contención. Los artefactos compilados de Windows tampoco deben versionarse.

## Estructura

```text
portal/                  frontend estático demostrable
  assets/                SVG propios y reutilizables
PRODUCT.md              verdad de producto para Impeccable
DESIGN.md               dirección visual y tokens
docs/ARCHITECTURE.md    frontera demo/backend y despliegue
docs/IMAGE-PROMPTS.md   prompts exactos y destinos de assets
docs/DEPLOY-HOSTINGER.md pasos para activar el CRM real en Hostinger
SECURITY.md             hallazgos y controles obligatorios
Proyecto Warranty/      fuente histórica, no conectada
Proyecto Project Docs/  prototipos y documentación histórica
```

## Próxima fase

La siguiente iteración debe implementar un adapter servidor-side real (PHP/MySQL en Hostinger o Apps Script privado) detrás de endpoints autenticados, migrar únicamente datos sintéticos, generar PDFs en el servidor y agregar pruebas de contrato y autorización por rol.

# Administración del catálogo de Maderarte

## Uso

La web pública enlaza a `/admin.html` desde el candado **ADMIN** del pie de página. El editor es independiente de la aplicación interna de pedidos y ventas.

Conecta un token de GitHub limitado al repositorio `alejoherrera05-del/Maderarte`, con permiso **Contents: Read and write**. La autorización efectiva de publicación la aplica GitHub; el editor no utiliza la antigua contraseña incluida en el código. Un token anterior de este mismo catálogo se traslada del almacenamiento permanente a la sesión de la pestaña. No se solicitan ni se publican credenciales en el catálogo o los respaldos.

Selecciona **Nuevo producto**, indica su categoría y completa nombre, fotografías y datos. La categoría se elige explícitamente: no se deduce de la foto. Las categorías siguen este orden: Salas, Comedores, Alcobas, Sofá camas y Maderarte Junior. Dentro de Junior se respeta su subcategoría. El orden normal dentro de cada grupo es alfabético en español; el campo opcional Prioridad permite anteponer una pieza dentro de su grupo. Cambiar o subir fotografías no cambia la categoría.

**Guardar borrador** conserva el trabajo en este navegador, sin modificar internet. **Guardar y publicar** primero conserva el borrador y después publica fotos y ambos catálogos conjuntamente. El indicador distingue guardado local, guardado en GitHub y disponibilidad de los datos en la web. Las fichas indexables se sincronizan mediante el flujo SEO. GitHub Pages puede necesitar un intervalo de propagación; no se promete publicación instantánea.

La búsqueda ignora mayúsculas y tildes. Los filtros y encabezados permiten encontrar una categoría sin mezclar modelos. Las fotos pueden reordenarse con flechas o arrastrando; la primera es la principal. Se preservan proporciones, medidas, variantes, acabados, características e identificadores existentes.

## Recuperación y seguridad

El borrador se almacena en IndexedDB y puede exportarse como JSON. Un borrador del editor anterior nunca sobrescribe automáticamente el catálogo remoto: se ofrece su descarga. Descarga el respaldo antes de limpiar los datos del navegador o resolver un conflicto. No hay importación automática destructiva.

Si otro equipo modificó el catálogo desde que abriste el editor, se bloquea la publicación para evitar sobrescribirlo. Conserva tu respaldo y carga la versión publicada antes de reconciliar cambios. Las modificaciones de código o SEO ajenas al archivo de productos se conservan.

Los tokens permanecen solamente en la sesión de la pestaña y se eliminan al desconectar. No publiques datos de clientes, costos ni información confidencial: el alojamiento y el repositorio siguen siendo públicos. El enlace comercial con precios conserva su funcionamiento; ocultar precios en el escaparate no convierte el archivo de precios en un recurso privado.

## Arquitectura y verificación

- `assets/catalog-order.js`: esquema, validación, orden compartido y eliminación recursiva de precios para el archivo público.
- `assets/admin-store.js`: control de versiones y una publicación atómica mediante Git blobs/tree/commit, sin forzar la rama.
- `assets/admin-catalog.js`: editor, borradores y estados de conexión. `admin.html` tiene noindex y política de seguridad de contenido.
- `tools/build-seo-pages.mjs`: genera rutas ordenadas y retira únicamente fichas HTML generadas obsoletas; no elimina imágenes.
- `.github/workflows/sync-seo.yml`: genera y valida rutas desde la última versión y solicita explícitamente una reconstrucción de Pages cuando guarda cambios con el token del flujo.

Pruebas: `node --test tools/test-catalog-admin.cjs`, `node tools/test-catalog-browser.cjs`, `node tools/validate-seo.mjs` y `node tools/guardrails.js`. Las pruebas del editor simulan todas las escrituras de GitHub: no crean ni editan productos reales. Las capturas se toman a 1440 y 390 píxeles.

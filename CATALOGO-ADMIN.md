# Acceso y catálogo de Maderarte

## Configurar el PIN

El candado ADMIN del pie de página abre /admin.html. Se conservan el logo, Algerian y SF Pro. No hay acceso de consulta anónima al administrador ni carga de productos antes de entrar.

La entrada y la configuración usan un PIN de exactamente 4 números. No hay un PIN predeterminado ni un código elegido por el asistente.

1. Pulsa Configurar este navegador.
2. Pega el token de GitHub que ya generaste para Maderarte, con Contents: Read and write. No necesitas otro token mientras el que tienes siga vigente y autorizado.
3. En Crear PIN de 4 números, escribe cuatro dígitos del 0 al 9. Los ceros iniciales se conservan.
4. Repite el mismo PIN y pulsa Guardar y entrar.

Después, en ese navegador, basta con escribir el PIN y pulsar Entrar. Los campos solicitan el teclado numérico nativo de los teléfonos con inputmode="numeric". En computador se usa el teclado habitual: no se añadió un teclado dibujado en pantalla.

Cerrar sesión limpia el catálogo y la ficha de la pantalla y descarta la credencial descifrada. Al recargar o volver mediante navegación se vuelve a bloquear el panel. Los borradores de productos permanecen guardados en este navegador.

## Conexiones anteriores y recuperación

Una configuración que ya se completó con la contraseña larga no se convierte automáticamente en un PIN. Para cambiarla, abre Configurar este navegador, pega de nuevo un token autorizado y elige tu PIN. Los borradores no se eliminan. La capa de cifrado conserva compatibilidad de lectura con los registros anteriores; la interfaz nueva solicita cuatro números.

En otro navegador, tras borrar sus datos, al olvidar el PIN o si vence el token, vuelve a configurar el acceso. Cambiar el PIN aquí no cambia otros equipos ni revoca el token: la revocación se hace en GitHub.

## Alcance de la protección

El propietario solicitó expresamente este PIN corto, después de conocer que ofrece menos protección frente a adivinación que una contraseña larga. Existen 10000 combinaciones. El cifrado no añade entropía al PIN ni evita que alguien que copie el registro local pruebe combinaciones fuera de la página. No se afirma que haya bloqueo de intentos en servidor ni autenticación multifactor.

La conexión local mantiene AES-GCM-256, sal e IV aleatorios y PBKDF2-SHA256 de 600000 iteraciones. No se guardan el PIN ni la clave derivada. El token descifrado se usa en memoria; GitHub sigue verificando las solicitudes remotas. El PIN no sustituye un token autorizado ni se envía a GitHub.

Es un desbloqueo DE ESTE NAVEGADOR, no una cuenta centralizada. No privatiza GitHub Pages, el repositorio, las fotos ni los JSON publicados, incluido el comercial con precios. Los borradores no están cifrados. Usa un dispositivo de confianza; este PIN no protege frente a código malicioso del mismo origen, extensiones maliciosas o un equipo comprometido.

## Catálogo y verificación

Se mantiene el orden Salas, Comedores, Alcobas, Sofá camas y Junior, con subcategoría, prioridad opcional y nombre dentro de cada grupo. Guardar borrador no publica; Guardar y publicar actualiza fotos y ambos catálogos conjuntamente. Se mantienen los controles de conflictos y respaldos. No se modifica Maderarte-App.

Pruebas: node --test tools/test-catalog-admin.cjs, node tools/test-catalog-browser.cjs, node tools/validate-seo.mjs y node tools/guardrails.js. Incluyen PIN correcto/incorrecto, longitud, letras, ceros iniciales, cifrado y los flujos completos de catálogo en 1440/390 px. Los tokens y PIN de las pruebas son ficticios, y todas las escrituras del editor están simuladas: no se crean productos reales.

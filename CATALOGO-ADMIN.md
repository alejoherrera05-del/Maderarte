# Acceso y catálogo de Maderarte

## Entrada

El candado ADMIN del pie de página lleva a /admin.html. La entrada usa el mismo logo oficial, Algerian y SF Pro de la web. No tiene consulta anónima ni frases promocionales. No carga productos al abrirla sin iniciar sesión.

La pantalla normal muestra Contraseña y Entrar. No existe una contraseña universal ni una clave creada por el asistente: el propietario define su contraseña en el navegador.

## Primera configuración

1. Pulsa Configurar este navegador.
2. Vincula un token detallado de GitHub limitado al repositorio Maderarte, con Contents: Read and write. Una conexión anterior de este mismo catálogo puede rellenarse de forma enmascarada; nunca abre el panel automáticamente.
3. Elige y confirma una contraseña de 15 a 256 caracteres. La contraseña no es la de tu cuenta de GitHub.
4. Pulsa Guardar y entrar. La aplicación comprueba los permisos y carga el catálogo antes de guardar la conexión cifrada.

Después entras con tu contraseña. Cerrar sesión limpia el catálogo y la ficha de la pantalla y descarta la credencial descifrada. Al recargar o abrir otra pestaña vuelve a pedir la contraseña. Los borradores de producto permanecen en este navegador.

## Alcance y límites del acceso

Esto es una contraseña para desbloquear la conexión DE ESTE NAVEGADOR, no un sistema central de cuentas. En otro dispositivo, tras borrar sus datos o al olvidar la contraseña, hay que configurar de nuevo un token autorizado. Cambiar la contraseña local no cambia otros equipos ni revoca un token: para revocarlo hay que hacerlo en GitHub. Una cuenta central con correo, recuperación y permisos por usuario requiere autenticación en un servidor; no se ha añadido ese servicio.

Solo la conexión se cifra en almacenamiento local, con AES-GCM-256, sal aleatoria, IV aleatorio y PBKDF2-SHA256 de 600000 iteraciones. No se guardan la contraseña ni la clave derivada; el token descifrado solo se usa en memoria durante la sesión. La contraseña no se envía a GitHub. GitHub sigue autorizando cada lectura/escritura remota. Un token inválido no permite configurar el acceso. Se retiran las credenciales antiguas en texto claro de este catálogo al completar la vinculación.

Esto no privatiza GitHub Pages ni el repositorio: las fotos y los archivos ya publicados siguen siendo públicos, incluido el archivo comercial con precios. Los borradores locales no se cifran con este cambio. No introduzcas información confidencial. Este mecanismo no protege una sesión desbloqueada frente a una extensión maliciosa, código malicioso del mismo origen o un dispositivo comprometido. Usa una contraseña larga y distinta, un equipo de confianza y cierra sesión al terminar.

## Catálogo

Las categorías conservan el orden Salas, Comedores, Alcobas, Sofá camas y Junior. Dentro de cada grupo se aplica subcategoría, prioridad opcional y nombre. Las nuevas fotos no cambian la categoría. Guardar borrador guarda solo localmente; Guardar y publicar actualiza ambos catálogos y fotos conjuntamente. Los conflictos con otra edición bloquean la publicación; descarga el respaldo antes de reconciliar. No se cambia Maderarte-App.

## Pruebas

node --test tools/test-catalog-admin.cjs incluye pruebas del cifrado, contraseña incorrecta, manipulación de datos, errores de almacenamiento, permisos, orden y publicación atómica. node tools/test-catalog-browser.cjs verifica contraseña, configuración, ausencia de entrada anónima, limpieza al salir, marca y flujos de edición a 1440/390 px. Las escrituras de las pruebas son simuladas; no cambian productos reales.

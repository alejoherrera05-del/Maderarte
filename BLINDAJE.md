# Blindaje Maderarte

Este proyecto es una web estatica. Para que los cambios visuales no rompan lo esencial, antes de publicar se deben correr estas dos revisiones.

## 1. Sincronizar rutas limpias

Cuando se edite `index.html`, copiarlo tambien a las rutas limpias:

```powershell
.\tools\sync-routes.ps1
```

Esto mantiene funcionando:

- `/catalogo`
- `/colecciones`
- `/proceso`
- `/historia`
- `/contacto`
- `/inicio`
- `404.html`

## 2. Probar lo esencial

Ejecutar:

```powershell
node .\tools\guardrails.js
```

La prueba valida:

- Que el catalogo publico carga productos sin precios.
- Que el link con precios si muestra precios.
- Que no haya imagenes rotas.
- Que las rutas de imagenes y datos sean absolutas.
- Que las copias de rutas limpias esten sincronizadas.
- Que no haya errores JavaScript en vista movil.
- Que no exista scroll horizontal accidental.

Si la prueba dice `BLINDAJE FALLIDO`, no se debe publicar hasta corregirlo.

## Comando recomendado antes de publicar

```powershell
.\tools\prepublish-check.ps1
```

Este comando sincroniza rutas y ejecuta el blindaje en una sola pasada.

Si Windows bloquea scripts, usar:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\prepublish-check.ps1
```

## Regla practica

Cambios esteticos: libres.

No tocar sin volver a probar:

- `catalogFile`
- `renderCatalog`
- rutas dentro de `src`, `href` o `url(...)`
- `data/productos.json`
- `data/productos-publicos.json`
- modal de producto
- lightbox de imagenes

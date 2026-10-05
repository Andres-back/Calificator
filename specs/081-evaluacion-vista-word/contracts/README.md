# Contratos: visualización y exportación

## API existente

`GET /api/evaluaciones/{id}/pdf?soluciones=false&descargar=false`

Se mantiene firma, MIME application/pdf y autorización actual. El documento mostrado
y PDF descargado usan los mismos datos. `soluciones=true` exige propiedad docente
o administrador autorizado. `descargar=true` sirve como attachment.

## API adicional

`GET /api/evaluaciones/{id}/docx?soluciones=false`

- Permiso `evaluations.read` y acceso a la evaluación validados en servidor.
- DOCX nativo, MIME `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- Disposición attachment, extensión `.docx`, caché private/no-store y nosniff.
- 401 sesión ausente; 403 acceso/solucionario denegado; 404 evaluación/material ausente.
- 422 contenido vacío o estructura de material que no se pueda exportar completa;
  respuesta explicativa y posibilidad de usar PDF. Ninguna respuesta aparenta éxito
  con archivo parcial o HTML renombrado a Word.
- Ninguna escritura de registros, llamada IA ni descarga remota arbitraria.

## UI docente

«Visualizar» accesible desde las listas existentes con permiso de lectura, incluso
sin permiso de actualización. Al abrir, versión estudiante seleccionada; cambiar
a solucionario requiere control explícito visible solo para propietario/admin.
Descargas PDF y Word diferenciadas. Estados cargando, listo, error y reintento;
alternativa de abrir PDF si el navegador no lo incrusta. Cierre siempre accesible.
Editar Word no se sincroniza con el sistema. Resolver estudiante mantiene su flujo.

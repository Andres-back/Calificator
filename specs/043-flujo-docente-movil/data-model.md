# Modelo de estado de interfaz

Esta función no agrega tablas ni modifica entidades persistentes.

## Contexto de revisión

- `materia`: materia activa.
- `evaluacion`: evaluación activa.
- `filtro`: conjunto visible de estudiantes.
- `busqueda`: texto inmediato y valor diferido usado para consultar.
- `estudiante`: estudiante activo.
- `calificacion`: calificación abierta.
- `pregunta`: respuesta enfocada.
- `hoja`: página de evidencia visible.

Las selecciones navegables se conservan en la URL. La búsqueda permanece local durante la sesión para no contaminar enlaces compartidos con datos escritos transitoriamente.

## Estado de edición

- `limpio`: se puede cambiar de contexto.
- `modificado`: hay nota, retroalimentación o componente sin guardar.
- `guardando`: una mutación está en curso.
- `conflicto`: la versión cambió y el borrador debe conservarse.

Transiciones permitidas:

```text
limpio → modificado → guardando → limpio
                         └──────→ conflicto → modificado
```

## Acción principal móvil

- `procesando`: sin acción de nota; permite volver o avanzar.
- `por revisar`: confirmar si existe sugerencia válida; establecer o ajustar en caso contrario.
- `confirmada`: publicar si el rol lo permite.
- `publicada`: continuar al siguiente estudiante.
- `modificada`: guardar antes de navegar.


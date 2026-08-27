# Lista de calidad de requisitos: recuperación y SMTP

**Propósito**: validar que los requisitos de recuperación, secreto SMTP, autorización y operación estén completos antes de implementar
**Creada**: 2026-08-27
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa que la calidad del requisito fue aprobada, no que la implementación esté terminada.

## Completitud y autorización

- [x] CHK001 ¿Están definidos los permisos de visitantes, usuarios y administradores para cada superficie pública y SMTP? [Completitud, Spec §FR-001–FR-003, §FR-019]
- [x] CHK002 ¿Está definido que recuperar una contraseña no cambia rol, estado ni información académica? [Consistencia, Spec §FR-014]
- [x] CHK003 ¿La especificación impide que respuestas y tiempos revelen si una cuenta existe? [Cobertura, Spec §FR-003–FR-004, §SC-004]

## Secretos y ciclo de vida

- [x] CHK004 ¿Están definidos generación, vencimiento, reemplazo, consumo único e invalidación concurrente del enlace? [Completitud, Spec §FR-005–FR-012]
- [x] CHK005 ¿Se especifica con claridad que tokens, contraseñas y credenciales SMTP no aparecen en respuestas, registros ni analítica? [Seguridad, Spec §FR-008, §FR-013, §FR-017, §FR-020]
- [x] CHK006 ¿La rotación administrativa de la credencial SMTP y la no recuperación del valor anterior son inequívocas? [Claridad, Spec §FR-019–FR-020]

## Fallos y operación

- [x] CHK007 ¿Están cubiertos fallos SMTP, reintentos, observabilidad y ausencia de enlaces duplicados? [Cobertura, Spec §FR-013, §FR-016, §SC-008]
- [x] CHK008 ¿La prueba de conexión define destino seguro, resultado visible y metadatos permitidos? [Claridad, Spec §FR-021]
- [x] CHK009 ¿Los requisitos de invalidación de todas las sesiones anteriores son comprobables? [Medición, Spec §FR-010, §SC-003]

## Experiencia y portabilidad

- [x] CHK010 ¿Están definidos estados accesibles y tamaños objetivo para solicitud, restablecimiento y administración? [Cobertura, Spec §FR-015, §SC-006]
- [x] CHK011 ¿La dependencia de Google se describe como configuración inicial reemplazable y no como acoplamiento del producto? [Consistencia, Spec §FR-007]
- [x] CHK012 ¿Cada criterio de éxito puede mapearse a una prueba o tarea objetiva? [Trazabilidad, Spec §SC-001–SC-008]

## Notas

El revisor marca cada elemento después de comparar la especificación con este checklist. La implementación no modifica estos marcadores.

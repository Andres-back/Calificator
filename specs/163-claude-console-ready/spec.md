# Especificación: Claude Console listo para Sonnet 5.5

**Rama**: `codex/163-claude-console-ready` | **Creada**: 2026-11-10 | **Estado**: Alcance autorizado por el usuario en este chat | **Issue**: [#346](https://github.com/Andres-back/Calificator/issues/346)

El usuario pidió «la puedes dejar configurada yo solo meto la api usare sonete 5.5 para calificar», tras informar un error del formulario genérico. Este hotfix aplica la elección explícita del usuario y mantiene el soporte genérico de Spec116.

## Requisitos

- **FR-001**: Administración presenta Claude Console con Sonnet 5.5, API oficial `https://api.anthropic.com/v1`, Messages, texto y visión, temperatura omitida y pensamiento predeterminado. Solo solicita la clave.
- **FR-002**: Un botón prepara la conexión cifrada, prueba Sonnet con una imagen sintética y publica únicamente su selección como valoración principal mediante validación y publicación existentes. No cambia las demás rutas, ni notas/evidencias/historial.
- **FR-003**: Fallos de clave, acceso, presupuesto de salida, formato o disponibilidad se muestran sin exponer secretos. No publica rutas fallidas ni evita permisos, pruebas o control de versiones; protege borradores ajenos.
- **FR-004**: La prueba Messages dispone de salida suficiente para pensamiento automático. El catálogo oficial admite paginación after_id y mantiene metadatos previos.
- **FR-005**: Pruebas frontend/backend y controles aplicables verdes antes de fusionar. Producción desde main por PR y CI; no se usa la clave real en el desarrollo ni se hacen inferencias reales hasta que el usuario la aporte y confirme en el formulario.

## Aceptación

1. Con clave sintética y APIs simuladas exitosas, se prueba Messages con visión y se publica calificacion.valoracion con claude-sonnet-5-5; las otras rutas permanecen iguales.
2. Una prueba fallida, publicación concurrente o borrador sin guardar no cambia la selección activa; clave nunca figura en mensajes.
3. El catálogo de dos páginas de Anthropic envía after_id y termina sin repetir página.
4. El panel no necesita nombre, URL, formato o modelo escritos por el usuario en el acceso rápido.

No incluye caché o Batch, ni cambia verificador/árbitro ni corrige notas históricas.

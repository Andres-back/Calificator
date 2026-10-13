# Decisiones de diseño

Investigación local del HEAD base `96ac964b29fcf1ca817aafdded1dd1cb36aac003`. No se requiere nueva tecnología ni consulta externa; se reutiliza el recorrido existente.

## Avisos según estado

- **Decision**: separar mensaje/acción activos e históricos, con contexto de proceso independiente.
- **Rationale**: `ReviewTriagePanel` actualmente reutiliza mensaje presente y botón «Revisar puntajes» aun con `historical=true`; además imprime `rawReasons`. La captura confirma esa ambigüedad.
- **Alternatives considered**: borrar todos los avisos confirmados perdería trazabilidad; ocultar también pendientes escondería discrepancias. Conservar fuente y traducir la presentación evita ambos problemas.

## Corrección y explicación

- **Decision**: mantener `GradeNoteExplanation`, `gradePresentation`, fórmula y ajuste registrados; simplificar copia y validar regresiones sin cambiar cálculo.
- **Rationale**: suma de puntos y escala final pueden diferir, y una decisión docente puede prevalecer. El guard backend de discrepancia no demuestra por sí mismo una nota equivocada. Ausencia de señales individuales tampoco significa respuestas correctas.
- **Alternatives considered**: recalcular al consultar o declarar que todo quedó resuelto modificaría datos o inventaría evidencia.

## Responsive y evidencia

- **Decision**: evolucionar layout 088 de lista/detalle, acordeones de evidencia/respuestas/retroalimentación y navegación existentes; no crear otra vista ni un segundo visor.
- **Rationale**: ya hay overlay móvil, zona de desplazamiento y protección de cambios. Revisar altura/padding/scroll real en navegadores en vez de añadir paneles fijos.
- **Alternatives considered**: mostrar todo expandido recargaría la vista; un nuevo wizard añadiría pasos y duplicaría navegación.

## Verificación eficiente

- **Decision**: tests focalizados y una validación final visual, más CI requerido.
- **Rationale**: alcanza estados, integridad y tamaños pedidos sin llamadas a IA ni cambios en producción. No requiere investigación delegada: los contratos y dependencias ya se conocen.
- **Alternatives considered**: repetir toda la batería o hacer calificaciones reales no es necesario para este ajuste de presentación.

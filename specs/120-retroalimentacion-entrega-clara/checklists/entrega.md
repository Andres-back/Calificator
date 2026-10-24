# Lista de calidad de requisitos: devolución docente clara

**Propósito**: revisar claridad, cobertura y coherencia de selección, autorización y presentación.
**Creada**: 2026-10-23
**Especificación**: [spec.md](../spec.md)

> Marcadores del revisor: `[x]` significa calidad del requisito revisada, no implementación finalizada. El ejecutor de implementación no modifica estos marcadores.

## Completitud

- [x] CHK001 ¿Se distinguen selección, nota oficial y autorización del mensaje para todos los docentes, incluidos lotes mixtos y alumnos sin nota? [Completitud, Spec FR-001/002/003; Historia 1]
- [x] CHK002 ¿El alcance del resumen excluye explícitamente preguntas/puntajes/referencias pendientes también del contexto de Xali, sin borrar los avisos históricos? [Integridad, Spec FR-004/010; Historia 2]
- [x] CHK003 ¿Se definen revisión/edición explícitas para mensajes provisionales, vacíos y contradictorios sin aprobación automática ni contenido inventado? [Claridad, Spec FR-005/006; Casos límite]

## Consistencia y recuperación

- [x] CHK004 ¿Las reglas de aprobación, obsolescencia, reintento y cambio de fuente son coherentes entre impresión, enlaces y revisión docente, preservando la vía histórica válida? [Consistencia, Spec FR-007/008; Contrato Compatibilidad]
- [x] CHK005 ¿Se documentan permisos, vigencia, evidencia opcional y cuota de conversación sin ampliar acceso por la selección visual ni por parentesco? [Cobertura, Spec FR-008; Supuestos]
- [x] CHK006 ¿Se preservan notas, textos originales, evidencias y auditoría, incluyendo cambios simultáneos y fallos parciales sin duplicación ni éxito ficticio? [Recuperación, Spec FR-007/010; SC-004]

## Medición y presentación

- [x] CHK007 ¿La organización del mensaje define casos identificables y fallback general, integridad del contenido, identidad y continuidad de impresión? [Claridad, Spec FR-006; Historia 3; SC-003]
- [x] CHK008 ¿Son medibles las acciones, dimensiones móviles/escritorio, longitud de muestra, controles accesibles y cobertura entre dos docentes, sin declarar validación pedagógica humana no realizada? [Medición, Spec FR-009; SC-001..004; Supuestos]

## Notas

Revisión asistida autorizada expresamente por el usuario el 2026-10-23 («Sí, revisa y continúa», respuesta a call_f774c40bd65149a4af5ab359bfb135f6). Revisados los ocho puntos contra spec, plan y contrato; satisfechos sin inconsistencias. Marcadores actualizados en esta fase de revisión autorizada, antes de Implement; no certifican pruebas ni producción.

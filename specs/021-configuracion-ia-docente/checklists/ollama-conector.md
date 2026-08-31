# Lista de calidad: Ollama Cloud y conector local

**Propósito**: validar seguridad de secretos, aislamiento, persistencia e idempotencia de la ampliación Ollama
**Creada**: 2026-08-30
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. [x] significa que la calidad del requisito fue aprobada, no que la implementación esté terminada.

## Completitud

- [x] CHK001 ¿Se distinguen de forma completa Cloud institucional, Cloud personal y conector local en configuración, auditoría y trabajos? [Completitud, Spec FR-022, FR-026, SC-012]
- [x] CHK002 ¿Están especificados alta, sustitución, prueba, revocación y enmascarado de ambas credenciales Cloud? [Completitud, Spec FR-023, FR-024]
- [x] CHK003 ¿Están definidos descubrimiento, actualización, retiro y compatibilidad de modelos mediante la conexión efectiva? [Completitud, Spec FR-025]
- [x] CHK004 ¿El contrato cubre emparejamiento, expiración, revocación, estado, modelos y desvinculación del conector? [Completitud, Spec FR-027, FR-029]

## Seguridad y aislamiento

- [x] CHK005 ¿Se prohíben explícitamente URLs docentes arbitrarias, puertos públicos, claves Cloud dentro del conector y secretos en logs? [Cobertura, Spec FR-028, FR-030 y Supuestos]
- [x] CHK006 ¿Está definida la autenticación de dispositivo y la pertenencia exclusiva de trabajos, modelos y resultados a un docente? [Claridad, Spec FR-030, SC-013]
- [x] CHK007 ¿Están definidos expiración, uso único y rechazo cruzado de códigos de emparejamiento? [Cobertura, Spec Casos límite]
- [x] CHK008 ¿La protección del token del conector Windows y su revocación tienen requisitos claros sin depender de una tecnología no portable del contrato? [Claridad, Spec FR-027, FR-032]

## Recuperación e idempotencia

- [x] CHK009 ¿Se definen estados y transiciones para espera, reclamación, lease, heartbeat, vencimiento, reintento, fallback y finalización? [Cobertura, Spec FR-030, FR-031]
- [x] CHK010 ¿Está especificado cómo una respuesta tardía o duplicada evita reanudar dos veces el trabajo original? [Recuperación, Spec FR-030]
- [x] CHK011 ¿Está definido qué ocurre con un trabajo reclamado cuando el conector se desconecta antes o después de ejecutar Ollama? [Excepción, Spec FR-031]
- [x] CHK012 ¿La política de fallback permanece capturada e inmutable durante desconexión, revocación o cambio de configuración? [Consistencia, Spec FR-012, FR-031]

## Medición, plataforma y experiencia

- [x] CHK013 ¿Los criterios de emparejamiento menor a tres minutos y trabajo completo definen versiones de Windows admitidas y condiciones de red? [Medición, Spec SC-011, SC-014]
- [x] CHK014 ¿Los estados Cloud y local son distinguibles y comprensibles en 360 px sin exigir direcciones técnicas? [Cobertura, Spec FR-016, FR-029, SC-008]
- [x] CHK015 ¿Se especifica la retención y eliminación del contenido temporal enviado al conector? [Privacidad, Plan Ampliación técnica]
- [x] CHK016 ¿Cada requisito de la ampliación tiene aceptación y una tarea con ruta concreta? [Trazabilidad, Spec FR-022 a FR-032]

## Notas

- Esta lista valida la calidad de los requisitos y no usa ni solicita credenciales reales.
- La revisión debe resolverse antes de implementar el conector.

# Plan: Digitalización confiable y señales de revisión visibles

## Contexto técnico

- Backend: FastAPI, Celery, SQLAlchemy y enrutador configurable de IA.
- Frontend: React/TypeScript con triage de revisión por componente.
- Persistencia: no se requiere migración; las señales viajan dentro del resultado JSON y del desglose existente.

## Enfoque

1. Separar la tarea textual `digitalizacion.estructura` del alias visual heredado.
2. Configurar un presupuesto de salida explícito para estructura y reutilizarlo en reparación de claves.
3. Conservar en el resultado trazable las alertas y la solicitud de revisión de GLM.
4. Hacer que el estado de revisión considere esas señales aunque la nota numérica coincida.
5. Pasar las alertas al triage, asociando números de pregunta de forma determinista y mostrando el resto globalmente.
6. Mantener intacta la fórmula autoritativa del desglose y la aprobación docente.

## Comprobación constitucional

- **Integridad**: no se cambia ni publica una clave de forma automática.
- **Asincronía**: se mantiene el trabajo recuperable y la extracción reutilizable.
- **IA intercambiable**: la etapa respeta el proveedor/modelo configurado.
- **Trazabilidad**: se persisten modelo, alertas, tiempos y causa de revisión.
- **Pruebas**: se añaden regresiones backend/frontend y validación real sin publicación.

## Riesgos y mitigaciones

- Alertas ambiguas: se muestran globalmente sin inventar una asociación.
- Falsos positivos al extraer números: solo se reconocen números precedidos por “pregunta”.
- Respuesta extensa: presupuesto mayor y detección existente de truncamiento.
- Cambio de nota accidental: las alertas solo priorizan revisión; la fórmula no se modifica.

## Contratos internos

- `grader_b.alertas: string[]`
- `grader_b.requiere_revision_docente: boolean`
- El triage acepta señales externas opcionales y devuelve advertencias globales adicionales.

## Validación

- Pruebas unitarias focalizadas del enrutamiento y la reparación.
- Pruebas de persistencia/estado de revisión.
- Pruebas React del mensaje de consenso y asociación de preguntas.
- Prueba real en producción con la evidencia autorizada, sin confirmar ni publicar.

# Revisión de aclaraciones — 107

Fecha: 2026-10-20. Estado: requisitos aclarados, aún sin implementación ni cambio de producción.

Se integraron tres aclaraciones: formatos complementarios y acceso sin cuenta; opción A para la audiencia; y la adición espontánea de cinco preguntas cada diez minutos con acceso por estudiante, nunca por apellidos/familia. No se formuló una nueva pregunta en esta iteración ni quedan decisiones críticas abiertas para planificar.

La hoja completa queda solo para el docente, con impresión/recorte. Cada familia recibe el enlace individual correspondiente, sin registro ni inicio de sesión. No se implementa una hoja nominal colectiva para familias. Vigencia propuesta de 72 horas y control de desactivación/reactivación se conservan.

Xali tendrá un máximo de cinco preguntas nuevas aceptadas en una ventana móvil de 600 segundos por estudiante/evaluación. El cupo se comparte entre sus enlaces y dispositivos, no se reinicia con renovación/reactivación y no agrupa estudiantes con apellidos iguales. Llegar al límite no impide leer mientras el acceso sea válido; vencimiento o desactivación bloquean ambos usos. El límite exacto no se presenta como comportamiento actual verificado. La revisión del router actual y del limitador genérico no acredita por sí sola la aplicación de esta regla en Xali; su compatibilidad con el flujo autenticado se revisará en el plan.

## Cobertura revisada

| Categoría | Resultado |
|---|---|
| Alcance y comportamiento | Resuelto: impresión docente y enlace individual, sin hoja familiar colectiva. |
| Dominio y datos | Resuelto: estudiante/evaluación/resultado/revisión y cupo estable; no inferir parentesco ni agrupar por apellidos. |
| Interacción y experiencia | Resuelto: entrada directa sin cuenta, celular y entrega individual. |
| Calidad no funcional | Resuelto: cinco preguntas en ventana móvil de 600 segundos, concurrencia y no duplicación, además de corrección, vigencia y privacidad; no se afirma implementación ni resultados inexistentes. |
| Integraciones y dependencias | Claro: etapas y Xali existentes; detalles de compatibilidad/protocolo y coordinación de impresión #206 corresponden al plan. |
| Casos límite y fallos | Resuelto: concurrencia, reintentos, múltiples dispositivos, renovación sin reiniciar cupo y vencimiento prioritario, además de revocación, reenvíos y cambios de nota. |
| Restricciones y decisiones | Resuelto: opción B excluida; los enlaces individuales son credenciales que se pueden reenviar. |
| Terminología | Claro: hoja docente completa frente a ficha/enlace individual. |
| Señales de finalización | Claro: 27 requisitos y diez criterios de éxito verificables. |
| Marcadores y decisiones abiertas | Resuelto: cero marcadores de aclaración. |

## Lista de calidad

En esta iteración: **16/16 → 16/16**, sin cambios de estado ni casillas pendientes. La revisión anterior pasó de 14/16 a 16/16. Se conservan literalmente los textos y notas del checklist como establece Clarify; las menciones «pendiente» en esos textos son contexto histórico de la primera revisión, no decisiones actualmente abiertas.

Cambios de esta iteración: aclaraciones, historia 4, casos límite, FR-012/015/020/027, entidades, SC-010 y supuestos. Se conserva el resto del alcance, la integridad de datos y la separación de Spec 101.

Actualización de gobernanza, 2026-10-20: el usuario aprobó alcance y posteriormente plan mediante respuestas sucesivas «aprove»; se registraron `spec-approved` y `plan-approved` en #223. Se generaron las tareas y la lista personalizada de ocho puntos `checklists/entrega-individual.md`, todavía sin revisión autorizada ni marcas. La lista integrada 16/16 se mantiene; no se presenta aprobación como implementación o autorización de fusión/despliegue. Sin hooks de extensión configurados.

Actualización posterior del mismo día: el usuario autorizó expresamente la revisión asistida («autorizo»); lista personalizada revisada 8/8 antes de iniciar Implement. Avance de implementación y pruebas reales en `tasks.md` y `validation.md`. Las referencias anteriores a ausencia de implementación describen la etapa de aclaraciones, no el estado actual.

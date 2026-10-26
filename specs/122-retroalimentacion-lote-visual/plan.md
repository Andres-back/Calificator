# Plan: retroalimentaciones en lote, enlaces copiables y fichas visuales

**Rama**: `codex/122-retroalimentacion-lote-visual` | **Fecha**: 2026-10-23 | **Spec**: [spec.md](./spec.md) | **Issue**: #257

**Estado**: aprobado por el usuario («aprobe»). Revisión de requisitos autorizada («Sí, revisa y continúa»). La aprobación permite implementar y generar los veinte assets finales; no autoriza publicar notas reales, emitir enlaces reales ni cambiar producción durante el desarrollo.

## Resumen

Añadir un coordinador acotado a evaluación que acepte y publique por decisión docente explícita, preserve ajustes y deje autorizada la devolución resultante. Integrar copia individual y múltiple de enlaces que pueda repetirse al reabrir. Mejorar la impresión con veinte ilustraciones transparentes estáticas y un diseño legible. Conservar servicios, historial, controles de fuente y cuota; no encadenar desde el cliente los batch antiguos ni recalificar.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11 del contenedor y TypeScript/React existentes.
**Dependencias**: FastAPI, SQLAlchemy async/PostgreSQL, Pydantic, cryptography, React, Vitest y Playwright ya presentes. Sin nueva librería de animación, generación dinámica ni proveedor de IA en el flujo.
**Persistencia**: migración aditiva para recibos idempotentes de aceptación/publicación y copia cifrada opcional de credenciales nuevas. Mantener digest como verificación pública. No backfill de secretos irrecuperables ni reescritura de notas.
**Pruebas**: unidad, integración aislada de persistencia/concurrencia/permisos, regresión académica y de acceso, TypeScript/lint/build, E2E Chromium/WebKit, revisión visual de transparencia y PDF A4/Carta.
**Plataforma objetivo**: navegador/PWA, 360/390/768/1440 px, temas claro/oscuro, teclado y emulación de teclado móvil. No certificar dispositivo físico con una simulación.
**Rendimiento y escala**: clase sintética de treinta estudiantes y mensajes hasta 6.000 caracteres. El cliente divide la acción global en tandas estables de hasta 25, con progreso entre respuestas y cancelación entre tandas; ningún flujo llama a IA. Medir duración y consultas por tanda; no mantener una transacción abierta esperando al portapapeles, imágenes o red externa. Ilustraciones reutilizadas y carga diferida en galería; medir y documentar peso final, evitando cargarlas en rutas ajenas.

## Verificación de la constitución

- Separación de roles: `grading.grade` y `grading.publish` para aceptar/publicar; propietario o administrador autorizado y matrícula/fuente vigentes por alumno. Recuperar URL exige autorización de gestión docente y validación de cada acceso, no solo ocultar botones. Ningún permiso nuevo para estudiantes.
- Integridad y trazabilidad: aceptación global explícita, valores congelados en previsualización, cero válido, prioridad de nota ajustada/confirmada y no-op de publicadas sin cambios. Reutilizar preflight visual, política de intentos y autoridad de desglose; no desactivarlos. Si un alumno falla, revertir todos sus cambios dentro de su savepoint; conservar los demás con resultado verificable.
- Asincronía e idempotencia: recibo durable por actor/evaluación/request_id y hash de petición; reintentos devuelven el mismo resultado sin repetir historial ni renovar accesos. Tandas pequeñas sin inferencia y estado visible de espera/éxito/error. Mantener el orden de bloqueos nota → publicación → acceso → cuota.
- Datos y secretos: columna cifrada nullable para credenciales nuevas, con derivación separada por propósito desde el secreto ya gestionado de la aplicación y prefijo de formato versionado. No reutilizar el contrato tolerante a texto plano de claves IA. Autenticar cifrado y comprobar que el token recuperado coincide con el digest y generación antes de devolverlo. No tokens en URL de petición, logs, GET de listado, localStorage, Git ni recibos del lote. Headers privados/no-store y auditoría sin URL.
- Accesibilidad: objetivos de 44 px, disposición de una columna móvil y dos áreas útiles en escritorio; lectura progresiva, selección persistente y acciones no superpuestas al contenido/teclado. Motivos con alt vacío decorativo y opción sin ilustración.
- Proveedores intercambiables: no alterar modelos ni rutas. Crear veinte imágenes mediante la herramienta de imagen incorporada después de aprobación; transparencia real y ningún dato educativo real en prompts. Sin uso de la clave de producción ni llamadas pagadas a sus proveedores para probar el cambio.
- Gobernanza y pruebas: issue #257, especificación y plan aprobados por el usuario; calidad de especificación 16/16 y lista de requisitos 8/8 revisada con autorización expresa antes de implementar. Checklist/Tasks/Analyze preceden al código; Implement/Converge, inventario y CI cierran el trabajo. No afirmar mejora del aprendizaje ni validación pedagógica por pruebas visuales.
- Main protegida: rama `codex/122-retroalimentacion-lote-visual` desde main aprobado. PR y todos los controles verdes; sin push directo, merge o despliegue manual por esta preparación.

Resultado previo y posterior al diseño: sin excepción constitucional ni aclaración abierta. La decisión docente de aceptar notas es explícita; una excepción de integridad conserva un impedimento concreto, no se convierte en publicación automática.

## Estructura del proyecto

- `backend/app/modules/feedback_sharing/`: coordinación de lote, preparación de mensajes visibles, recibos, copia autenticada y contratos.
- `backend/app/modules/calificaciones/service.py`: extraer únicamente operaciones internas sin commit para reutilizar confirmación/publicación; conservar firmas y comportamiento de rutas actuales y sus políticas.
- `backend/alembic/versions/`: migración aditiva posterior a `202610230002` y comprobación aislada con datos heredados sintéticos.
- `frontend/src/modules/feedback_sharing/`: selección/lote, controles comunes de enlaces, copia múltiple, impresión y galería de motivos.
- `frontend/src/modules/calificaciones/`: entrada individual docente reutilizando los mismos controles, no otra lógica de compartir.
- `frontend/public/assets/feedback-motifs/`: veinte PNG transparentes y manifiesto/brief; assets generados una sola vez, no al imprimir.
- `backend/tests/`, `frontend/src/modules/feedback_sharing/*.test.*`, `frontend/e2e/`: contratos, persistencia, permisos, concurrencia, copia y visuales con fixtures sintéticas.
- Specs107/120, especificación responsable de confirmación/publicación, índice de specs e inventario: precisar reglas afectadas sin versionar el borrador121 descartado ni cambios ajenos de Spec034/115.

## Decisiones y complejidad

1. Coordinador único con savepoint por alumno y recibo por tanda; no llamar wrappers que realizan commits autónomos. Orden: revalidar fuente → aceptar si procede → publicar nota → flush → recalcular fuente → aprobar devolución → resultado. No emitir acceso todavía.
2. Aceptar una propuesta significa usar exactamente el valor mostrado y validado por servidor. Una nota confirmada o ajustada no se reemplaza por su propuesta antigua. Una publicada con devolución ya vigente es no-op; no suspender enlaces sanos por repetir la misma operación.
3. El resumen global muestra mensajes exactos entregables, cantidades, avisos y excepciones, con expansión opcional por alumno. Un formateador conservador puede separar un prefacio técnico conocido del contenido educativo, pero no ocultar incertidumbre sustantiva ni inventar contenido; preservar fuente original y vista previa aceptada. Los mensajes vacíos, contradicciones reales o fuente inválida siguen requiriendo corrección concreta.
4. La copia recuperable necesita cifrado: el hash existente no permite reconstruir un enlace. Campo nullable y recuperación autenticada separada, sin reemplazo silencioso. Las URLs históricas continúan funcionando, pero su copia puede requerir un reemplazo explícito. Generar o renovar actualiza digest, ciphertext y generación en la misma transacción; reactivar no reinicia cuota. Fallo de descifrado no invalida el acceso público por sí mismo y no provoca regeneración automática.
5. «Copiar todos» es una herramienta privada del docente, no un envío a un grupo. Devuelve nombre+URL por destinatario válido; errores y omitidos se informan. Si el portapapeles falla, mostrar texto seleccionable en memoria que se borra al cerrar o cambiar de cuenta/evaluación.
6. Los veinte motivos están definidos en [assets-brief.md](./assets-brief.md). Selección manual o mezcla determinista por estudiante, sin relacionar ilustración con su rendimiento. Mismo motivo en continuaciones; no generar ni descargar desde dominios externos al imprimir.
7. Reservar una zona fija pequeña para ilustración/cabecera y reflejar exactamente sus medidas en `printPagination.ts`. Mantener cuerpo ≥12 pt y ancho útil, líneas de corte y fuente de texto completa. Añadir decoración solo una vez por ficha o con un marcador discreto en continuaciones; no fondos ni colores imprescindibles.
8. Preparación actual exclusivamente documental. No aceptar notas reales, cambiar claves, crear enlaces, probar chat con proveedores ni actualizar producción hasta la fase y autorización correspondientes.

## Presentación 129

[Plan129](../129-retroalimentacion-flujo-claro/plan.md), issue #272: reutilizar FeedbackBatchPublish y FeedbackPrintSheet, no duplicar sus reglas. El centro conserva impresión/retorno/selección y entrega en el mismo panel; sustituye la lista separada de enlaces nuevos por resultados contextuales, manteniendo copia individual y privada.

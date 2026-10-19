# Plan: Xali docente contextual y visual

**Rama**: `codex/104-xali-docente-visual` | **Fecha**: 2026-10-17 | **Spec**: [spec.md](./spec.md) | **Issue**: [#215](https://github.com/Andres-back/Calificator/issues/215)

## Resumen

Contexto docente autorizado independiente del RAG, historial aislado por usuario/materia y apoyos visuales declarativos validados, ampliables y con alternativa textual. Conservar endpoints, campos públicos y mensajes antiguos; aprovechar metadata ya existente sin migraciones. El código de cámaras/iconos del PR #216 y Spec 101 permanecen fuera de esta rama. Plan aprobado por el usuario el 2026-10-17; implementación y validación local registradas en quickstart.md, sin autorización de fusión o despliegue.

## Contexto técnico

**Lenguajes/versiones**: Python/FastAPI/Pydantic del backend existente; TypeScript 5.6/React 18 en frontend.
**Dependencias**: LLMRouter, recuperación RAG y permisos actuales; RichContent/Modal; Recharts ya instalado para barras/líneas y SVG construido por componentes propios para geometría/plano. Sin paquetes nuevos ni generación de imágenes.
**Persistencia**: `chat_messages.mensaje` conserva texto; nuevos apoyos/fuentes versionados en `metadata` ya existente. Sin conversión de mensajes anteriores. No persistir datos de alumnos en ejemplos.
**Pruebas**: pytest de contexto/permisos/visual/persistencia y bloqueos; Vitest de validación/representación/estado; E2E sintéticos Chromium/WebKit 360/390/1440, claro/oscuro; base aislada para concurrencia y metadata.
**Plataforma objetivo**: móvil primero, Android/iPhone/escritorio en navegador; no presumir teclado físico validado por emulación.
**Rendimiento y escala**: máximo una generación activa por usuario/conversación; navegación y ampliación no generan. RAG opcional con presupuesto local de 3 segundos y degradación explícita, sin alterar timeouts/modelos globales. Hasta cuatro visuales y 48 KB de datos visuales serializados por respuesta, con límites de elementos; componentes visuales cargados a petición sin precarga pública de charts.

## Verificación de la constitución

- Separación de roles: resolver materia con `ensure_can_manage_materia` después de autenticar/autorizar Xali; docente propietario o administrador según política existente. Aplicar antes de chat, historial y borrado; flujo estudiantil post-entrega conserva políticas y endpoints. RAG restringido también a propietario real de la materia.
- Integridad y trazabilidad: texto/fuentes/visuales guardados juntos en el historial del usuario; lista de fuentes deriva de recuperación real, no de IDs inventados por el modelo. Cero cambios de notas, evidencias, criterios o evaluaciones.
- Asincronía e idempotencia: token de contexto y AbortSignal en cliente, verificaciones también en catch/finally; lock transaccional no bloqueante por usuario/contexto en chat/borrado evita generación simultánea o resurrección tras borrar. Doble toque bloqueado, sin reenvío automático tras resultado incierto; primero refrescar historial original. Cancelar HTTP no se promete como cancelación del servidor.
- Datos y secretos: no se ejecutan HTML/SVG/código ni expresiones del modelo; datos acotados y números finitos, etiquetas escapadas. Contexto mínimo sin alumnos/credenciales; errores/logs sin mensajes, fuentes completas o secretos.
- Accesibilidad: título/descripción/tabla alternativa por visual, controles 44 px, foco/restauración/Escape, ampliación y scroll local. Verificar temas y escritura con teclado simulado; distinguir hardware real.
- Gobernanza y pruebas: alcance y plan aprobados; lista específica (contexto/roles, fuentes, datos, recuperación, móvil y conservación) revisada con autorización. Tasks, Analyze, Implement, pruebas y Converge con resultados trazados en quickstart.md. No se reutiliza autorización de PR #213/#216 para fusión o producción. Sin excepciones a la constitución.

## Estructura del proyecto

- `backend/app/modules/xali/{router,service,schemas}.py`: autorización y contexto docente; orquestación conserva respuesta externa textual.
- Nuevos `backend/app/modules/xali/teacher_context.py` y `visual_content.py`: contexto/fuentes y validación/serialización declarativa separados de reglas estudiantiles.
- `backend/app/modules/rag/context_builder.py` y `retrieval_service.py`: opción interna acotada para excluir catálogo global en Xali y filtrar materia/propietario; defaults preservan demás consumidores.
- `backend/tests/unit/test_xali_teacher_context.py`, `test_xali_visual_content.py` y pruebas de regresión de políticas existentes; pruebas de integración aislada para historial/concurrencia.
- `frontend/src/modules/xali/{XaliPage,api}.tsx/.ts` y pruebas: contexto explícito y cancelación segura, sin reescribir la vista estudiantil.
- Nuevos módulos locales de validación visual, respuesta docente y visor ampliado en `frontend/src/modules/xali/`; RichContent sigue siendo lector de Markdown, no ejecutor ni parser visual global.
- `frontend/e2e/xali-teacher-visual.spec.ts` y selección WebKit focalizada: materias/cuentas y respuestas sintéticas.
- `specs/104-xali-docente-visual/`, registro en índice y enlace evolutivo al propietario 009 al implementar.

## Decisiones y complejidad

1. Materia desde servidor, nunca confiar en nombre/rol enviados por cliente. Inyectar nombre/área/grado conocidos en el prompt y corregir «Pregunta del estudiante» por «Consulta del docente». Falta de RAG no elimina contexto básico.
2. Consulta/borrado general usa `materia_id IS NULL`, no ausencia de filtro. Aislar por usuario; no borrar ni migrar mensajes de otras materias. UI renombra «Todas» a «Conversación general» para docentes.
3. Reutilizar LLMRouter y una sola generación por envío explícito; datos/fuentes no son instrucciones. RAG restringido por materia y propietario, sin catálogo global no seleccionado, con timeout/savepoint y aviso de ausencia de fuentes. No modificar recuperadores de calificación ni sus defaults.
4. Mantener contratos externos: `respuesta:string`, `materia_id`, historial con `mensaje:string`. El servidor valida datos visuales y los serializa en un bloque reservado `xcalificator-visual-v1` dentro de la respuesta textual; metadata guarda el sobre canónico. El historial reconstruye ese bloque solo para respuestas docentes validadas. El lector local de Xali separa texto y bloque; no se introduce interpretación global en RichContent ni se ejecuta contenido. Alternativa de campos públicos adicionales descartada para conservar el contrato actual. Un cliente anterior conserva explicación y bloque textual, aunque no la nueva representación visual.
5. Validación estricta idéntica por casos en servidor/cliente: cuatro tipos declarativos; máximo cuatro visuales, tabla 30×8, cuatro series de 60 puntos, 40 primitivas por figura y coordenadas finitas/acotadas. Visual inválido se omite con aviso; texto se mantiene. Versión desconocida no se interpreta.
6. Plano/figura desde coordenadas/primitivas validadas, unidades uniformes y proporciones reales. Rectas a partir de pendiente/intercepto con cálculo local, nunca eval de expresiones. Curvas arbitrarias/arte generado quedan fuera; explicar límite. Barras/líneas desde datos, con equivalencia tabular accesible.
7. Borrado/concurrencia: lock PostgreSQL transaccional por usuario/materia; intento no bloqueante devuelve conflicto comprensible si ya hay consulta activa. No mantener una tarea en segundo plano sin seguimiento. Persistencia de la pareja de mensajes y metadata atómica. Fallo incierto exige refrescar historial antes de ofrecer un nuevo envío; no prometer exactly-once entre reintentos voluntarios sin identificador de petición público.
8. Preservar HTTP/formato público y datos anteriores. Las limitaciones de matemática del modelo se explican: validación garantiza representación de datos, no corrección absoluta de toda explicación pedagógica.

Diseño completo en [research.md](./research.md), [data-model.md](./data-model.md), [contrato](./contracts/chat-visual.md) y [validación](./quickstart.md). La validación usa respuestas simuladas y no acredita la precisión pedagógica de un modelo real ni un despliegue en producción.

## Corrección de medición E2E autorizada

El usuario autorizó el 2026-10-17 corregir el fallo de CI por altura visual `43.999969482421875` para un control CSS de 44 px. La prueba conserva el mínimo estricto en CSS, espera la medición con polling y admite exclusivamente 0,001 px de precisión en DOMRect. Una regresión sintética debe rechazar tanto CSS de 43 px como una transformación que reduzca realmente el área táctil. No cambia componentes, estilos ni comportamiento del producto; sin omitir pruebas, fusionar o desplegar.

# Decisiones de diseño e investigación local

## Contexto y permisos

**Decisión**: resolver materia autorizada en servidor e inyectar su nombre/área/grado independientemente del RAG. Reutilizar la política propietario/administrador de `materias/service.py`; autorización previa a recuperación/LLM también en historial/borrado.

**Evidencia**: XaliPage envía materia_id, pero `xali/service.py:chat` solo incorpora RAG opcional y rotula «Pregunta del estudiante». La conversación sin materia no añade filtro: mezcla historiales y el borrado general abarca todas las materias del usuario. Corregir a contexto NULL sin modificar mensajes existentes.

**Alternativas**: confiar en rótulos de frontend o asumir especialidad única del profesor se descarta. Cambiar políticas estudiantiles no es necesario ni autorizado.

## Recuperación de fuentes

**Decisión**: máximo seis fragmentos, 1 200 caracteres cada uno y 8 000 de contexto recuperado; títulos/IDs/versiones reales para procedencia. Filtrar materia y propietario real en fuente/fragmento, con opción interna para excluir catálogo global; mantener defaults de otros consumidores. Presupuesto local 3 s y recuperación de la sesión mediante savepoint; si falla, ayuda general claramente identificada.

**Evidencia**: `retrieval_service.search_chunks` admite profesor_id y preflight, pero contexto Xali no lo pasa e incluye alternativa de catálogo global DBA. La ausencia de candidatos retorna sin llamar embeddings. No se alteran embeddings/proveedores ni el flujo de calificación.

**Alternativas**: enviar todo el catálogo, inventar fuentes o exigir documentos para usar el bot se descartan.

## Formato y persistencia visual

**Decisión**: sobre declarativo versionado en metadata existente; salida compatible serializada como bloque reservado dentro del texto. Pydantic estricto en servidor y parser acotado en el módulo docente; RichContent no cambia. Recharts existente para gráficos, SVG generado desde primitivas por código propio para plano/figura. Nada de evaluar código/expresiones o aceptar SVG/HTML/props del modelo.

**Evidencia**: migración `202606290002_phases_3_to_8.py` ya define `chat_messages.metadata` JSONB no nulo. Los contratos actuales solo entregan respuesta textual y mensaje; RichContent soporta GFM/KaTeX, no gráficos. Investigación focalizada de lectura confirmó Recharts y patrón responsive ya presentes, burbujas de Xali al 80 % y pruebas actuales concentradas en estudiantes.

**Alternativas**: campos públicos nuevos serían más directos pero cambian contrato; migración/tabla nueva es innecesaria. JSON arbitrario, SVG del modelo, enlaces fabricados e imágenes generativas para matemáticas exactas se descartan. El sobre reservado requiere parser local bien probado y cliente nuevo para dibujarlo; clientes anteriores conservan el texto legible y el bloque.

## Estado, concurrencia y móvil

**Decisión**: AbortSignal + generación/contexto de cuenta/materia para chat, historial y borrado; validación de vigencia en éxito/error/finalización. Lock transaccional no bloqueante por usuario/contexto para chat/borrado; error de conflicto explícito y persistencia atómica de intercambio. Tras fallo incierto, actualizar historial sin reenvío automático. Visor ampliado con foco/Escape y descripción/tabla alternativa; recursos visuales lazy.

**Evidencia**: `XaliPage.send` añade respuesta, error y finally al estado actual sin comprobar contexto. `clearHistory` puede terminar al cambiar materia. Bloquear solo frontend no impide otra pestaña ni borrar durante una generación de servidor. No hay mecanismo de idempotency-key público en este flujo.

**Alternativas**: abortar y prometer que el servidor no guardará nada, duplicar llamadas para reparar cada visual o reintentar errores de red automáticamente se descartan. No se garantiza exactly-once entre nuevos envíos voluntarios sin cambiar contrato; sí se evitan concurrencia accidental y reenvío automático incierto.

No se usaron APIs de IA, producción ni datos reales. El usuario aprobó el alcance y plan el 2026-10-17 y delegó la revisión de los seis puntos de requisitos; los resultados posteriores de implementación y pruebas se registran en quickstart.md.

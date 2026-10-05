# Plan: visualización final y Word de evaluaciones

**Rama**: `codex/081-evaluacion-vista-word` | **Fecha**: 2026-10-04 | **Spec**: [spec.md](./spec.md) | **Issue**: [#169](https://github.com/Andres-back/Calificator/issues/169)

**Estado**: Aprobado por el usuario: «Sí, apruebo el plan y continúa». Registrado en issue #169 con `spec-approved` y `plan-approved`.

## Resumen

Añadir «Visualizar» como acción docente independiente de edición. Mostrar el PDF
final a partir de datos guardados, sin respuestas por defecto, y ofrecer PDF/Word
editable. El solucionario requiere elección explícita y autorización de servidor.
No modificar la generación, publicación, resolución, modelos, entregas ni notas.

## Contexto técnico

**Lenguajes/versiones**: Python/FastAPI y React/TypeScript existentes.
**Dependencias**: WeasyPrint para PDF, python-docx 1.2.0 ya instalado para Word;
TanStack Query, Axios y Modal existentes. Sin proveedores IA ni dependencias nuevas.
**Persistencia**: Lectura de PostgreSQL; archivos generados en memoria y sin nuevas tablas.
**Pruebas**: pytest para autorización/documentos, Vitest para UI y Playwright responsive.
**Plataforma objetivo**: Navegador móvil/escritorio; servidor Linux actual.
**Rendimiento y escala**: Una exportación por acción, sin regeneración LLM. Renderizar
fuera del event loop; permitir cerrar/navegar durante la operación y mostrar estados.

## Verificación de la constitución

- Separación de roles: `evaluations.read` y ownership existentes; solucionario
  exclusivo del propietario docente/admin autorizado. Pruebas de acceso denegado.
- Integridad y trazabilidad: GET de solo lectura; ninguna escritura ni llamada IA.
- Asincronía e idempotencia: render en threadpool, estado de descarga y reintento;
  sin archivos persistentes duplicados y sin bloqueo de navegación.
- Datos y secretos: documentos sin datos personales; respuestas solo en versión privada.
- Accesibilidad: 360×800, 390×844, escritorio, claro/oscuro; modal flexible, un scroll
  útil, cierre visible y controles táctiles. Alternativa si PDF no se incrusta.
- Gobernanza y pruebas: issue #169/rama 081; spec y plan aprobados. CI y PR
  obligatorios antes de desplegar; sin pushes directos a main. Sin excepciones.

Verificación previa y posterior al diseño: no se requieren migraciones ni cambios
de calificación. Aprobaciones humanas y checklist verificados antes de implementar.

## Estructura del proyecto

- `backend/app/modules/evaluaciones/router.py`: reutilizar autorización PDF y añadir
  `GET /evaluaciones/{evaluacion_id}/docx`; exportación segura en memoria.
- `backend/app/modules/evaluaciones/export_service.py`: adaptación compartida de los
  datos impresos para evitar discrepancias PDF/Word; renderer Word y nombre seguro.
- `backend/app/modules/herramientas/pdf_render.py`: conservar las plantillas finales
  actuales; ajustes solo si son necesarios para errores de integridad del documento.
- `frontend/src/modules/evaluaciones/api.ts`: solicitud autenticada de exportaciones,
  compatible con `evaluationPdfUrl` existente y manejo de errores Blob.
- `frontend/src/modules/evaluaciones/components/EvaluationPreviewModal.tsx`: vista
  final de solo lectura y acciones descargar/solucionario.
- `frontend/src/modules/materias/MateriaEvaluaciones.tsx` y
  `frontend/src/modules/evaluaciones/EvaluacionesPage.tsx`: integrar «Visualizar» sin
  depender de `evaluations.update`; no introducir otra ruta de navegación.
- Pruebas existentes de evaluaciones y exportaciones, pruebas focalizadas de preview,
  E2E responsive e inventario/baseline de especificaciones.

## Decisiones y complejidad

1. Reutilizar el PDF real, no reconstruir un formato distinto en tarjetas HTML.
   El modal obtiene el archivo con Axios/cookies para conservar renovación de sesión
   y errores claros. Los object URLs temporales se liberan al cambiar versión/cerrar.
2. Usar un modelo imprimible común y renderizar Word nativo editable (no imágenes
   de todas las páginas). Conservar títulos, opciones, puntajes y respuestas
   esperadas por número; normalizar prefijos sin duplicar letras de opciones.
3. Para origen material, conservar el PDF de su plantilla original. Word debe
   mantener los datos relevantes y texto/contexto de los tipos soportados. Si
   alguna estructura no permite exportación íntegra, rechazar esa conversión con
   explicación y ofrecer PDF; nunca sustituir por un examen vacío o incompleto.
4. Fórmulas se conservan al menos como texto editable; no prometer igualdad exacta
   de paginación PDF/Word ni edición de ilustraciones complejas. No descargar
   recursos remotos arbitrarios durante la conversión.
5. Pruebas de autorización e integridad antes de UI; comparar contenido exportado
   con los registros. Exportar no actualiza calificación ni campos de evaluación.

## Entrega y validación

Ejecutar pruebas focalizadas, tipos/lint/build y CI aplicable. Abrir PR enlazado
solo después de resolver tareas; no fusionar si hay controles rojos. Tras autorización
de entrega, verificar una evaluación demo existente en producción mediante lectura
y descarga, sin publicar/editar ni crear datos estudiantiles. Registrar resultados
en issue #169. Véase [quickstart.md](quickstart.md).

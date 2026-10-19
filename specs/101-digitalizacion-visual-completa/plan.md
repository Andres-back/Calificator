# Plan: Digitalización y edición visual completa

**Rama**: `codex/101-digitalizacion-visual-completa` | **Fecha**: 2026-10-15 | **Spec**: [spec.md](./spec.md) | **Issue**: #211

**Estado**: Plan aprobado por el usuario el 2026-10-15 mediante «aprove»; aprobación registrada como `plan-approved` en el issue #211. Implementación local en curso: T001–T014 comprobadas; T015–T039 pendientes. Función no desplegada ni activada.

## Resumen

Introducir un contrato visual común para importar evaluaciones, añadir contenido por pregunta y conservarlo en consulta, exportación y calificación. El original permanece privado e inmutable; las preguntas referencian bloques y recursos versionados. No se reemplazan figuras importadas por ilustraciones inventadas.

PDF e imágenes se analizan visualmente incluso cuando existe texto seleccionable. DOCX combina lectura ordenada de su contenido con una conversión visual aislada para recuperar tablas como imágenes, dibujos flotantes y gráficos. El editor ofrece una acción opcional «Añadir contenido»: subir o crear con IA, previsualizar y aceptar. Tablas y gráficas usan datos estructurados y dibujo determinista; ilustraciones usan la generación de imágenes ya administrable.

La misma revisión se usa en visor, PDF, Word y entradas de los modelos. Las notas guardadas no se recalculan. La preservación histórica es una condición previa, no una tarea posterior al editor.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11 en contenedores; TypeScript 5.6 / React 18 en frontend, según manifiestos actuales.
**Dependencias**: FastAPI, SQLAlchemy/Alembic, PostgreSQL, Celery/Redis; PyMuPDF, python-docx, Pillow y WeasyPrint existentes; conversor LibreOffice headless en contenedor interno restringido, no en el proceso HTTP ni en todos los workers. Sin nuevo proveedor IA ni biblioteca genérica de edición enriquecida.
**Persistencia**: Dos tablas aditivas para recursos privados y revisiones inmutables de contenido; referencias opcionales en evaluación y futuras entregas. Archivos bajo almacenamiento privado existente con hashes, propietario, estado y procedencia. Sin actualización masiva de filas antiguas.
**Pruebas**: pytest unitario/integración y migraciones aisladas; Vitest para contrato y editor; Playwright Chromium/WebKit para flujos, permisos y capturas; inspección visual de PDF y DOCX renderizado en entorno aislado; cuatro controles CI obligatorios.
**Plataforma objetivo**: Android/iPhone desde navegador y acceso instalado; 360/390 px y escritorio, claro/oscuro. Conversión de documentos en Linux reproducible; ningún requisito de instalar Word o LibreOffice en el celular.
**Rendimiento y escala**: Mantener carga de 20 MB, procesamiento asíncrono y concurrencia de digitalización inicialmente 1; no mover tareas al worker de calificación. Cachear extracción y render por revisión/hash y no llamar visión una vez por pregunta si comparten página. Medir cola, preparación, conversión, extracción, estructura, persistencia y exportación por separado; comparar seis muestras antes/después. Objetivo de interacción: ninguna tarea pesada en el hilo de la interfaz; comparar latencia p95 de abrir/guardar preguntas de texto con tolerancia máxima del 10 % en el mismo entorno. No prometer tiempos del proveedor sin medición.

Los límites efectivos de páginas, píxeles y bytes normalizados se obtendrán de la configuración de visión vigente y se mostrarán antes de cargar; DOCX se comprueba también después de convertir. Si el archivo completo excede un límite, se rechaza explicando cómo dividirlo, nunca se procesan solo las primeras páginas. El símbolo actualmente declarado `MAX_SCANNED_PDF_PAGES` no se considera evidencia de límite aplicado: el código real usa `MAX_GRADING_PDF_PAGES` en la preparación multimodal.

## Verificación de la constitución

- Separación de roles: diseño conforme; autorización por evaluación y por recurso, no por conocer una URL ni por permiso global de imágenes. Serialización separada de originales privados y estímulos publicables; pruebas permitidas/denegadas obligatorias.
- Integridad y trazabilidad: diseño conforme; revisión de contenido fijada antes del trabajo, recursos inmutables, claves separadas, contexto insuficiente requiere revisión, ningún recálculo automático. Una revisión histórica no se deduce del blueprint actual.
- Asincronía e idempotencia: diseño conforme; jobs y leases existentes, cache por esquema/hash, propuestas no aceptadas fuera del contenido vigente, detección de conflictos. Conversión y generación con límites y cancelación explícitos.
- Datos y secretos: diseño conforme; migraciones aditivas y reversión no destructiva; nada real en Git o CI. No descargar URLs arbitrarias ni exponer rutas privadas. El conversor no recibe credenciales, acceso al volumen de evidencias ni salida a Internet.
- Accesibilidad: diseño conforme; editor progresivo, objetivos táctiles, foco y cierre recuperables, ampliación de figura, desplazamiento solo de tabla, lector compartido también para estudiantes.
- Gobernanza y pruebas: alcance y plan aprobados en chat e issue `spec-approved` y `plan-approved`. Checklist, Tasks y Analyze antes de código. Merge y despliegue solo con autorización separada y CI verde.

**Revisión posterior al diseño**: sin excepción constitucional. Los puntos anteriores son decisiones verificables, no pruebas ya ejecutadas. La activación queda bloqueada si falla la preservación histórica, la conversión fiel o un control de permisos.

## Estructura del proyecto

Áreas existentes:

- `backend/app/modules/evaluaciones/`: modelos/esquemas, importación, blueprint, guardado, rutas y exportación.
- `backend/app/workers/tasks_digitalization.py`, `tasks_grading.py` y `backend/app/modules/calificaciones/`: fijación de revisión, contexto visual de cada etapa, cobertura e historial.
- `backend/app/services/storage_service.py`, `image_router.py` y resolución IA: reutilizar contratos sin convertir los adjuntos en biblioteca pública ni cambiar rutas efectivas de modelos.
- `backend/app/modules/herramientas/pdf_render.py`: consumir los bloques visuales del examen sin alterar otros recursos.
- `frontend/src/modules/evaluaciones/`, `frontend/src/types/api.ts` y vistas de materia que abren el editor: round-trip de bloques, inserción, revisión y lectura docente/estudiante.
- `backend/alembic/versions/`, `backend/tests/`, `frontend/e2e/`, `docker-compose.yml` y CI: migración, fixtures sintéticas, conversor y comprobaciones.
- `specs/005-evaluaciones/`, `008-calificaciones/`, `012-ia-jobs-produccion/` e inventario técnico: actualizar superficies responsables al implementar.

Módulos nuevos previstos, acotados al dominio:

- `visual_schemas.py`, `visual_service.py`, `visual_router.py`: contrato tipado y autorización de recursos/versiones/propuestas.
- `document_visual_extractor.py`, `visual_render.py`: manifiesto ordenado, cobertura y representación común de tablas/gráficas.
- `backend/app/workers/tasks_evaluation_visuals.py`: generación persistente usando infraestructura real de jobs, no el stub `tasks_images.py`.
- `document-renderer/`: conversión DOCX→PDF aislada, sin puerto publicado ni acceso a datos guardados.
- Componentes `QuestionVisualEditor`, `EvaluationContentViewer` y `EvaluationSourceReview`, con estilos y pruebas junto a cada componente.

Los módulos de contrato, persistencia, rutas privadas, extractor y conversor aislado ya tienen implementación local comprobada. La integración con trabajos, lectores, exportación, calificación y editor continúa pendiente. El detalle de datos y operaciones está en [data-model.md](./data-model.md) y [contracts/interfaces.md](./contracts/interfaces.md).

## Decisiones y complejidad

1. **Persistencia antes de interfaz**. Una tabla como imagen necesita un recurso privado duradero; no basta guardar un texto OCR o quitar el rechazo actual de Word. Los recursos aceptados se almacenan antes de enlazarlos; una transacción fallida deja una propuesta recuperable, no una evaluación con referencias rotas.
2. **Contrato visual único**. Bloques ordenados de texto/imagen/tabla/gráfica/fórmula y referencias estables de pregunta; conservar los números y campos existentes. Lectores y normalizadores preservan los campos nuevos. Documentos sin bloques siguen el recorrido actual, sin backfill.
3. **Revisiones completas para evaluaciones que usen contenido visual**. Guardar preguntas, clave, criterios, contexto y manifestación de recursos como una unidad inmutable; publicar o modificar crea una revisión nueva con control optimista. Fijar la revisión al comenzar una entrega online y al recibir la foto/encolar, no cuando el worker arranca. Si el alumno trabaja en otra revisión, conservar la iniciada.
4. **Compatibilidad histórica honesta**. Los registros antiguos sin snapshot siguen su lector anterior, sin atribuirles figuras nuevas. Antes de la primera edición visual se conserva una línea base del contenido actual, etiquetada como observada al activar, no como prueba de lo que un alumno vio en el pasado. Una entrega anterior sin revisión no recibe automáticamente el material nuevo. Bloquear cambios visuales mientras haya trabajos antiguos activos sin revisión; no alterar esos trabajos para desbloquearlos. Una recalificación antigua que requiera escoger versión pide acción explícita del profesor; no es migración automática.
5. **Extracción híbrida y contraste visual**. PDF: texto + geometría + imágenes + trazos vectoriales + render de páginas. DOCX: bloques nativos y relaciones internas + render visual aislado. Imagen: conservar original y derivadas de lectura. La IA devuelve asociaciones y cobertura con referencias a regiones reales; una región ausente no se inventa. Si no puede separarse una figura, conservar la página privada y pedir recorte/reemplazo revisado antes de publicarla.
6. **Conversor aislado**. Servicio interno sin credenciales, volumen de uploads ni Internet, con usuario sin privilegios, raíz de solo lectura, temporales por petición, macros y enlaces externos desactivados, tamaño/CPU/memoria/concurrencia limitados y timeout con limpieza. El worker autorizado entrega bytes y recibe PDF; no envía rutas del host. Headless no equivale por sí solo a aislamiento. El peso y los recursos del contenedor se miden antes de aprobar su activación.
7. **Generación apropiada al recurso**. Tablas/gráficas: IA propone datos validados; render propio de tipos acotados (barras, líneas, circular), nunca imagen generativa para cifras exactas. Tablas editables y gráficas redibujadas desde los mismos datos; mantener un raster equivalente para Word/visión. Ilustraciones/dibujos: reutilizar `generate_image` y `generacion_imagenes`; rechazar placeholders y persistir bytes. Ninguna capacidad nueva se da por disponible sin comprobarla.
8. **Editor opcional**. Una acción por pregunta abre carga o petición IA. En móvil ocupa el área útil con previsualización y acciones claras; no añade pasos obligatorios ni reemplaza el formulario entero. Datos numéricos, descripciones y cambios pendientes se conservan ante fallo o cambio de propuesta.
9. **Misma información, permisos distintos**. Figuras publicables visibles al alumno; documentos originales contestados, claves, notas internas y propuestas permanecen privados. Exportación resuelve recursos internamente; nunca obtiene URLs indicadas por el usuario. Calificador/verificador reciben recursos de evaluación identificados aparte de las fotos del estudiante.
10. **Lanzamiento controlado**. Activación separada y desactivable para nueva importación visual, editor y generación; el lector de datos nuevos permanece disponible. Revertir configuración no elimina recursos ni cambia notas. PR y CI completo antes de una autorización de despliegue; no se anuncia una entrega parcial como función completa.

## Secuencia de entrega propuesta

1. Contratos, migración aditiva, almacenamiento privado y revisiones; regresiones de texto y permisos.
2. Importación visual de los tres formatos, conversión aislada, recuperación/cobertura y revisión docente.
3. Lector común en profesor/alumno, exportaciones con recursos y contexto versionado de calificación/verificación.
4. Editor con carga, tablas/gráficas editables y propuestas IA aceptables; conflictos, fallos y cancelación.
5. Matriz de pruebas, comparación de tiempos y documentos, inventario, CI y verificación local aislada. Después solicitar autorización para fusionar y desplegar.

No se omiten partes del alcance aprobado. Esta secuencia no autoriza activar una fase incompleta en producción.

## Trazabilidad de validación

| Requisitos | Cobertura prevista |
| --- | --- |
| FR-001–005 | Seis documentos sintéticos, inventario de páginas/regiones, asociaciones compartidas, recursos vectoriales y formatos alternativos; SC-001/002. |
| FR-006,009,014 | Original resuelto con anotaciones sintéticas; acceso cruzado y serializadores docente/alumno; SC-003/007. |
| FR-007–008 | Lector, ampliación, tabla, PDF y Word con todas las figuras a 360/390 px y escritorio; SC-003/005. |
| FR-010–011 | Capturar entradas de calificador y verificador con dobles de prueba y revisar contexto insuficiente sin cero/publicación; SC-004. |
| FR-012–013,016 | Reintentos, limpieza, archivos faltantes, jobs antiguos y nuevas revisiones; igualdad de registros previos; SC-006. |
| FR-015,022 | Mensajes accesibles, estados, límites, ausencia de secretos y fallback manual; SC-005/008. |
| FR-017–021 | Tres orígenes × dos entradas × cuatro recursos; aceptación, round-trip, exportación, concurrencia e historial; SC-008/009. |

## Artefactos y cierre de planificación

- [research.md](./research.md): investigación del código y decisiones sustentadas.
- [data-model.md](./data-model.md): entidades, validaciones, estados y migración segura.
- [contracts/interfaces.md](./contracts/interfaces.md): contratos propuestos y compatibilidad.
- [quickstart.md](./quickstart.md): guía de comprobación sin datos reales.

La implementación sigue las aprobaciones y las fases de Checklist, Tasks y Analyze. Los checkpoints de pruebas y construcciones ejecutadas se registran en quickstart; los recorridos todavía pendientes no se dan por validados.

# Investigación y decisiones

**Fecha**: 2026-10-23 | **Issue**: #257 | **Estado**: diseño propuesto

## 1. Aceptación y publicación

**Hallazgo**: `calificaciones/service.py::confirmar_nota_batch` y `publicar_nota_batch` realizan commits por operación y carecen de request_id/huella; no se pueden encadenar desde el cliente como si fueran una decisión atómica. Confirmar/publicar cambia estado e historial e invalida publicaciones previas. `feedback_sharing/service.py::approve_delivery_review` no cambia la nota y vincula la aprobación a estado/fecha/fuente; aprobar antes de publicar la invalida después.

**Decisión**: coordinador de evaluación con decisión global explícita y selección congelada. Reutilizar operaciones académicas internas sin commits, aplicar savepoint por alumno y aprobar la devolución después del estado académico final. No sobrescribir ajustes ni volver a confirmar notas publicadas. Persistir recibo idempotente por tanda, sin credenciales ni copias innecesarias de mensajes.

**Alternativas descartadas**: confirmar y publicar mediante dos mutaciones independientes de frontend; añadir una bandera genérica para ignorar validaciones; interpretar abrir/imprimir como aprobación. No preservan atomicidad, auditoría o intención.

## 2. Límites de publicación

**Hallazgo**: `visual_grade_policy.ensure_visual_grade_publishable` verifica claves/material y procedencia de evaluaciones versionadas. `_prepare_grade_publication` aplica autoridad de desglose y política de intentos. `load_source` añade matrícula, intento vigente y pertenencia de evidencia. Son protecciones complementarias, no intercambiables.

**Decisión**: conservar todos los preflight. Avisos históricos no certifican ni impiden por sí solos un resumen autorizado; los bloqueos de procedencia real o ausencia de nota sí requieren resolver la causa. Presentar excepciones con acción concreta, sin prometer publicar el 100 % de casos inválidos.

**Alternativa descartada**: desactivar flags de integridad o publicar una sugerencia como si el docente la hubiera aceptado sin acción explícita.

## 3. Copia repetida de enlaces

**Hallazgo**: `FeedbackAccess` almacena `credential_digest`; `create_access` devuelve el token solo una vez. `IndividualLinks.tsx` ofrece copia individual solo de la sesión y `FeedbackAccessList.tsx` no dispone de URL. Agregar un botón sin cambiar el almacenamiento no resuelve la copia tras reabrir.

**Decisión**: campo cifrado opcional para nuevas credenciales; seguir verificando accesos con digest. Recuperación en POST privado y autenticado, validando estado, fuente, vigencia, generación y digest. Cifrado autenticado con la dependencia cryptography existente y clave derivada por propósito, sin introducir un proveedor. Retener la política existente de desactivar/reactivar/renovar; no recuperar credenciales históricas desde hashes ni reemplazarlas silenciosamente.

**Alternativas descartadas**: guardar URLs en texto plano o localStorage; devolver credenciales en el GET general; generar otro token al copiar; usar el helper IA que acepta valores heredados sin cifrar. Filtran secretos o rompen enlaces compartidos.

## 4. Impresión y motivos

**Hallazgo**: `FeedbackPrintSheet.tsx` y `printPagination.ts` comparten geometría conservadora de 180×238 mm y cuerpo de 12 pt. Añadir decoración sin reservar espacio invalidaría la medida y podría recortar texto. La impresión actual usa portal privado, identidad por continuación y líneas de corte.

**Decisión**: conservar esos mecanismos, reservar una cabecera pequeña y producir veinte PNG verdaderamente transparentes mediante imagegen incorporado, una generación por motivo tras aprobación. Galería local, opción sin decoración y mezcla estable, sin notas inferidas por una mascota o premio. Validar imágenes, cabeceras largas, continuidad, color y monocromo.

**Alternativas descartadas**: veinte fondos completos de alto consumo de tinta; premios/castigos según nota; IA por impresión; escala diminuta para hacer caber todo; repetir un mismo dibujo cambiando solo el color.

## 5. Navegación y protección de estado

**Hallazgo**: la ventana actual ya protege estado por cuenta/evaluación, carga por páginas y conserva selección; los nuevos controles no deben reintroducir credenciales cruzadas ni barras fijas superpuestas. No hay copia conjunta y la entrada individual no expone el mismo flujo.

**Decisión**: componente de acciones de enlace compartido entre lista y detalle docente; controles apilados en móvil y alineados en escritorio, texto plegable y aviso privado de copia. Cancelar una tanda solo evita las no enviadas; mostrar lo ya confirmado para no fingir rollback total.

**Alternativa descartada**: otra pantalla de compartir con reglas duplicadas, lista pública del grupo o selección que dependa de los resultados visibles del buscador sin aclararlo.

## Método de investigación

Inspección de código local y una subinvestigación de solo lectura exigida por la habilidad de planificación. Hallazgos contrastados por el agente principal en servicios, políticas, modelos, API y componentes actuales. No hubo consulta de alumnos, llamadas a proveedores, ejecución académica en producción ni investigación externa necesaria para estas decisiones del repositorio. No quedan aclaraciones técnicas pendientes.

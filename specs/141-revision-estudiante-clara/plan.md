# Plan: revisión de estudiante clara

**Rama**: `codex/141-revision-estudiante-clara` | **Fecha**: 2026-11-02 | **Spec**: [spec.md](./spec.md) | **Issue**: #301

**Estado**: alcance y plan aprobados por el usuario el 2026-11-02, con prioridad expresa en calidad premium del frontend. Ejecutar Checklist, Tasks y Analyze antes del código. La lista de calidad permanece a cargo del revisor.

## Resumen

Separar la superficie individual de la grupal, no añadir otra capa sobre `ShareFeedbackDialog`. El detalle tendrá una cabecera compacta y cuatro áreas: Respuestas y puntajes, Evidencia, Retroalimentación e Historial. El cálculo se explica una sola vez con el desglose guardado. Retroalimentación individual usa diseño 3; compartir al grupo usa diseño 1.

La mayor parte es frontend. La edición de hojas guardadas requiere una ampliación backend compatible: el visor actual es de solo lectura y el contrato de recalificación solo acepta el paquete completo nuevo. Se reutilizarán preparación, originales inmutables, snapshot, permisos, locks, idempotencia y cola. No se editarán notas reales ni se cambiarán modelos.

## Contexto técnico

**Lenguajes/versiones**: TypeScript 5.6 y React 18.3; Python 3.11.
**Dependencias**: React Router, TanStack Query, Lucide, componentes UI y Markdown ya instalados; FastAPI, SQLAlchemy, Pillow/OpenCV ya presentes. No añadir librerías de UI ni servicios de IA para este rediseño.
**Persistencia**: PostgreSQL y activos privados versionados existentes. El borrador y giro de vista son locales y no se guardan en almacenamiento persistente del navegador. Recetas/originales quedan en el manifiesto privado existente mediante ampliación compatible; no se planea una migración de tablas. Si resulta indispensable, detener esa parte y actualizar este plan antes de implementar una migración.
**Pruebas**: Vitest/Testing Library, Playwright, pytest y PostgreSQL aislado. Validación visual Chromium/Firefox/WebKit y validación física Android/iPhone antes de declarar comprobadas las operaciones táctiles nuevas.
**Plataforma objetivo**: web/PWA, claro/oscuro, 360/384/412/1440 px.
**Rendimiento y escala**: ocho/veinte preguntas; hasta el límite de hojas/tamaño anunciado por la capacidad actual, nunca uno hardcodeado mayor. Cero llamadas IA al abrir/girar/copiar; recuperar datos solo para el contexto autorizado vigente. Cargar edición y hojas bajo demanda, con concurrencia acotada; la navegación de preguntas reutiliza el detalle ya cargado.

## Verificación de la constitución

- Separación de roles: mantener permisos de lectura, edición, publicación y propiedad; agregar pruebas positivas/negativas en los contratos de edición de hojas. No devolver paths privados ni fuentes originales a estudiantes.
- Integridad y trazabilidad: explicar la versión del desglose, no la evaluación actual. Giro visual sin escritura. Guardar evidencia reabre explícitamente con snapshot anterior; la nueva nota requiere revisión. Las regiones de evidencia antiguas no se trasladan a bytes nuevos.
- Asincronía e idempotencia: mantener cola y una sola solicitud por intención. Preparar referencias/archivos antes de aceptar el nuevo paquete; error previo no cambia evidencia ni nota; trabajo aceptado informa estado pendiente y permite consultar el resultado previo en Historial.
- Datos y secretos: datos sintéticos; sin .env, claves, alumnos o fotografías reales; ningún token en documentación, capturas, logs o almacenamiento del navegador. Referencias de hojas opacas, acotadas al actor y entrega.
- Accesibilidad: un desplazamiento vertical en el detalle; visor ampliado aislado, controles de 44 px, foco y teclado, lector de pantalla, zoom de texto y safe-area.
- Gobernanza y pruebas: issue #301 y rama aislada desde main `c27a30c`. Antes de implementar se requieren aprobación humana, checklist de requisitos, Tasks y Analyze. No hay bypass de CI, merge ni despliegue autorizados por este documento.
- IA intercambiable: no se modifica el catálogo, rutas, límites ni selección de modelos. Recalificación solo mediante el flujo institucional existente y confirmación docente.
- Producción reproducible: PR y todos sus checks antes de cualquier integración. No editar producción ni ejecutar reinicios para esta tarea.

Revisión posterior al diseño: no se detecta excepción constitucional necesaria; quedan pendientes los gates humanos y las pruebas, no se declaran aprobados por producir documentos.

## Estructura del proyecto

```text
frontend/src/modules/calificaciones/
  CalificacionesWorkspace.tsx                # composición y contexto; reducir responsabilidades
  components/GradeFormula.tsx                # explicación única del cálculo guardado
  components/GradeBreakdown.tsx               # respuesta/evidencia/puntaje/porqué
  components/GradeEvidenceViewer.tsx          # giro de vista sin escritura
  components/GradeReprocessing.tsx            # reutilizar acciones y confirmaciones
  review-triage/                             # resumen activo único, detalle en historial
frontend/src/modules/feedback_sharing/
  FeedbackWorkspace.tsx                      # decidir individual/grupo sin duplicar shell
  ShareFeedbackDialog.tsx                    # solo composición grupal compartida
  FeedbackStudentLink.tsx                    # misma lógica segura, vista compacta
  FeedbackMessage.tsx                        # lectura jerárquica sin inventar contenido
  feedbackSections.ts                        # clasificación explícita y conservación de texto
frontend/src/components/evidence/             # reutilizar picker/editor/recetas
frontend/e2e/mock/                           # flujos sintéticos a móvil/escritorio
backend/app/modules/calificaciones/           # lectura de edición y admisión compatible
backend/app/services/                        # almacenamiento/preparación existentes
backend/tests/                              # permisos, atomicidad y regresión
specs/141-revision-estudiante-clara/           # investigación, contratos y validación
```

Los nuevos componentes de presentación se extraerán en estas áreas; no se ampliará un componente monolítico con otro bloque de estados anidados. No eliminar consumidores legacy sin comprobar referencias.

## Decisiones y complejidad

### 1. Cálculo único y verificable

Reutilizar `formula` y `componentes` del desglose persistido. Presentar resumen `obtenidos / posibles`, conversión, ajuste y resultado, con subtotales solo cuando el snapshot permita identificarlos. Usar el mismo formato de precisión de presentación en resumen y detalle sin redondear las entradas del cálculo. Conservar `nota_antes_redondeo`, límites y `regla_redondeo` para explicar los casos donde un número redondeado no reproduce el total.

La decisión docente se presenta separada si sobrescribe el resultado del desglose. Si falta procedencia no se inventa. Se retiran las dos explicaciones parciales actuales (`GradeNoteExplanation` y el cálculo repetido de preguntas) a favor de un solo componente de presentación.

### 2. Menos avisos, mismas garantías

Crear un modelo de presentación puro con `primaryActiveNotice`, causas activas propias de la pregunta y detalles históricos. Dedupe por causa, no esconder causas distintas bajo un mensaje vacío. Los colores de prioridad y el estado correcto/parcial/incorrecto siguen siendo conceptos separados. Permisos, conflictos, cobertura insuficiente, datos ausentes y cambios reales no se convierten en adornos ni se descartan.

### 3. Individual separado del grupo

Una superficie individual explícita reutiliza consultas, permisos y estado de entrega, pero no monta la lista/barra de selección ni los controles de grupo de `ShareFeedbackDialog`. Diseño 3: nombre y nota contextual sin repetir cabecera, comentario agrupado, estado del enlace y acción principal en zona estable. Editar e imprimir son secundarios; vigencia/desactivar/reactivar/WhatsApp/compartir nativo quedan en un menú contextual accesible. No hay dos botones primarios de copiar ni URL larga visible por defecto; el fallback manual aparece solo si el portapapeles falla.

Los textos con etiquetas explícitas se agrupan; los antiguos se leen completos, sin extraer aciertos de un número ni resumir mediante otra llamada IA. No modificar el texto guardado por renderizarlo. La gestión de enlaces conserva la recuperación, revalidación, estados heredados, sesión, cancelación y conflictos de Spec 139.

Grupo: lista compacta con búsqueda, estado y selección de opción 1. Un único pie estable cambia de generar a copiar según disponibilidad. No emitir enlaces nuevos para los que ya existen ni decir «Copiados» si una parte falló. Impresión y publicación siguen accesibles, sin arrastrar sus controles al estudiante individual.

### 4. Evidencia: no confundir vista con edición

Añadir giro de vista al visor con transformación del viewport, zoom/regiones consistentes y botón de restablecer. No escribir servidor. El panel Evidencia expone una sola entrada «Editar hojas» y la acción «Volver a calificar» como secundaria; el historial se consulta desde Historial, no en cuatro pestañas.

Editar hojas hidrata un borrador con referencias autorizadas, no descarga una previsualización y la hace pasar por original. Backend nuevo de lectura facilita revisión/fingerprint y metadatos seguros. La admisión opcional de referencias y recetas se integra con `POST /calificaciones/{id}/recalificar`; los clientes existentes no cambian. No existe aquí un botón «Guardar evidencia sin recalificar»: evitaría la cola, pero crearía dos fuentes vigentes para nota/imagen y aumentaría el alcance.

El botón final es «Guardar y volver a calificar», con confirmación de reapertura y consecuencias sobre enlaces/nota. Mantener las hojas no editadas por referencia inmutable, y crear derivados nuevos solo para hojas modificadas o añadidas. El servidor valida versiones, propiedad, receta, hashes, capacidad y paquete completo. No aceptar referencias de otra entrega, rutas o dimensiones solo porque las envíe el cliente. Se debe mantener compatibilidad con la elección explícita de pesos actuales de Spec 140.

### 5. Etapas de entrega

1. Aprobar alcance/plan y revisar checklist de calidad; generar Tasks y Analyze con correspondencia FR → prueba.
2. Preparar maqueta sintética 384 px y pruebas de caracterización del comportamiento actual.
3. Separar frontend individual/grupo, explicar cálculo y compactar respuestas, sin mutaciones académicas nuevas.
4. Implementar edición de hojas compatible y sus regresiones aisladas; no activar un control de persistencia sin backend completo.
5. Pruebas completas, capturas de implementación, prueba física y PR. No marcar comprobaciones pendientes como realizadas ni fusionar con fallos.

### 6. Criterios visuales premium

- Una sola superficie de lectura por pestaña, no un modal o panel de grupo embebido dentro de otra tarjeta del estudiante.
- Espaciado basado en 4/8 px, márgenes móviles de 16 px y columnas con ancho de lectura limitado en escritorio; sin convertir el desktop en una columna estrecha de celular.
- Cuerpo principal móvil de 16 px o más, interlineado de 1,5; títulos claros sin repetir encabezados o nombres. Las etiquetas auxiliares no compiten con el comentario.
- Indigo de marca para la acción principal; neutros para estructura, verde/ámbar/rojo solo cuando comunican un estado. Identidad y contraste claro/oscuro con tokens existentes.
- Iconos de línea consistentes, sin robots o ilustraciones grandes que añadan altura. Bordes/sombras solo para separar capas reales, no alrededor de cada párrafo.
- Acciones principales estables y accesibles; edición/impresión/vigencia en secundarios. Estados vacío/carga/error tienen el mismo cuidado visual que el caso exitoso.
- Cumplir las decisiones de [diseño](./contracts/diseno-premium.md) y revisarlas contra maqueta y capturas reales; “premium” no equivale a añadir decoración o animación.

## Reducción y validación visual

| Cambio | Retira/reubica | Garantía conservada |
| --- | --- | --- |
| Un cálculo explicativo | Fórmula repetida y texto parcial del encabezado | Precisión, ajustes, pesos históricos y provisionalidad |
| Un resumen accionable | Banners equivalentes y ayudas genéricas por pregunta | Incidencias reales y restricciones de publicación |
| Retroalimentación individual diseño 3 | Frame grupal incrustado, seleccionado/impresión de grupo, tarjeta gigante del enlace | Lectura íntegra, edición, copia persistente y permisos |
| Menú secundario | Botones paralelos y «Opciones avanzadas» desplegado en medio | Vigencia, desactivación, reactivación, impresión y canales |
| Evidencia contextual | Entrada escondida de cambiar evidencia y repetición de historial | Original/preparada, versiones y confirmación de recalificación |
| Grupo opción 1 | Comentarios completos por fila y acciones arriba/abajo separadas | Selección, copia individual/múltiple, publicación y fallos parciales |

Maqueta 384 px antes de implementar y capturas reales a 384/1440 px en claro/oscuro antes de fusionar. Matriz adicional 360/412 px, fuentes ampliadas, teclado, scroll táctil y encabezado/pie sin solapar contenido. Datos completamente sintéticos. Las imágenes conceptuales aprobadas no sustituyen estas pruebas.

No se ocultan: error de carga o permiso, cambio concurrente, trabajo activo, evidencia incompleta, puntajes no evaluables, cálculo provisional, ausencia de revisión exigida y enlace no vigente/no recuperable. Deben ser mensajes únicos y accionables.

Regresiones obligatorias: borradores, navegación directa/legacy, retornos, edición manual de nota, publicación por lote, regrade con puntos actuales, selección, enlaces guardados, caducidad, chat persistente/cuota, impresión y privacidad.

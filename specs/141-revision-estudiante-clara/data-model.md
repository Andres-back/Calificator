# Modelo de datos y estados

Diseño; no migración ejecutada ni datos reales copiados.

## Contexto de revisión (cliente)

`materiaId`, `evaluacionId`, `calificacionId`, `estudianteId`, pestaña, pregunta, hoja y retorno autorizado. Cambio de actor/contexto cancela peticiones y descarta credenciales recuperadas del contexto previo. Guardar/descarte de borradores precede un cambio de estudiante.

## Explicación del cálculo (derivada, sin escritura)

Fuente única: `desglose` versionado con componentes y fórmula. Modelo de presentación: puntos reales obtenidos/posibles, escala, nota base, ajuste, nota antes de redondeo, redondeo y nota final; decisión docente aparte si difiere. Los subtotales por sección requieren mapa identificable de la misma versión. Sin cobertura completa → provisional; sin fórmula → no disponible, nunca cero inventado.

## Retroalimentación individual (composición, sin duplicar persistencia)

Fuente: comentario guardado, candidato explícito y preview autorizado existente. Bloques visuales conservan fragmentos fuente y su orden; `kind` solo se asigna por etiquetas explícitas. El resto se mantiene en texto neutral íntegro. Editor conserva original/draft/error. Estados de enlace reutilizados: cargando, disponible, listo para generar, necesita revisión, requiere reenvío, vencido, desactivado, error o atención. No derivar estado disponible de la nota numérica.

## Borrador de edición de hojas (cliente)

- `baseRevision`: versión esperada del resultado/entrega al abrir.
- `fingerprint`: versión del paquete/metadatos recibidos, no token de acceso público.
- `pages`: lista ordenada de `existing` o `upload`.
- `existing`: referencia opaca a hoja de esta entrega y versión; receta opcional con marco de referencia/dimensiones verificables.
- `upload`: archivo local validable, giro/receta, identidad local estable; su fuente no sustituye la de otra hoja.
- `dirty`, `busy`, `error`, `requestId`: protecciones de descarte, doble toque y reintento.

Cancelar no escribe. Abrir no llama IA. Una receta nueva o cambio en orden/fotos cambia la intención idempotente. No usar localStorage para fotos, tokens o borradores sensibles.

## Evidencia persistente (modelo existente ampliado)

El manifiesto privado existente mantiene paquete, página, hashes, receta, originales y preparados. Hojas conservadas reutilizan referencias inmutables del paquete base; transformadas producen un derivado nuevo y conservan el vínculo a su fuente; añadidas registran su propio original. No exponer paths. Si un legado no tiene original, indicarlo y conservar el mejor activo fuente sin llamarlo original recuperado.

Las cajas de respuesta siguen asociadas a su `evidencia_version` y marco canónico. Una nueva evidencia invalida su uso en la nueva revisión hasta que se generen regiones válidas; las antiguas continúan perteneciendo al resultado histórico.

## Transición confirmada

`lectura` → `borrador local` → `confirmación` → `admisión completa` → `en cola/preparando/calificando` → `resultado por revisar`.

- Antes de aceptar: validar propiedad/permisos, versiones, paquete completo, capacidad, receta, referencias y archivos. Un conflicto o validación fallida no cambia el resultado vigente.
- Al aceptar: snapshot anterior, paquete admitido, reapertura y trabajos se registran de forma consistente e idempotente. La preparación usa los checkpoints existentes y no permite publicar desde una ejecución obsoleta.
- Si falla procesamiento posterior: mostrar estado de error y conservar snapshot/evidencias para consulta y reintento, sin afirmar que la nota histórica pertenece al paquete nuevo.
- La nota nueva no se publica sola. Se conserva el comportamiento de suspensión/revalidación de enlaces de una reapertura; el diálogo lo advierte antes de confirmar.

## Persistencia fuera de alcance

Sin nueva tabla de chat, modelo de familias, catálogo IA o capa de notas paralela. No migración prevista; cualquier necesidad descubierta debe volver a revisión del plan.

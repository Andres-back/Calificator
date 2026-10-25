# Modelo de presentación de evaluación

## Configuración opcional

Agregar `Evaluacion.configuracion_impresion`, JSONB nullable, con validación de contrato cerrado. La migración no rellena registros antiguos: `null` significa salida legacy, no el perfil normal nuevo. No cambiar el `schema_version=1` de la tabla de versiones académicas ni su restricción por un campo opcional de presentación.

Contrato propuesto de configuración versión1:

| Campo | Regla |
| --- | --- |
| `schema_version` | Literal1, independiente del esquema de contenido |
| `perfil` | compacto / normal / letra_grande / personalizado |
| `fuente_pt` | Número finito10–18; presets11/12/14 |
| `composicion` | una_columna / compacta; nunca reordena preguntas |
| `blanco_negro` | Preferencia booleana; color significativo requiere decisión explícita |
| `meta_paginas` | Entero1–20 o null; objetivo, no promesa |
| `respuestas` | Overrides por identidad estable de pregunta: líneas1–12 o altura de dibujo30–100mm; auto conserva semántica y ajuste docente existente |
| `materiales` | Overrides por bloque estable: ancho25–100%, alineación inicio/centro/fin, uso decorativo/académico y confirmación de conversión cuando el color sea significativo |

Los límites se validan en servidor y cliente. Identidades inexistentes o duplicadas no se reasignan por coincidencia de posición; devolver error conservando borrador. Si una evaluación legacy carece de identidad estable, normalizarla con el mecanismo existente al editar contenido, no introducir identificadores nuevos en preguntas durante un guardado de solo impresión; hasta entonces permitir ajustes globales y los campos de espacio ya existentes.

## Guardado, versiones y concurrencia

1. Comparar `expected_updated_at` y `expected_content_version_id` bajo bloqueo de fila. Un conflicto devuelve409 sin sobrescribir ni descartar el borrador.
2. **Legacy sin versión**: actualizar únicamente configuración raíz y fecha de modificación. No crear `EvaluacionContenidoVersion`, manifestar visuales inexistentes, modificar preguntas o asociar versiones a entregas.
3. **Con versión de contenido**: copiar el snapshot íntegro, sustituir únicamente `configuracion_impresion`, calcular su hash y crear revisión inmutable nueva con motivo de presentación. Mantener intactas claves y su revisión, preguntas, lecturas, asociaciones y referencias históricas de entregas/notas. Admitir snapshot sin manifiesto visual en esta vía, sin fabricar uno.
4. `_snapshot` debe incluir la configuración para futuras ediciones académicas. Los snapshots previos sin campo se interpretan como legacy; nunca se modifican en sitio ni se completan con la configuración actual.
5. Una actualización de impresión no reconstruye blueprint ni modifica `claves_pendientes_revision`. Un guardado mixto de contenido y presentación pasa por las reglas académicas existentes en una sola transacción; se prueban por separado las dos vías.
6. No crear revisión si la configuración resuelta no cambia. El guardado idempotente no duplica historial ni assets.

## Propuestas y derivados

Una propuesta de composición es temporal y privada: revisión/base o huella del borrador, configuración candidata, hash, páginas PDF reales y advertencias. Caduca, no se convierte en evaluación guardada por previsualizarla y no contiene soluciones en la versión para estudiante.

Derivados de imagen para impresión son regenerables desde original+parámetros, con caché privada y autorización del recurso original. No sustituyen bytes, hash o procedencia del original; una imagen que falla sigue disponible en su formato original con advertencia. El uso decorativo no altera el contrato académico del material ni se utiliza para deducir respuestas.

## Migración y recuperación

Migración aditiva verificable en PostgreSQL aislado con registros y versiones legacy. La reversión operativa del código ignora el campo nuevo y conserva los datos; no ejecutar automáticamente un downgrade que elimine ajustes guardados. Si fuera necesario retirar el campo, requiere respaldo y procedimiento revisado. No modificar configuración institucional de IA.

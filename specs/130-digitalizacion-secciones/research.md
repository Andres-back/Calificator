# Investigación: conservación documental por secciones

## 1. La pérdida ocurre después de una extracción que sí contenía organización

**Decisión**: conservar inventario y estructura hasta persistencia, no solo mejorar el prompt OCR.

**Evidencia**: diagnóstico autorizado de una evaluación legacy: transcripción de tres páginas con seis secciones, lectura y debate; evaluación con dieciséis preguntas planas, lectura vacía y sin recursos/versionado documental asociados. No se guardan aquí contenido, identificadores ni nombres reales. Código: `digitalize_service.py` pide una lectura y lista plana; `_normalize_question` conserva un allowlist sin sección; `normalize_detected_structure` ordena por número y rechaza duplicados. Editor `questionsToUpdatePayload` no transmite organización.

**Alternativas descartadas**: cambiar solo el prompt; pegar títulos dentro de enunciados; publicar toda la transcripción como una lectura inicial. Ninguna conserva estructura y actividades en su posición.

## 2. Persistencia editorial opcional, no reglas privadas

**Decisión**: JSONB nullable propio en `Evaluacion`, contrato cerrado e incluido en snapshots. No backfill.

**Razón**: documento educativo con consumidores públicos, mientras `blueprint.reglas_feedback` contiene reglas/procedencia privadas. La lectura única actual se conserva como fallback legacy; documento organizado es la fuente nueva, no una segunda copia mutable.

**Alternativas descartadas**: tabla por cada nodo sin necesidad transaccional independiente; duplicación en evaluación y blueprint; introducir el documento en `VisualManifest`, que exige asociaciones a preguntas y no representa bien una sección sin preguntas.

## 3. Número académico y etiqueta original son conceptos diferentes

**Decisión**: mantener número interno único y referencia estable `contenido_id`; etiqueta impresa y jerarquía en el documento.

**Evidencia**: `blueprint_service.py`, `breakdown_policy.py`, `orchestrator.py` y exportación usan número de pregunta como clave. El editor renumera al abrir/mover. Cambiar de golpe las claves históricas a UUID sería una migración innecesaria y riesgosa.

**Alternativa descartada**: admitir internamente dos preguntas número1 y resolverlas por posición. Puede mezclar clave, componente y respuesta observada.

## 4. Escritor de versiones textuales

**Decisión**: generalizar la misma ruta de versiones para manifiesto visual opcional, conservando locks/hashes/concurrencia y verificaciones estrictas de visuales cuando existen.

**Evidencia**: `grading_visual_context.read_grading_definition` y `resolve_visual_material` toleran revisión textual sin manifiesto; `ContentEdit` y `prepare_content_edit/save_content_revision` actualmente exigen manifiesto visual. `_snapshot` no incluye estructura documental.

**Alternativas descartadas**: fabricar manifiesto vacío o crear un versionador paralelo; añadir campos a snapshots antiguos para simular un contexto que no existía.

## 5. Contexto completo también en el verificador y Xali

**Decisión**: helper educativo común acotado y de la versión fijada, con proyección pública explícita.

**Evidencia**: el principal recibe lectura por `evaluation_to_grading_blueprint/render_grader_prompt`. El template del verificador rápido contiene scaffold, respuesta y propuesta, no lectura. `feedback_sharing/projection.py` y `chat_service.build_prompt` tienen listas blancas que no incluyen documento; no se deben saltar con un JSON arbitrario. Xali autenticado requiere respetar el contexto fijado en lugar de adoptar una edición posterior.

**Alternativas descartadas**: enviar blueprint privado entero al chat; modificar silenciosamente payloads/fingerprints de publicaciones existentes; limitar la corrección al primer evaluador.

## 6. Recuperación desde texto no es recuperación de imágenes

**Decisión**: propuesta revisada por docente, copia idempotente explícita y separada del original; cero IA adicional para esta operación. Reutilizar los mecanismos de copia/cola, no eliminar sus guardas generales.

**Evidencia**: `copy_service.request_copy` prohíbe misma materia en la intención normal; `EDITORIAL_FIELDS` es allowlist y el remapeo solo transforma IDs registrados. El texto conservado de una digitalización antigua puede existir aunque su archivo temporal no; no basta para reconstruir imágenes exactas.

**Alternativas descartadas**: SQL manual de reparación sobre evaluación con notas; reactivar OCR sin original; regenerar dibujos y afirmar que son los originales; relajar globalmente los permisos/reglas de reutilización.

## 7. Presupuestos de sección, no otra nota independiente

**Decisión**: ampliar el diseño, por solicitud posterior del usuario, con reparto opt-in por sección. Compilar los presupuestos confirmados a los máximos de las preguntas, conservando pesos base y versión; no sumar ni ponderar de nuevo los subtotales.

**Razón**: el sistema ya califica contra máximos por pregunta y suma componentes. Un presupuesto de sección expresa cuánto del total corresponden a esas preguntas; no requiere otro evaluador ni una fórmula de nota paralela. Los valores detectados en un documento pueden proponerse, pero su aplicación es decisión docente.

**Evidencia técnica**: `_scaled_scores` normaliza hoy los puntajes globalmente y compensa la diferencia de redondeo en la última pregunta. No debe reutilizarse sin adaptación para presupuestos por sección o cambios repetidos: podría alterar los totales de sección o acumular deriva. El contrato nuevo requiere Decimal, pesos base estables, reparto por mayores restos y sumas exactas validadas.

**Alternativas descartadas**: activar pesos por defecto, dar puntos a títulos/debates sin criterios calificables, multiplicar otra vez la nota por el subtotal de una sección, contar padre e hijos a la vez, reescalar silenciosamente o cambiar notas históricas. La ampliación solo modifica documentación hasta nueva aprobación.

## Estado de investigación

Investigación principal y revisión independiente original de solo lectura concluidas; ampliación de puntajes revisada contra la normalización local vigente, sin una nueva delegación o llamadas a modelos. Proveedores/modelos no cambian. El usuario aprobó el diseño ampliado después de la pausa mediante «aprobe». Durante la investigación no se ejecutaron pruebas del cambio, llamadas de IA, recuperación de copia ni mutaciones de producción.

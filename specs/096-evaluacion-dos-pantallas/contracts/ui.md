# Contratos de interfaz y transporte conservado

## Entrada y preparación

Crear evaluación ofrece IA/foto-PDF/manual según permisos, sin tercera etapa de IA. Materia conserva contexto; acceso general requiere materia autorizada para digitalizar. Cancelar no genera ni crea registros.

Preparar muestra tema/cantidad/modalidad/contexto/resumen. Personalizar y Necesito ayuda cerrados en creación nueva. Presets conservan tipos; ningún criterio se selecciona automáticamente. Rúbrica/referencia opcionales; mixta, escala, fecha y nombre siguen accesibles. Un error abre su sección y dirige foco.

POST `/evaluaciones/generar-borrador` conserva materia_id, nombre, tema/descripcion, modalidad, nota_maxima/fecha, cantidad/tipos, dba_ids/dba_personalizado_ids, usar_rubrica/criterios_docente, indicaciones y material. Solo criterios elegidos. Generación explícita, no por navegar/desplegar/preset. Referencia utiliza extracción vigente sin cambiar interpretación.

## Revisión y guardado

Éxito abre Revisar con ID recibido y preguntas numeradas/editables. Cómo se calificará agrupa criterios/rúbrica; alertas y correcciones pendientes visibles. Consultar respuestas/puntajes no muta. Xali a petición y aplicación confirmada.

PATCH `/evaluaciones/{id}` conserva validaciones, payload diferencial y expected_updated_at. Nueva: Guardar borrador; existente: Guardar cambios. No invocar `/publicar` durante generación/extracción/guardado. Criterios mantienen su guardado explícito sin reenviar preguntas no cambiadas.

Contenido editable es local; PDF/Word/formato final se obtienen de la evaluación guardada mediante visor y endpoints vigentes. Acciones finales respetan estado/permisos; fallo de documento no anuncia descarga exitosa.

## Recuperación

Mantener claves v7 por cuenta/materia/TTL. Etapas normalizadas sin descartar contenido ni regenerar. ID restaurado valida identidad/permiso/versionado con API actual sin sobrescribir edición local; 403/404/conflicto no saltan permisos ni reasignan el registro.

Conservar límites/validaciones de tipos/opciones/respuestas/puntajes/pesos/material. Pendiente bloquea doble envío; error preserva trabajo. Metadata de archivo no equivale a archivo recuperado. Storage denegado no bloquea trabajo en memoria.

## Responsive y regresiones

Dos etapas compactas; una columna en celular y ancho aprovechado en escritorio sin otro scroll principal. Safe-area/foco/escape/cancelar existentes, retorno sin salto y objetivos de 44 × 44. Mantener menús 095, autosave de asistencia, notas/evidencias y documentos; cero mutaciones académicas al navegar o elegir método.

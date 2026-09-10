# Contrato de centro y navegación

Diseño propuesto. Propietarios: 002 navegación, 008 calificaciones, 016 desglose.

## Distribución

Escritorio ancho, considerando el ancho útil tras sidebar:

```text
Calificar · Matemáticas · Evaluación 2         Añadir entregas   Acciones
Por revisar (12) | Con alertas (3) | Procesando (4) | Publicadas | Todas
┌─────────────────┬─────────────────────────┬───────────────────────────┐
│ Buscar alumno   │ Evidencia · Hoja 2/3    │ Preguntas 1  2!  3  4     │
│ Ana · alerta    │                         │ Pregunta o criterio 2     │
│ Luis · lista    │       Foto o PDF        │ Respuesta y referencia    │
│ María · en cola │       Ampliar           │ Puntaje y motivo          │
│ …               │                         │ Mejora / editar aquí      │
├─────────────────┴─────────────────────────┴───────────────────────────┤
│ Nota 3,8/5 · Guardado   Guardar y siguiente alumno   Confirmar/Publicar │
└─────────────────────────────────────────────────────────────────────┘
```

Historial, criterios completos, verificaciones y PQRS se despliegan al necesitarlos. La evidencia y la pregunta no se duplican en otra tarjeta debajo.

En 768–1365 px: lista colapsable; dos columnas solo si ambas conservan ancho legible. En móvil: Cambiar alumno, selector de pregunta y alternador Evidencia/Revisar. Mantener página/edición/posición al alternar. Barra inferior con safe-area y espacio reservado, sin tapar campos ni competir con teclado virtual. Foco visible y anunciado al abrir alerta; controles principales >=44 px. Evitar scroll anidado que atrape gestos; visor ampliado con salida accesible.

## Navegación

Canónica: `/app/calificaciones?materia=M&evaluacion=E&estudiante=S&calificacion=C&pregunta=P&hoja=2&filtro=alertas&modo=revision`.

Modos revision/carga/publicacion. Filtros pendientes/alertas/procesando/publicadas/todas. Derivar materia desde evaluación cuando sea suficiente. Parámetros ajenos o incompatibles se rechazan/corrigen explícitamente sin mostrar contenido ajeno.

| Origen | Destino |
|---|---|
| Evaluación | Centro con E; una acción Calificar y revisar |
| Materia > Calificar | Centro con M y E cuando exista |
| Inicio/monitor/bandeja | Centro con E y C/S registrados |
| Boletín > alumno/examen | Centro con E/S |
| `/app/calificaciones/workspace/:evaluacionId?calificacion=C` | Adaptador conserva E/C y deriva alumno/materia |
| `/app/calificaciones/workspace` | Centro, selector si falta contexto |
| `/app/materias/:id/calificar?evaluacion=E&estudiante=S` | Adaptador M/E/S; carga o revisión según estado autorizado |
| `/app/calificaciones/foto` | Centro modo carga; selector si falta evaluación |
| `/app/calificaciones/boletin` | Permanece con roles actuales |

Todas las transiciones, incluido query/atrás/adelante y notificaciones, protegen borrador. Contexto de URL y estado no deben revertirse mutuamente. Componente de versión antigua abre referencia histórica y acceso a versión actual, sin tratar el ID viejo como vigente.

## Proyección docente propuesta

`GET /evaluaciones/{evaluacion_id}/revision?cursor=...&limit=30&filtro=...&q=...`

Autorización sobre evaluación y lectura del dominio, manteniendo capacidades hoy admitidas de roles personalizados. PQRS solo con submissions.review. Endpoint exclusivo docente; no ampliar payload estudiantil.

- evaluacion_id, materia_id, total_alumnos, contadores, siguiente_cursor.
- alumnos: estudiante_id, nombre autorizado, calificacion_id/entrega_id/job_id nullable, estado, nota nullable y resumen_revision del modelo.
- Contadores de toda la evaluación autorizada, no solo de primera página. Documentar los predicados de cada filtro; filas con conocimiento ausente son explícitas.
- No incluir binarios, respuestas, claves, RAG, secretos o texto privado de PQRS en resumen.

Consultas agrupadas para matrícula/calificación vigente/desglose activo/PQRS, sin N+1 SQL. Orden estable por prioridad/nombre/id. Polling no reemplaza edición/selección; avanzar captura orden visible.

Detalle, desglose, historial, incidencias y evidencia por página usan endpoints actuales a demanda del alumno seleccionado. Cancelar consultas obsoletas; caché por objeto/versión y limpieza de URLs temporales.

## Señales

| Dato persistido | Mensaje/acción |
|---|---|
| bloqueos/cobertura incompleta | Motivo y pregunta si está identificada; si no, resumen global |
| requiere_revision o ilegible/no_evaluable | Revisar pregunta y páginas registradas |
| Discrepancia actual según consenso existente | Ver valores comparables; no proclamar un evaluador correcto |
| PQRS abierta | Abrir incidencia/componente/version cuando existan |
| Job fallido o reintentando | Estado y reintento autorizado; nunca cero |
| Desglose ausente/no cargado | Detalle no disponible/cargando; ajuste global existente |

No anunciar «Sin inconsistencias» por ausencia de datos. «Sin alertas registradas» no implica exactitud. Alertas históricas no bloquean tras resolución; restricciones efectivas siempre las valida el servidor.

## Acciones y permisos

Lectura por dominio/objeto; carga/ajuste/nota manual por grading.grade; PQRS/reemplazo según endpoint actual; confirmar/publicar según autorización individual del servidor. Probar roles personalizados, lectura sola, profesor ajeno y estudiante. No ampliar permiso por agrupación visual.

Operaciones grupales muestran éxito/fallo por alumno y reintentan solo fallos. Carga mantiene un paquete por alumno con hasta 10 fotos o un PDF/20 páginas y los límites de tamaño/validación atómica existentes. Reutilizar cola actual para alumnos distintos sin mezclar sus archivos. Establecer nota manual y reemplazo conservan motivo e historial.

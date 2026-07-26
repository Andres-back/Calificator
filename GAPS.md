# XCalificator — Análisis de brechas: Manual v1.1 vs Backend

> Generado: 2026-06-29 / Última actualización: 2026-07-26
> Manual analizado: `MANUAL_NEGOCIO.md` v1.1
> Rama: `main`

---

## Resumen ejecutivo

| Prioridad | Total | Corregidos | Pendientes |
|---|---:|---:|---:|
| P0 — El app no inicia | 0 | 0 | 0 |
| P1 — Brecha estructural crítica | 6 | 6 | 0 |
| P2 — Feature faltante | 6 | 6 | 0 |
| P3 — Nice-to-have / futuro | 4 | 0 | 4 |

---

## Correcciones aplicadas históricamente (P1)

### 1. `evaluaciones.modalidad` — columna faltante ✅
**Manual §5.3.** Columna `modalidad VARCHAR(20) NULLABLE` + CHECK + enum `EvaluacionModalidad`. Migración aplicada.

### 2. `EntregaTipo` CHECK limitado ✅
Ampliado a `'online','foto','pdf','captura','opcion_multiple','interactiva','mixta'`.

### 3. `EntregaEstado` — estados faltantes ✅
Agregados `en_progreso` y `procesando`.

### 4. `CalificacionEstado.anulada` faltante ✅
Agregado al modelo y base de datos.

### 5. Modo Salón — sesiones en base de datos ✅
Modelo `SalonSesion` + tabla `salon_sesiones`. Ya no se pierden al reiniciar.

### 6. Naming `student_name` → `nombre_estudiante` ✅
Schemas corregidos para seguir convención español + snake_case.

---

## Features faltantes (P2) — todos corregidos

### 7. Endpoint de entrega online para estudiantes ✅
`POST /evaluaciones/{id}/entregas`. Crea `Entrega` (tipo `online`) y `Calificacion` (estado `sugerida`).

### 8. Generadores de herramientas completos ✅
Se crearon los 5 generadores que faltaban:

| Herramienta | Generator | Estado |
|---|---|---|
| Sopa de letras | `sopa_letras.py` | ✅ |
| Crucigrama | `crucigrama.py` | ✅ |
| Cuento educativo | `cuento.py` | ✅ |
| Guía de clase | `guia.py` | ✅ |
| Taller | `taller.py` | ✅ |
| Examen | `examen.py` | ✅ |
| Rúbrica | `rubrica.py` | ✅ |
| Plan de refuerzo | `plan_refuerzo.py` | ✅ |
| Emparejar | `emparejar.py` | ✅ |
| Unir columnas | `unir_columnas.py` | ✅ |
| **Ficha didáctica** | `ficha.py` | ✅ |
| **Quiz rápido** | `quiz_rapido.py` | ✅ |
| **Lectura comprensiva** | `lectura_comprensiva.py` | ✅ |
| **Mapa conceptual** | `mapa_conceptual.py` | ✅ |
| **Flashcards** | `flashcards.py` | ✅ |
| Para colorear | `para_colorear.py` | ✅ |

Todos los 15 tipos tienen generador backend, schema, service, endpoint REST, y vista frontend.

### 9. Intentos configurables ✅
Columnas `politica_intento` + `intentos_permitidos` en `Evaluacion`. Validación en `crear_entrega_online`.

### 10. Tiempo límite por evaluación ✅
Columna `tiempo_limite_minutos` en modelo y schemas. Validación servidor (HTTP 410 si expiró).

### 11. Modo lote (batch de fotos) ✅
`POST /calificaciones/lote` — múltiples imágenes con `estudiante_id`. Procesa cada foto con IA, crea entregas y calificaciones.

### 12. Estados por estudiante en Modo Salón ✅
Tabla `salon_sesion_estudiantes` con estados por estudiante. Inicialización, resumen, PATCH individual.

---

## Trabajo completado en sesión 2026-07-26

### Impresión optimizada (ahorro de papel)
- Nueva hoja `print.css` con estilos `@media print` para todas las herramientas
- Oculta sidebar, topbar, botones, badges, navegación, modales al imprimir
- Tipografía compacta (9pt) y espaciado reducido para ocupar menos hojas
- Header de impresión con campos: **Nombre**, **Grado**, **Fecha**, **Nota**
- Pistas de crucigrama en 2 columnas al imprimir
- Flashcards, sopa de letras, crucigrama con celdas compactas
- Matching (unir columnas / emparejar) en formato texto plano sin cables SVG
- Clase `print:hidden` en elementos de navegación (breadcrumb, volver, botones)

### Branding — imágenes generadas integradas
- `logo-full.png` en Sidebar y LoginPage
- `pattern-subtle.png` como textura en fondo del Sidebar
- `pattern-hero.png` como patrón decorativo en LoginPage
- `feature-evaluate.png` como fondo decorativo en EvaluacionesPage

### PDF backend — renderizadores completos
Se agregaron renderers para los tipos que mostraban **JSON crudo** en PDF:

| Tipo | Renderer | PDF estudiante | PDF soluciones |
|---|---|---|---|
| `lectura_comprensiva` | `_render_lectura_comprensiva` | Texto + preguntas con líneas | Con respuestas |
| `quiz_rapido` | `_render_quiz_rapido` (alias de examen) | Opción múltiple | Con respuestas |
| `ficha` | `_render_ficha` | Ejercicios con opciones | Con respuestas |
| `flashcards` | `_render_flashcards` | Solo anverso, espacio para escribir | Anverso → reverso |
| `mapa_conceptual` | `_render_mapa_conceptual` | Concepto principal + nodos + relaciones | Completo |

Header unificado en todos los PDFs: **Nombre, Grado, Fecha, Nota** con líneas para llenar.

### Frontend — cambios adicionales
- Icono de impresión (`Printer`) y compartir (`Share2`) en DetailPage
- Manejo de `handlePrint` con `window.print()`

---

## Items futuros (P3)

### 13. Evaluación modalidad mixta ❌ FUTURO
**Manual §5.6** define preguntas con `modalidad_respuesta` individual. Requiere estructura JSONB por pregunta.

### 14. Control de visibilidad de feedback ❌ FUTURO
**Manual §10.1 / R4.** No hay columna `mostrar_feedback_al` ni lógica de retención.

### 15. Informe para acudiente ❌ FUTURO
**Manual §14.4.** No existe endpoint ni generador.

### 16. Reporte por actividad interactiva ❌ FUTURO
**Manual §14.3.** No existe estructura de datos para capturar eventos.

---

## Estado de reglas de negocio críticas

| Regla | Descripción | Estado |
|---|---|---|
| R1 | IA sugiere, docente confirma | ✅ `requiere_revision_docente: true` siempre |
| R2 | Actividades pueden ser práctica o evaluación | ⚠️ Enum existe, flujo de asignación pendiente |
| R3 | Toda actividad online guarda intento | ✅ `Entrega` persiste |
| R4 | Versión estudiante no muestra solución | ✅ Endpoint `/boletin` filtra |
| R5 | Todo material puede exportarse | ⚠️ PDF funciona; falta HTML/imagen |
| R6 | Online y física producen mismo tipo de calificación | ✅ Mismo flujo `Calificacion` |
| R7 | Blueprint siempre presente | ✅ `grade_submission` lo requiere |
| R8 | Nota máxima inmutable después de publicar | ✅ Validación en `update_evaluacion` |
| R9 | Estudiante solo ve calificaciones confirmadas | ✅ Filtro en `get_boletin()` |
| R10 | Reintentos configurables | ✅ Implementado |
| R11 | Evidencia física se conserva | ✅ `archivo_url` en `Entrega` |
| R12 | Xali no resuelve evaluaciones activas | ✅ Prompt prohíbe explícitamente |

**R8 ya corregido** — `update_evaluacion` en `evaluaciones/service.py` bloquea cambio de `nota_maxima` si `estado == 'publicada'`.

---

## Pendientes conocidos

- **Disco raíz en VPS:** `/dev/sda2` al 100% en entorno dev. Docker storage en `/mnt/data/docker` (overlayfs, 3.9 GB). Solución temporal: `docker system prune -a -f` y mover caches a `/mnt`.
- **Docker Compose build:** requiere `DOCKER_BUILDKIT=0` o instalar buildx.
- **Test preexistente:** `test_production_config::test_production_settings_accept_non_default_secrets` falla (cookie_secure=False en test).
- **Lint preexistente:** 7 errores de `react-hooks/rules-of-hooks` en `MateriaDbaPage.tsx`.

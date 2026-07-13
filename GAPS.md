# XCalificator — Análisis de brechas: Manual v1.1 vs Backend

> Generado: 2026-06-29
> Manual analizado: `MANUAL_NEGOCIO.md` v1.1
> Estado: correcciones P0/P1 ya aplicadas en esta sesión

---

## Resumen ejecutivo

| Prioridad | Total | Corregidos hoy | Pendientes |
|---|---:|---:|---:|
| P0 — El app no inicia | 0 | 0 (ya estaban OK) | 0 |
| P1 — Brecha estructural crítica | 6 | 6 | 0 |
| P2 — Feature faltante | 6 | 1 | 5 |
| P3 — Nice-to-have / futuro | 4 | 0 | 4 |

---

## Correcciones aplicadas hoy (P1)

### 1. `evaluaciones.modalidad` — columna faltante ✅ CORREGIDO

**Manual §5.3** define tres modalidades de resolución: `online`, `fisica`, `mixta`.
**Antes:** el modelo `Evaluacion` no tenía este campo.
**Después:**
- Columna `modalidad VARCHAR(20) NULLABLE` agregada al modelo SQLAlchemy.
- `CHECK (modalidad IN ('online', 'fisica', 'mixta'))` en DB.
- `EvaluacionModalidad` enum agregado a `shared/enums.py`.
- Migración `202606290004_manual_v1_1_gaps.py`.

### 2. `EntregaTipo` CHECK muy estrecho ✅ CORREGIDO

**Manual §7.1** agrega `opcion_multiple`, `interactiva`, `mixta`.
**Antes:** `CHECK tipo IN ('online','foto','pdf','captura')`.
**Después:** `CHECK tipo IN ('online','foto','pdf','captura','opcion_multiple','interactiva','mixta')` + enum actualizado.

### 3. `EntregaEstado` estados faltantes ✅ CORREGIDO

**Manual §7.2** agrega `en_progreso` (estudiante abrió y está resolviendo) y `procesando` (IA analizando).
**Antes:** `('pendiente','recibida','calificada','revisada','requiere_reintento')`.
**Después:** se incluyen `en_progreso` y `procesando` en CHECK y enum.

### 4. `CalificacionEstado.anulada` faltante ✅ CORREGIDO

**Manual §7.3** define estado `anulada` (docente descarta la calificación).
**Antes:** no existía en CHECK ni enum.
**Después:** agregado a ambos.

### 5. Modo Salón — sesiones en memoria ✅ CORREGIDO

**Manual §11.2:** "La sesión debe persistir en base de datos, no solo en memoria, para evitar pérdida si se reinicia el servidor."
**Antes:** `_salon_sesiones: dict[str, UUID] = {}` en módulo — se perdía al reiniciar.
**Después:**
- Modelo `SalonSesion` en `calificaciones/models.py`.
- Tabla `salon_sesiones` en migración `202606290004`.
- Router actualizado: `POST /calificaciones/modo-salon/iniciar` persiste en DB.
- Nuevo endpoint `DELETE /calificaciones/modo-salon/{sesion_id}` para cerrar sesión.

### 6. Naming — `student_name` → `nombre_estudiante` ✅ CORREGIDO

Convención del sistema: español + snake_case.
Archivos corregidos:
- `app/modules/herramientas/schemas.py` — `PlanRefuerzoRequest.nombre_estudiante`
- `app/modules/herramientas/generators/plan_refuerzo.py` — referencia al campo
- `app/services/pdf_service.py` — parámetro de función

---

## Features faltantes (P2)

### 7. Endpoint de entrega online para estudiantes ✅ CORREGIDO HOY

**Manual §5.4** define el flujo donde el estudiante responde en la plataforma.
**Antes:** solo existía `POST /calificaciones/foto` (profesor sube foto física).
**Después:** `POST /evaluaciones/{evaluacion_id}/entregas` para rol `estudiante`.
- Valida matrícula activa.
- Valida que la evaluación esté publicada.
- Llama a `grade_submission` con `respuesta_texto`.
- Crea `Entrega` (tipo `online`) y `Calificacion` (estado `sugerida`).
- El docente confirma por el flujo existente.

### 8. Generadores de herramientas incompletos ❌ PENDIENTE

**Manual §8.4** lista 17 herramientas. El backend solo tiene generadores para:

| Herramienta | Generator | Estado |
|---|---|---|
| Sopa de letras | `sopa_letras.py` | ✅ |
| Crucigrama | `crucigrama.py` | ✅ |
| Cuento educativo | `cuento.py` | ✅ |
| Guía de clase | `guia.py` | ✅ |
| Taller | (usa `guia` internamente) | ⚠️ Thin |
| Examen | `examen.py` | ✅ |
| Rúbrica | `rubrica.py` | ✅ |
| Plan de refuerzo | `plan_refuerzo.py` | ✅ |
| **Emparejar conceptos** | — | ❌ |
| **Unir columnas** | — | ❌ |
| **Ficha didáctica** | — | ❌ |
| **Quiz rápido** | — | ❌ |
| **Lectura comprensiva** | — | ❌ |
| **Mapa conceptual** | — | ❌ |
| **Flashcards** | — | ❌ |
| **Para colorear** | — | ❌ |
| Presentación | módulo independiente | ✅ |

**Acción requerida:** crear `generators/emparejar.py`, `generators/unir_columnas.py`, `generators/ficha.py`, `generators/quiz_rapido.py`, `generators/lectura_comprensiva.py`, `generators/mapa_conceptual.py`, `generators/flashcards.py`, `generators/para_colorear.py` y registrarlos en `service.py`.

### 9. Intentos configurables ❌ PENDIENTE

**Manual §10.3** define `un_intento`, `multiples_intentos`, `mejor_puntaje`, `ultimo_intento`, `practica_libre`.
El modelo `Evaluacion` no tiene `intentos_permitidos` ni `politica_intento`.
**Acción:** agregar columnas + CHECK y respetar el límite en `crear_entrega_online`.

### 10. Tiempo límite por evaluación ❌ PENDIENTE

**Manual §5.4:** "El docente puede configurar tiempo límite."
No existe `tiempo_limite_minutos` en el modelo `Evaluacion`.
**Acción:** agregar columna nullable y que el frontend cierre la entrega al vencer.

### 11. Modo lote (batch de fotos) ❌ PENDIENTE

**Manual §5.5** define submodo `lote`: el profesor sube varias fotos y luego las asocia a estudiantes.
Solo están implementados `foto_individual` y `modo_salon`.
**Acción:** endpoint `POST /calificaciones/lote` que acepte múltiples imágenes y lista de `estudiante_id`.

### 12. Estados por estudiante en Modo Salón ❌ PENDIENTE

**Manual §11.2** define estados por estudiante: `pendiente`, `fotografiado`, `calificado`, `confirmado`, `omitido`.
Actualmente solo se rastrea si ya hay `Calificacion` para el estudiante (binario).
**Acción:** tabla `salon_sesion_estudiantes` con `estado` por cada par `(sesion_id, estudiante_id)`.

---

## Items futuros (P3)

### 13. Evaluación modalidad mixta ❌ FUTURO

**Manual §5.6** define preguntas con `modalidad_respuesta` individual (`online`, `fisica`, `archivo`).
Requiere cambio en la estructura del campo `preguntas` (JSONB) para soportar `modalidad_respuesta` por pregunta y lógica de unión de entregas parciales.

### 14. Control de visibilidad de feedback ❌ FUTURO

**Manual §10.1 / R4:** el docente configura si el feedback se muestra inmediatamente o al cierre.
No hay columna `mostrar_feedback_al` ni lógica de retención en la API.

### 15. Informe para acudiente ❌ FUTURO

**Manual §14.4** define informe en lenguaje no técnico para padres.
No existe endpoint ni generador para este tipo de reporte.

### 16. Reporte por actividad interactiva ❌ FUTURO

**Manual §14.3:** métricas por herramienta interactiva (estudiantes que iniciaron, terminaron, tiempo promedio, ítems con más errores).
No existe estructura de datos para capturar estos eventos.

---

## Estado de las reglas de negocio críticas

| Regla | Descripción | Estado backend |
|---|---|---|
| R1 | IA sugiere, docente confirma | ✅ `requiere_revision_docente: true` siempre |
| R2 | Actividades pueden ser práctica o evaluación | ⚠️ Enum existe, flujo de asignación pendiente |
| R3 | Toda actividad online guarda intento | ✅ `Entrega` se persiste con respuesta y timestamp |
| R4 | Versión estudiante no muestra solución antes de enviar | ✅ Endpoint `/boletin` solo devuelve `confirmada`/`ajustada` |
| R5 | Todo material puede exportarse | ⚠️ PDF service existe; HTML/imagen pendiente |
| R6 | Online y física producen mismo tipo de calificación | ✅ Mismo flujo `Calificacion` → boletín |
| R7 | Blueprint siempre presente | ✅ `grade_submission` falla si no hay blueprint |
| R8 | Nota máxima inmutable después de publicar | ❌ No hay validación que bloquee cambio de `nota_maxima` en estado `publicada` |
| R9 | Estudiante solo ve calificaciones confirmadas | ✅ Filtro en `get_boletin()` |
| R10 | Reintentos configurables | ❌ No implementado (ver P2 #9) |
| R11 | Evidencia física se conserva | ✅ `archivo_url` persiste en `Entrega` |
| R12 | Xali no resuelve evaluaciones activas | ✅ Prompt de Xali prohíbe explícitamente revelar respuestas |

**R8 requiere fix inmediato:** agregar validación en `evaluaciones/service.py` para bloquear cambio de `nota_maxima` cuando `estado == 'publicada'`.

---

## Fix adicional recomendado: R8

```python
# evaluaciones/service.py — en función de update
async def update_evaluacion(db, evaluacion_id, payload):
    ev = await get_evaluacion_or_404(db, evaluacion_id)
    if ev.estado == EvaluacionEstado.PUBLICADA and payload.nota_maxima is not None:
        if payload.nota_maxima != ev.nota_maxima:
            raise HTTPException(400, "No se puede cambiar nota_maxima de una evaluación publicada (R8)")
    ...
```

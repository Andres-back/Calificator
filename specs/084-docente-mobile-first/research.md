# Investigación: docente primero en celular

Fecha: 2026-10-05. Base: `8ccedc5ea4aec6bd31f4abd93ca47c8aa21f8687`. Lectura local y documentación primaria; sin pruebas ni acceso a datos de producción durante investigación. Investigación paralela autorizada por el workflow de Plan, consolidada aquí. Incógnitas de diseño resueltas; plan aprobado posteriormente. Evidencia de implementación en quickstart.md.

## 1. Visor móvil

- **Decisión**: PDF.js bajo demanda, versión prevista `pdfjs-dist@6.4.299`, worker local, una página/canvas acotado. Reutilizar el PDF autenticado del exportador actual.
- **Motivo**: `EvaluationPreviewModal.tsx` depende de un iframe; las pruebas actuales solo comprueban su presencia, no que pinte. El mismo documento evita una segunda interpretación de preguntas y no añade rasterización al servidor ocupado con calificaciones. El metadato consultado con `npm view` exige Node >=22.13.0 o >=24; local tiene 22.14.0. Validar CI/Docker y browsers al implementar, incluida alternativa legacy si requiere compatibilidad sin debilitar CSP.
- **Alternativas**: iframe/object mantienen el defecto; HTML independiente duplica formatos; PNG servidor reutiliza PyMuPDF pero añade CPU, cache privada e invalidación. PyMuPDF no admite uso multihilo, por lo que un threadpool general no resuelve ese diseño de manera segura.
- **Fuentes**: [ejemplo oficial de PDF.js](https://github.com/mozilla/pdf.js/blob/master/examples/learning/helloworld.html), [cancelación de RenderTask](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-RenderTask.html), [multiproceso de PyMuPDF](https://pymupdf.readthedocs.io/en/latest/recipes-multiprocessing.html). La versión se fija en lockfile en implementación, no se instala durante investigación.
- **Límite conocido**: el exportador canónico escapa ciertos campos textuales; el visor no recupera imágenes o LaTeX omitidos por ese exportador. Verificar formatos compatibles con fixtures representativas y registrar discrepancias, sin afirmar soporte universal.

## 2. Edición independiente de criterios

- **Decisión**: editor limitado a criterios/rúbrica con PATCH parcial y versión esperada; reutilizar selector, API de criterios y reglas de rúbrica actuales.
- **Motivo**: `confirmEvaluation` del wizard siempre transforma preguntas; renumera y puede eliminar metadatos o convertir tipos desconocidos. Una edición de criterios no debe atravesar ese camino. `updated_at` existe y puede comprobarse con bloqueo de fila sin migración. La inicialización por array de materias puede resetear borradores al invalidar consultas.
- **Alternativas**: retroceder al paso 2 dificulta el uso; guardar el examen entero afecta campos no editados; normalizar rúbricas históricas introduce cambios silenciosos. Rechazadas.
- **Historia**: preservar referencias inactivas ya vinculadas del contexto autorizado; no añadir nuevas inválidas. Sin recalificación de notas ni nueva generación/digitalización.

## 3. Navegación mínima

- **Decisión**: reducir encabezado y llevar detalles/guías a disclosure cerrado; conservar rutas y tareas de cada sección.
- **Motivo**: `TeacherJourney`, recomendaciones y encabezados repiten información antes de la lista de alumnos o exámenes. Asistencia ya usa ayuda opcional y sirve como patrón.
- **Alternativas**: nueva sección Calificar o tutorial obligatorio duplican navegación; ocultar avisos como ayuda impide saber si un proceso falló. Rechazadas.

## 4. Alta manual e impresión

- **Decisión**: reutilizar lote/filas y `confirm_lote`, con UUID de operación como PK y huella canónica; crear lote manual en revisión. Fichas por portal React y medio print; secretos efímeros. Renovar únicamente tras confirmación.
- **Motivo**: modelos permiten `job_id` y `archivo_key` nulos; matrícula tiene unicidad y la confirmación bloquea lote. El replay confirmado ya devuelve conteos sin claves. El cliente actual guarda filas antes de confirmar siempre, rompiendo recuperación si la respuesta se pierde. `window.print()` actual imprime la app completa.
- **Alternativas**: nuevo servicio de creación/tabla de claves duplicaría lógica y expondría secretos. Persistir claves para reimpresión contraviene requisitos. Normalizar nombres para decidir identidad fusionaría homónimos.
- **Política aplicada**: cuenta interna con matrícula activa en materia gestionable y permiso de modificación. Renovación afecta toda su cuenta, no únicamente la materia. No cambiar ni mostrar clave al asociar otra materia o imprimir. Si se quisiera limitar a un docente creador exclusivo, sería un cambio distinto de política/datos, no parte de esta adopción.

## 5. Perfil propio

- **Decisión**: extender `UserSelfUpdate` con `current_password`, wrapper propio, bloqueo transaccional y rechazo 422 de clave incorrecta. Nombre/email actualizan sesión; cambio de clave cierra sesión explícitamente y exige login nuevo.
- **Motivo**: autoedición ya existe, pero no verifica contraseña actual y tras cambio de clave deja cookies viejas. El servicio incrementa `auth_version` e invalida recovery; el interceptor intenta refresh ante 401. Se reutilizan helpers de auth/CSRF y no se modifican reglas del administrador.
- **Alternativas**: formulario administrativo permite más de lo necesario; cerrar sesión accidentalmente en próxima consulta es ambiguo; reemitir sesión añade complejidad que no exige el alcance.

## Cobertura de Clarify

| Área | Estado |
|---|---|
| Objetivos, roles y límites | Claro en especificación aprobada |
| Entidades y conservación histórica | Claro; sin migración prevista |
| Flujo normal, vacío, error, cancelación y replay | Claro; contratos definidos |
| Seguridad, privacidad y credenciales | Claro; autorización y secretos efímeros |
| Accesibilidad, compatibilidad y rendimiento | Claro; matriz y presupuesto de visor |
| Dependencias e integración | Resuelto por investigación; comprobar instalación en fase de implementación |
| Medición de aceptación | Claro; SC-001–007 y verificaciones reales |
| Despliegue/aprobaciones | Claro; plan y autorización de merge pendientes |

Preguntas adicionales: 0. Ninguna condición de implementación se declara probada por esta lectura.

# Investigación: boletín docente en mosaico

**Fecha**: 2026-10-08. Revisión de código vigente, sin pruebas productivas ni modificaciones de aplicación. Revisión independiente de componentes y consultas coincidente con este diseño.

## Superficie y modelo

**Decisión**: cambiar solo `TeacherGradebook` en `MateriaBoletin.tsx`; conservar la rama estudiante. Reutilizar `buildFollowUpRows` con el subconjunto del mosaico y con un solo alumno/todas las evaluaciones para el diálogo.

**Razón/evidencia**: la bifurcación usa `canManageMateria`. El render actual alterna lista por evaluación y tarjetas extensas; su modelo ya distingue ausencia, procesamiento, sugerencia y decisión, y el test existente usa 30 alumnos.

**Alternativas**: nueva sección o rediseño del boletín estudiante, descartados por navegación duplicada y alcance.

## Lecturas seguras y caché

**Decisión**: usar el modo existente `readOnly` con claves que incluyan lectura, materia y usuario, manteniendo prefijo de calificaciones. Habilitar la unión de evaluaciones filtradas y necesarias para el diálogo, sin consultas por ficha.

**Razón/evidencia**: `backend/app/modules/calificaciones/router.py:772` omite `assign_overdue_zero_grades` solo con `solo_lectura=true`. `api.ts` expone esa opción y `GradebookExport.tsx` ya la usa. El boletín actual no la solicita.

**Alternativas**: compartir la clave corta del workspace puede mezclar lecturas con efectos; `getBoletin` por alumno no cubre todos los estados docentes; endpoint nuevo no es necesario. Precargar otras evaluaciones solo para un filtro único añade llamadas evitables.

## Modal y scroll

**Decisión**: reutilizar `Modal` con mayor ancho, sin modificarlo globalmente, manteniendo el mosaico montado; nunca abrir exportación y boletín a la vez.

**Razón/evidencia**: `Modal.tsx` aporta nombre accesible, Escape, confinamiento y retorno de foco, viewport dinámico y scroll interno. `useBodyScrollLock` restaura el documento. El `main` de `AppShell.tsx` tiene scroll independiente en escritorio y debe probarse también. Los listeners del diálogo no implementan una pila de modales.

**Alternativas**: página nueva pierde contexto; panel permanente roba espacio móvil; todas las fichas expandidas mantienen el problema.

## Precisión y pruebas

**Decisión**: reutilizar `formatGradeScore` de `gradePresentation.ts`, sin tocar fórmulas. La revisión confirma representación de una o dos cifras decimales, compatible con notas y escala guardadas como `Numeric(6, 2)` en los modelos backend. No usar `toFixed(1)` para centésimas.

**Razón/evidencia**: la fila del modelo conserva valores, pero el render actual reduce su precisión. Estados de carga/error no deben presentarse como listas exitosas vacías.

**Alternativas**: recalcular promedio o añadir estados académicos persistidos, fuera de alcance.

**Validación**: tests focalizados de materia/modelo/exportación/permisos; una matriz Chromium/WebKit. No investigar proveedores de IA ni iniciar trabajos: este boletín es lectura.

Sin incógnitas críticas pendientes.

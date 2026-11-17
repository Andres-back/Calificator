# Plan: Revisión visual. Datos que engañan y fondos blancos

**Spec**: [spec.md](spec.md) | **Issue**: [#398](https://github.com/Andres-back/Calificator/issues/398)

## Hallazgo corregido de la revisión

Un revisor leyó «0.88» como una escala de 0 a 1. No lo es: es el promedio real de las notas confirmadas locales (3.5, 0, 0 y 0). El problema es la falta de escala, no el cálculo. Aun así, el backend promediaba notas de evaluaciones con distinta nota máxima en bruto; ahora las lleva a escala 5, como ya hace el resumen del estudiante.

## Decisión

- **Backend** (`reportes/router.py`): `AVG(nota_confirmada * 5 / nota_maxima)` y `escala: 5`.
- **Reportes**: «x.x / 5.0», un decimal, barras horizontales de 0 a 5 con el nombre completo y encabezados de tabla que no se parten.
- **Inicio del estudiante**: mensaje y color según la nota (umbral 3.0, el 60 % de la regla de redondeo). Dice «Tu materia» si es una sola y muestra «/ 5.0» en las tres tarjetas.
- **`studentProgress`**: «Tu nota: …», en verde solo si aprueba. **`MateriaEvaluaciones`**: el estudiante no ve el estado de publicación; vencimiento con `describeDeadline`.
- **`lib/dates.ts`**: `describeDeadline`, `capitalizeFirst` y `plural`. **`evaluaciones/modalityLabels.ts`**: nombres de modalidad compartidos.
- **Textos**: «Hecha con IA», «Archivar materia» / «Sí, archivar», plurales y fechas sin segundos en los enlaces de retroalimentación.
- **Imágenes**: se quita el fondo blanco conectado al borde (umbral 236, 250 para `xali-celebrating`) y se guardan como WebP con alfa. Se revisaron sobre fondo claro y oscuro.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/reportes/router.py` | promedio en escala 5 |
| `frontend/src/modules/reportes/ReportesPage.tsx`, `frontend/src/types/api.ts` | escala, decimal, gráfico |
| `frontend/src/modules/dashboard/DashboardEstudiante.tsx` | mensajes según la nota |
| `frontend/src/modules/evaluaciones/studentProgress.ts`, `modalityLabels.ts`, `EvaluacionesPage.tsx`, `ResolverEvaluacionPage.tsx` | nota, modalidad, «Hecha con IA» |
| `frontend/src/modules/materias/MateriaEvaluaciones.tsx`, `MateriaAsistencia.tsx`, `MateriaAsistenciaReporte.tsx`, `MateriaBoletin.tsx`, `MateriaManagement.tsx` | fechas, plurales, archivar |
| `frontend/src/modules/calificaciones/BoletinPage.tsx`, `frontend/src/modules/feedback_sharing/FeedbackAccessList.tsx` | plural y fecha |
| `frontend/src/lib/dates.ts` | ayudas de fecha y texto |
| `frontend/public/branding/*.webp` (9) | fondo transparente |

## Siguientes entregas

Navegación inferior en celular, pestañas de materia, Analítica (tabla y métricas apagadas), Crear material (bloque «Modelo de negocio»), Xali recortado, configuración de IA del administrador e ilustraciones nuevas para estados vacíos.

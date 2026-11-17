# Plan: Quitar lo que estorba en Crear material, Analítica y Xali

**Spec**: [spec.md](spec.md) | **Issue**: [#400](https://github.com/Andres-back/Calificator/issues/400)

## Decisión

- **Crear material** (`GeneratePage.tsx`): se quita `TeachingCycle`. Era su único uso, así que se elimina `components/business/TeachingCycle.tsx`.
- **Analítica** (`AnalyticsPage.tsx`):
  - «Tiempo ahorrado» y «Tiempo que te ahorra la IA» solo con mediciones suficientes.
  - Encabezado «Resumen de mis clases».
  - «Coincidiste con la IA».
  - Columnas «Entregas, Por revisar, Publicadas, Promedio, Aprobaron».
  - Estados traducidos.
  - Tarjetas en celular (`sm:hidden`) y tabla desde `sm`.
  - Pie en letra legible sin «línea base».
- **Xali** (`XaliPage.tsx`): el efecto que baja al último mensaje no actúa sin mensajes ni respuesta en curso.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/herramientas/GeneratePage.tsx`, `frontend/src/components/business/TeachingCycle.tsx` | se quita el bloque |
| `frontend/src/modules/analytics/AnalyticsPage.tsx` | métricas, textos y tarjetas |
| `frontend/src/modules/xali/XaliPage.tsx` | sin desplazamiento con chat vacío |
| `frontend/src/modules/analytics/AnalyticsPage.test.tsx`, `frontend/src/modules/xali/XaliPage.teacher.test.tsx` | pruebas |

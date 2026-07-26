# Estado de herramientas XCalificator

> Última actualización: 2026-07-26

## Resumen

XCalificator cuenta con **15 tipos de herramientas educativas**, todas con:
- ✅ Generador backend (IA)
- ✅ Schema + Service + Endpoint REST
- ✅ Vista frontend interactiva
- ✅ PDF descargable (estudiante + soluciones)
- ✅ Impresión optimizada (print.css)

---

## Herramientas completas

| Herramienta | Tipo | Categoría | Interactiva | Generador | Vista frontend | PDF |
|---|---|---|---|---|---|---|
| Crucigrama | `crucigrama` | Juego | ✅ | ✅ | ✅ (grid + input) | ✅ |
| Sopa de letras | `sopa_letras` | Juego | ✅ | ✅ | ✅ (selección visual) | ✅ |
| Unir columnas | `unir_columnas` | Juego | ✅ | ✅ | ✅ (cables SVG) | ✅ |
| Emparejar | `emparejar` | Juego | ✅ | ✅ | ✅ (cables SVG) | ✅ |
| Examen | `examen` | Evaluación | ❌ | ✅ | ✅ (ver respuestas) | ✅ |
| Quiz rápido | `quiz_rapido` | Evaluación | ❌ | ✅ | ✅ (alias examen) | ✅ |
| Ficha didáctica | `ficha` | Material | ❌ | ✅ | ✅ (ejercicios) | ✅ |
| Guía de aprendizaje | `guia` | Material | ❌ | ✅ | ✅ (secciones) | ✅ |
| Taller | `taller` | Material | ❌ | ✅ | ✅ (puntos) | ✅ |
| Cuento | `cuento` | Material | ❌ | ✅ | ✅ (texto + imagen) | ✅ |
| Para colorear | `para_colorear` | Material | ❌ | ✅ | ✅ (imagen + instrucción) | ✅ |
| Lectura comprensiva | `lectura_comprensiva` | Material | ❌ | ✅ | ✅ (texto + preguntas) | ✅ |
| Mapa conceptual | `mapa_conceptual` | Material | ❌ | ✅ | ✅ (nodos + relaciones) | ✅ |
| Flashcards | `flashcards` | Material | ✅ | ✅ | ✅ (flip + marcar) | ✅ |
| Plan de refuerzo | `plan_refuerzo` | Material | ❌ | ✅ | ✅ (semanas) | ✅ |

---

## PDF y salida impresa

Cada herramienta produce dos PDFs:
- **PDF estudiante:** contenido + espacios en blanco para resolver
- **PDF soluciones:** contenido + respuestas esperadas (verde)

Ambos incluyen header con campos **Nombre, Grado, Fecha, Nota**.

La impresión desde navegador (`window.print()`) usa `print.css` que:
- Oculta sidebar, topbar, botones, navegación
- Usa tipografía compacta (9pt) y espaciado mínimo
- Aplica saltos de página inteligentes

---

## Pendientes

- **Asignación a estudiantes:** no hay flujo para que el profesor asigne herramientas directamente (solo impresión y PDF)
- **Resolución online guardada:** las vistas interactivas (crucigrama, sopa, flashcards) no persisten resultados del estudiante
- **Versiones mezcladas:** no hay generación de múltiples versiones con distinto orden de preguntas

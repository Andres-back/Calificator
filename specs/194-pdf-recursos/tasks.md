# Tareas: PDF imprimibles de recursos claros y listos para el aula

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #406. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas las mejoras (`spec-approved` y `plan-approved` en #406).

### Pruebas

- [X] T001 `test_herramientas_pdf_imprimibles.py`: nombres legibles en subtítulo y encabezados. (FR-001)
- [X] T002 `test_herramientas_pdf_imprimibles.py`: rúbrica en el orden de la escala, por columnas y apilada con más de cinco niveles. (FR-002)
- [X] T003 `test_herramientas_pdf_imprimibles.py`: una sola letra por opción, sin alterar iniciales. (FR-003)
- [X] T004 `test_herramientas_pdf_imprimibles.py`: sin imagen real no sale el texto interno; con imagen real se imprime. (FR-004)
- [X] T005 `test_herramientas_pdf_imprimibles.py`: preguntas del cuento, tarjetas sin partir, ficha, tarjetas recortables y sopa de letras. (FR-005, FR-006, FR-007, FR-008, FR-009)

### Implementación

- [X] T006 Nombres y encabezados. (FR-001)
- [X] T007 Rúbrica por niveles. (FR-002)
- [X] T008 Limpieza de la letra de las opciones en taller, quiz, examen y ficha. (FR-003)
- [X] T009 Imagen de reserva sin texto interno en cuento y Para colorear. (FR-004)
- [X] T010 Preguntas del cuento numeradas con renglones. (FR-005)
- [X] T011 Tarjetas sin partir entre páginas. (FR-006)
- [X] T012 Ficha con saltos de línea y recuadro de dibujo. (FR-007)
- [X] T013 Tarjetas de estudio recortables. (FR-008)
- [X] T014 Sopa de letras con celdas grandes. (FR-009)

### Validación

- [X] T015 PDF de cada herramienta generado en el contenedor y revisado en imagen, con y sin soluciones; pruebas, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009)

## Dependencias

T001 → T006. T002 → T007. T003 → T008. T004 → T009. T005 → T010, T011, T012, T013 y T014. T015 al final.

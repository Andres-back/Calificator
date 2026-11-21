# Validación: Criterio de accesibilidad y usabilidad

## Comprobaciones

```
python scripts/build_system_inventory.py --check     inventario vigente
python -m pytest tests/spec_governance -q            gobernanza en verde
```

## Estado de partida (2026-11-20)

- Suite `frontend/e2e/accessibility`: 16 pruebas en 4 archivos (nombres accesibles, tamaño táctil, foco y teclado, diálogos, reflow con zoom al 200 %, claro y oscuro, de 360 a 1920 px). Pasan en local, pero CI no la ejecuta: la configuración principal de Playwright la excluye.
- Pruebas unitarias de patrones (`P2Accessibility.test.tsx`): etiquetas y errores asociados, un solo encabezado principal, migas de pan, alertas, foco en diálogos.
- Sin revisión automática de reglas WCAG (contraste, regiones, ARIA).
- Usabilidad medida en la tesis con la encuesta final (modelo de aceptación tecnológica): facilidad de uso 4,6 sobre 5 con 6 docentes.

Las specs 210 y 211 cierran los dos primeros huecos.

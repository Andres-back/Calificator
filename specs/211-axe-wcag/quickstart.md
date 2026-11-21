# Validación: Revisión automática de reglas WCAG con axe

## Pruebas

```
npm run test:a11y                                          36 pasan (16 previas y 20 de axe)
AXE_REPORT=1 npx playwright test --config=e2e/accessibility wcag-axe     imprime las violaciones en JSON
npx vitest run src/components src/modules/calificaciones   677 pasan
tsc --noEmit y eslint de lo tocado                         sin errores
```

## Antes y después

| Pasada | Casos con violaciones |
| --- | --- |
| Primera (sin cambios) | 16 de 20 |
| Tras las correcciones | 0 de 20 |

Las capturas de la cabecera y de las tarjetas de revisión, en claro y oscuro y en 390 y 1366 px, se ven igual que antes: las iniciales siguen visibles.

## Lo que axe no cubre

axe detecta cerca de un tercio de los problemas de WCAG. El orden lógico del foco, la claridad del lenguaje y la experiencia con lector de pantalla se siguen revisando a mano (`docs/accesibilidad-usabilidad.md`).

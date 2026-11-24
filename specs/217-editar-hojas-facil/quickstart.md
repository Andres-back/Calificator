# Validación: «Editar hojas» fácil para cualquier edad

**Spec**: [spec.md](spec.md) | **Issue**: [#456](https://github.com/Andres-back/Calificator/issues/456)

## Cómo comprobarlo

```bash
cd frontend
npx vitest run src/components/ui src/modules/calificaciones src/components/evidence
npx playwright test e2e/evidence-edit-usability.spec.ts e2e/evidence-edit.spec.ts
npx playwright test --config=e2e/accessibility -g "editar hojas"
```

A mano: abrir una calificación con foto → «Evidencia» → «Editar hojas».

1. Cada hoja muestra «Girar o recortar», «Subir», «Bajar» y «Quitar».
2. Tocar la miniatura abre la hoja en grande; «Cerrar» vuelve.
3. «Quitar» muestra «Quitaste la hoja N.» y «Deshacer».
4. Junto al botón de guardar, una frase dice qué falta.
5. En computador, «Girar o recortar» abre «Preparar hoja» a pantalla completa con «Usar esta hoja» a la vista.

## Resultado del 2026-11-24

- Antes del arreglo, a 1440 × 900 px «Usar esta hoja» quedaba en y = 921, fuera de la pantalla. La prueba nueva, corrida con el `Modal.tsx` anterior, falla a 1440 px y pasa a 390 px, igual que lo observado.
- Con el arreglo: pruebas nuevas de `Modal` (2), `EvidenceEditDraft` (5) y `GradeReprocessing` (1) en verde; Vitest completo 1729 de 1729; extremo a extremo de «Editar hojas» 4 de 4; suite de accesibilidad 44 de 44, con «Editar hojas» sin violaciones de axe en claro y oscuro a 390 y 1366 px. Tipos y lint sin errores.
- Capturas revisadas a 1440 px (claro) y 390 px (oscuro): botones con texto y borde, «Quitar» en rojo, miniaturas que se reconocen y «Preparar hoja» cubriendo la pantalla.

## Límites

- Girar sigue haciéndose en «Preparar hoja»; la lista no gira por sí sola.
- «Editar hojas» y «Cambiar evidencia» siguen siendo dos entradas distintas.

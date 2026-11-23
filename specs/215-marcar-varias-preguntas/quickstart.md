# Validación: Marcar varias preguntas como correctas o incorrectas a la vez

## Pruebas

```
python -m pytest backend/tests/unit/test_breakdown_bulk_mark.py backend/tests/unit/test_breakdown_teacher_adjustment.py -q
  10 passed

npx vitest run src/modules/calificaciones
  49 archivos, 420 passed

npx playwright test e2e/bulk-question-mark.spec.ts e2e/grade-review-mobile.spec.ts e2e/explainable-grading.spec.ts e2e/teacher-review-context.spec.ts --project=chromium
  70 passed

npm run test:a11y
  40 passed
```

En una de las corridas del módulo falló `GradeReprocessing.test.tsx` («compara máximos y exige aceptar puntos…»), que este cambio no toca. Repetida sola pasó tres veces y el módulo completo volvió a pasar; es intermitente con el equipo cargado.

También pasan los tipos (`tsc --noEmit`), ESLint en los archivos tocados, 350 pruebas de servidor relacionadas con el desglose y el lint de CI.

Antes del cambio, 7 de las 8 pruebas de `GradeBreakdown.bulk.test.tsx` fallaban, y la prueba de servidor de «Para mejorar» también. Las otras dos pruebas de servidor pasaban desde el principio: el guardado de varias preguntas ya existía y quedan como regresión.

## Recorrido en pantalla

Capturas de la prueba de extremo a extremo, con la API simulada del entorno de pruebas, en 390 px y 1440 px, claro y oscuro:

1. «Marcar varias preguntas» aparece bajo los números. Al pulsarlo, los números se vuelven casillas y el foco queda en la primera.
2. Con tres preguntas seleccionadas, el panel dice «3 preguntas seleccionadas» y ofrece «Marcar correctas» y «Marcar incorrectas».
3. Al elegir, dice «3 preguntas quedarán correctas: 2, 3 y 5.» y «Nota: 1.88 → 3.75», con «Volver» y «Confirmar».
4. Al confirmar sale una sola solicitud con los tres cambios y la versión vigente, y vuelve la navegación normal.
5. Si el servidor responde que la calificación cambió en otra revisión, no se guarda nada, aparece el aviso y se vuelve a pedir la versión vigente.

Todos los botones del modo miden al menos 44 × 44 px y no hay desplazamiento lateral. La revisión con axe no encontró violaciones WCAG A ni AA en los cuatro casos.

## Hallazgos durante la implementación

- **«Para mejorar» en una respuesta correcta.** Una pregunta que el docente dejaba correcta conservaba la orientación escrita cuando la IA la creía incorrecta. Pasaba también al ajustar una sola pregunta. Ahora se quita al guardar, solo en la versión nueva.
- **Botones partidos en celular.** En 390 px, «Marcar incorrectas» se partía en dos renglones dentro del botón. Los dos botones ahora van uno debajo del otro en pantallas estrechas.
- **Foco perdido.** Al entrar al modo, el botón desaparecía y el foco quedaba en ninguna parte. Ahora pasa a la primera pregunta y, al cancelar, vuelve al botón.

## Sin efecto en datos

- Ninguna migración. El guardado usa la ruta que ya existía, con sus validaciones y su historial.
- La orientación «Para mejorar» solo se quita en la versión nueva de la pregunta que el docente deja correcta. Las versiones anteriores y las demás preguntas no cambian.

## Manual, después del despliegue

1. Abrir una entrega con varias preguntas pendientes, pulsar «Marcar varias preguntas», tocar tres números y «Marcar correctas»: aparece la nota antes y después.
2. Confirmar: un solo aviso, las tres preguntas quedan correctas con puntaje completo y el historial muestra una versión nueva.
3. Abrir una de ellas como estudiante: dice «Tu profesor revisó esta respuesta y es correcta.» y no muestra «Para mejorar».

# Validación: Tomar varias fotos seguidas no pierde la foto ni bloquea el envío

## Pruebas

```
npx vitest run src/modules/materias src/components/evidence src/modules/calificaciones
  80 archivos, 676 pruebas: pasan

npx vitest run src/modules/evaluaciones   (otros usos del selector de hojas)
  33 archivos, 267 pruebas: pasan

npx tsc --noEmit -p .  y  eslint en los archivos tocados
  sin errores ni avisos
```

Antes de la corrección fallaban las 9 pruebas nuevas: el control de la cámara se quitaba al apagar y encender la preparación, no había aviso de hoja pendiente ni entrada en el historial, la preparación se apagaba al caer la verificación, el panel mostraba «Comprobando la calidad» y `uploadEligibilityVerified` no existía.

```
npx playwright test --config=e2e/mock --project=chromium grading-review
  45 pruebas: pasan
```

La prueba «captura contextual en cuatro acciones» exigía que el envío se deshabilitara durante una consulta de fondo; ahora exige que siga habilitado y sin el aviso «Consultando quiénes…» (FR-002). Si la consulta falla, el envío se sigue deshabilitando.

FR-006 lo cubre la prueba existente «rechaza la preview pendiente al pasar explícitamente al modo habitual», que sigue pasando.

## Lo que no se comprobó

- **Un celular Android real** con la cámara nativa y el gesto Atrás: las pruebas simulan el selector de la cámara y el historial del navegador.
- Las pruebas de extremo a extremo; corren en la CI.

## Después de desplegar

En un celular Android, con una entrega anterior calificándose: elegir estudiante, tomar la foto y volver. La hoja debe aparecer y abrirse la preparación. Con la preparación abierta, el gesto Atrás debe cerrarla sin salir de la pantalla. Cerrar la preparación sin decidir debe mostrar «Prepara la hoja 1 o usa la original».

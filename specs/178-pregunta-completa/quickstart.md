# Validación: La pregunta completa a la vista y el aviso se va al entrar

## Pruebas

```
npx vitest run src/modules/calificaciones
  43 archivos, 363 pruebas: pasan

npx tsc --noEmit -p .  y  npx eslint src/modules/calificaciones
  sin errores ni avisos
```

Antes de la corrección, el visor enfocaba a 435 % en la prueba del recuadro, y las pruebas nuevas del aviso y del índice fallaban. Una prueba ajena (`GradeReprocessing.test.tsx`) falló una vez en la suite y pasó sola y al repetir la suite.

## Comprobación en el navegador (2026-11-12)

Aplicación local, docente de prueba, Chromium sin interfaz a 1440 × 900 px, pregunta 3 de una nota con zona ubicada.

| Comprobación | Resultado |
| --- | --- |
| Ampliación al abrir | 250 %. Antes, 527 %. |
| Qué se ve | El enunciado de la pregunta 2 con sus tres opciones, el inicio de la 3 y la lectura de la izquierda; el recuadro marca la zona. |
| Cabecera de la nota | Sin «N por revisar». |
| Aviso dentro de la pregunta | No aparece. |
| Contorno negro alrededor de la pregunta | Presente en la captura previa a quitarlo; lo cubre el cambio de clase, sin captura posterior. |

## Lo que no se comprobó

- **Las pruebas de extremo a extremo en local.** El disco del equipo se llenó (0 bytes libres) durante la ejecución y hubo que detenerla. Corren en la CI.
- El índice con preguntas «Conviene comprobar» reales: la nota local no tiene ninguna; lo cubren las pruebas unitarias.
- Teléfono y modo oscuro para este cambio.
- La suite completa del frontend en local, por el mismo problema de disco; corre en la CI.

## Después de desplegar

Abrir una nota con preguntas en ámbar: la que se abre deja de estar en ámbar y no muestra el aviso; la hoja abre a 250 % con la pregunta completa.

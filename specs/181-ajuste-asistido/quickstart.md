# Validación: Ajustar una pregunta sin escribir el motivo y con la explicación redactada por la IA

## Pruebas

```
python -m pytest tests/unit/test_explanation_draft.py -q   (backend)
  11 pruebas: pasan

npx vitest run src/modules/calificaciones
  376 pruebas: pasan (16 del editor)

npx tsc --noEmit -p .  y  eslint de los archivos tocados
  sin errores ni avisos
```

Antes de la corrección, `test_explanation_draft.py` no podía importar el servicio y las pruebas nuevas del editor fallaban: el motivo era obligatorio y no había borrador.

## Lo que no se comprobó

- **El texto que redacta el modelo real**: las pruebas usan un modelo simulado. Se comprueba en producción con una pregunta.
- Las pruebas de extremo a extremo; corren en la CI.

## Después de desplegar

Abrir «Ajustar puntaje y explicación» en una pregunta pendiente y elegir «Correcta»: el motivo se llena solo y en pocos segundos aparece una explicación breve para el estudiante, sin cifras de nota. Guardar sin escribir el motivo.

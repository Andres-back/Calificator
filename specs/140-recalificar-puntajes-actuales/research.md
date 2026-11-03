# Research

## Decisión: adoptar puntos explícitamente, no latest global

El diagnóstico de solo lectura confirmó cohortes con repartos diferentes y
reintentos exitosos que preservaban el contexto anterior. Spec101 lo protege
deliberadamente; Spec137 cambia el pin solo al aplicar notas anteriores.
Se amplía la reapertura individual, no los consumidores globales.

Alternativa descartada: tomar siempre la evaluación actual en el worker. Puede
calificar una evidencia con otras preguntas, claves o figuras.

## Decisión: consulta + referencia exacta y confirmación

GET sirve la comparación sin inferencias. POST comprueba la misma referencia bajo
lock y exige aceptación si difieren solo pesos. Un cliente anterior recibe 409 en
vez de otro resultado antiguo silencioso. El mismo contrato cubre evidencia nueva.

Alternativa descartada: adoptar automáticamente los nuevos puntos o exigir ir a
la actualización masiva. La primera oculta la decisión; la segunda reproduce el fallo UX.

## Decisión: transacción e idempotencia existentes

Orden grade/delivery/evaluation, snapshot antes del pin, commit de cola existente.
Recibo idempotente antes de verificar estado/huella actual, para que una repetición
tras el cambio de pin no falle ni duplique. Sin nueva tabla, migración ni proveedor.

No quedan incertidumbres de diseño; las pruebas de concurrencia deben demostrar
la compatibilidad con guardado de reparto, reemplazo y solicitudes repetidas.

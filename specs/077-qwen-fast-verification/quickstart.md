# Validación y operación 077

## Local/CI

Desde backend, ejecutar las pruebas existentes del gateway, discovery y photo grading; lint y compile. Abrir PR enlazado al issue #161 con spec-approved/plan-approved; fusionar únicamente con CI verde.

## Producción

1. Comprobar commit main y presencia del parche en backend/worker, salud y trabajos activos.
2. Leer configuración actual, bloquear versión, validar y publicar rutas de verificación/arbitraje Qwen conservando el resto y snapshot. No imprimir credenciales.
3. Demo profesor: «Volver a analizar la evidencia» una vez, medir cola y pipeline por telemetría hasta terminal. Mantener nota sin confirmar/publicar.
4. Comparar tiempo y modelos con research.md; informar número de muestras y alertas. No confundir claves demo antiguas con fallo de visión.
5. Ante degradación, usar restauración administrativa solo sin publicaciones posteriores; de lo contrario publicar inversa limitada y validada.

La comprobación productiva se documentará en el issue tras el despliegue; esta guía no presume su éxito por anticipado.

## Evidencia local 2026-09-30

- Red: cuatro fallos nuevos reprodujeron ausencia de control thinking y capacidad visual Qwen.
- Green: 64 pruebas del gateway, discovery y photo grading pasaron con el parche; lint F401/F821/F822/F823/F841 y compileall también.
- Analyze: 7/7 requisitos cubiertos por tareas; sin contradicciones críticas ni excepciones constitucionales.
- Converge: no falta implementación del adaptador ni regresiones; publicación/configuración y medición productiva continúan como gates posteriores al merge, no como éxito supuesto.

# Validación y activación separada

Desde `backend`, ejecutar pytest sobre `test_safe_objective_validation.py`, `test_objective_resolution_consensus.py`, `test_objective_accuracy_comparison.py` y regresiones de calificación/desglose/visión. Sin claves, llamadas IA, red ni base real.

## Comparación sintética

La referencia se declara manualmente en cada fixture antes de ejecutar la regla. Baseline y candidata reciben exactamente las mismas lecturas y valoraciones de modelos. Informar aciertos de puntaje en casos resolubles, pendientes correctos, ceros indebidos y errores de asociación. El tiempo puro de Python no equivale a latencia de un proveedor ni de OCR. La orientación/giro de las imágenes sigue el escáner vigente; aquí se verifica consumo de lecturas por página, no imágenes nuevas.

## Protocolo antes de activar

1. Solicitar autorización concreta para una muestra real anonimizada y cualquier llamada pagada. No reutilizar permisos históricos de otra investigación.
2. Separar tipos y conservar pesos/versión; dos docentes corrigen sin ver la nota IA y resuelven discrepancias para fijar referencia. Congelar muestra, modelos, prompt y claves; no ajustar reglas sobre la muestra de evaluación.
3. Registrar error de lectura, identidad/pregunta, error de puntos y MAE en los casos puntuados, proporción de pendientes, tiempos de cola/lectura/evaluación/persistencia y costos reales si se conoce uso facturado. Separar exactitud condicional de cobertura para no presentar la abstención como acierto.
4. Para abiertas, comparar en estudio separado el verificador actual con una valoración que no vea A; reutilizar el protocolo y Kappa de Spec 032 con categorías ordinales fijadas. No estimar Kappa si faltan datos suficientes, referencia independiente o variación. No mezclar satisfacción con concordancia.
5. Revisar ceros indebidos y no inferioridad frente a baseline; si la muestra no permite decidir, ampliar la evaluación. Registrar la decisión responsable. Exigir CI verde y autorización antes de cambiar el gate. Sin esa decisión, permanece apagado aunque se fusione el código.

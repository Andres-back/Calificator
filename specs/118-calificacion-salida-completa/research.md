# Decisiones del incidente

- **Observado**: lectura completada, `output_incomplete` al valorar y recuperar 24 preguntas; presupuestos fijos 3072/2048. Evidencias conservadas. No demuestra por sí solo la causa exacta del corte.
- **Decisión**: reproducir con copia anónima y capturar únicamente terminación, conteos y tiempo; clave permanece en VPS.
- **Decisión**: presupuesto por componentes y etapa, con techo y mínimos existentes. No depende del nombre del modelo ni agrega intentos.
- **Decisión**: distinguir agotamiento explícito de límite de una incompletitud desconocida. No aceptar salida parcial ni atribuir todo fallo a falta de espacio.
- **Dependencias**: snapshot configurable de Spec 116 y recalificación de Spec 114. No hay tecnología nueva ni incógnitas que requieran investigación delegada.

## Resultado experimental autorizado

La primera llamada real confirmó `status=incomplete`, `incomplete_details.reason=max_output_tokens`, salida de 3072 tokens. La segunda, mismo contexto e imagen anónima con límite 16 384, terminó `completed` con 3899 tokens. Por tanto el límite anterior fue insuficiente en esta entrega. No se infiere que todas las actividades o fallos tengan esta causa.

El estimador ampliado, aprobado después de esta prueba, calcula 16 384 para valorar o recuperar 24 componentes y 12 288 para verificarlos. Ambos superan holgadamente la salida completa observada. La llamada real amplió el límite en el transporte del laboratorio; no desplegó este código ni probó el verificador GLM.

## Margen amplio confirmado por el usuario

El usuario prefirió conservar el ajuste automático con más holgura, no imponer un techo fijo de 10 000. Se aumentó la reserva base y por componente para razonamiento, estructura y retroalimentación. Con 1/8/24 preguntas, valoración dispone de 5120/8192/16 384 y verificación de 4096/6144/12 288. La recuperación utiliza la misma política de valoración. El techo se mantiene en 16 384; si un proveedor falla por otra causa, o una actividad supera la capacidad, sigue siendo necesaria revisión y no se publica una respuesta parcial. No se hicieron nuevas llamadas pagadas.

# Validación rápida: recursos pedagógicos

## Preparación

1. Iniciar backend, worker y frontend con la configuración local habitual.
2. Acceder como profesor y disponer de una materia de prueba.
3. Usar un tema común, por ejemplo “fracciones equivalentes”, para comparar formatos.

## Escenario 1: catálogo sin redundancias

1. Abrir Recursos → Crear material.
2. Confirmar que aparece una sola opción “Relacionar pares”.
3. Confirmar que “Ficha didáctica” no aparece para nuevas creaciones.
4. Abrir por URL o dato de prueba una ficha y una actividad `unir_columnas` antiguas.

**Resultado esperado**: las opciones redundantes no se ofrecen, pero los materiales históricos abren y pueden descargarse.

## Escenario 2: cuatro formatos diferenciados

Generar una guía, una lectura comprensiva, un taller y un plan de refuerzo con el mismo tema.

**Resultado esperado**:
- La guía enseña y modela antes de practicar.
- La lectura usa un texto y distribuye preguntas por nivel con evidencia.
- El taller concentra ejercicios calificables o revisables con puntajes y soluciones.
- El plan parte de dificultades y organiza sesiones con seguimiento.

Cronometrar una revisión del selector y de las cuatro vistas con un docente: debe identificar correctamente qué formato enseña, cuál evalúa comprensión lectora, cuál practica y cuál refuerza en menos de 30 segundos, sin abrir documentación adicional.

## Escenario 3: revisión y exportación

1. Editar una explicación de la guía, una evidencia de lectura, un puntaje del taller y un indicador del plan.
2. Guardar y recargar.
3. Descargar PDF de estudiante y PDF con soluciones.

**Resultado esperado**: los cambios persisten; ambas exportaciones conservan estructura y la versión estudiantil no revela soluciones.

## Escenario 4: recuperación

Ejecutar las pruebas que simulan una respuesta incompleta del proveedor.

**Resultado esperado**: se obtiene una estructura completa mediante recuperación o un error explícito; no se guarda un material vacío.

## Comandos de verificación

```powershell
docker compose exec backend pytest tests/unit/test_herramientas_content_quality.py tests/unit/test_herramientas_render_contracts.py tests/unit/test_herramientas_pdf_total.py
npm --prefix frontend test -- --run src/modules/herramientas/toolPickerModel.test.ts src/modules/herramientas/views/ContenidoView.test.tsx
npm --prefix frontend run build
```

## Tamaños visuales

Revisar creación y detalle en 360×800, 390×844, 768×1024 y 1366×768, en modo claro y oscuro.

## Resultado de validación local — 2026-08-28

- Catálogo: se muestran 11 formatos canónicos. No aparecen `ficha` ni
  `unir_columnas`; “Relacionar pares” aparece una sola vez.
- Diferenciación: las tarjetas explican de forma directa que la guía enseña
  paso a paso, la lectura evalúa comprensión con evidencia, el taller practica
  con puntajes y el plan parte de un diagnóstico y seguimiento.
- Responsividad: creación sin desbordamiento horizontal en 360×800, 390×844,
  768×1024 y 1366×768. Detalle real verificado en 390×844, modo oscuro, también
  sin desbordamiento.
- Detalle: se detectó y corrigió un alias SQL faltante para
  `evaluacion_recepcion_habilitada`; después de reconstruir backend el recurso
  abrió sin errores de consola.
- Pruebas frontend focalizadas: 23 aprobadas.
- Pruebas backend focalizadas: 41 aprobadas.
- Build frontend de producción: aprobado.

Límite de esta pasada: no se hicieron cuatro generaciones reales consecutivas
con proveedores externos para no consumir tokens innecesarios. Los cuatro
contratos se probaron con respuestas completas, recuperación, vista y PDF; la
validación visual manual cubrió el selector y un detalle persistido real.

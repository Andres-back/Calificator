# Quickstart de validación

Usar solo fixtures sintéticos y PostgreSQL local aislado. Nunca DATABASE_URL real
ni llamadas a IA. Ver [contrato](contracts/reprocessing.md).

1. Sembrar nueve preguntas con máximos antiguos 0,56 (1–8) y 0,52 (9), 24 entregas.
2. Guardar reparto cerrado 2,5 / abierto 2,5; 8 y 9 pasan a 1,25, sin cambiar entregas.
3. Aplicar a una parte y abrir recalificación de otra: consulta sin cambios, muestra comparación.
4. Enviar sin aceptación: 409 y cero trabajos. Confirmar referencia: snapshot previo,
   pin nuevo y trabajo con hash exacto; la otra entrega conserva su contexto.
5. Repetir solicitud y probar destino cambiado, otra clave/figura/escala, falta de
   versión, permisos, edición concurrente, reemplazo con/sin escaneo y rollback.
6. Probar diálogo en Chromium/WebKit a 384 y 1440 px, temas claro/oscuro y teclado.
   Capturas sin datos reales. No afirmar validación de teléfono físico.

Comandos orientativos desde worktree:

```powershell
python -m pytest backend/tests/unit/test_reprocessing_context.py -q
python -m pytest backend/tests/integration/test_regrading_score_context.py -q
python scripts/build_system_inventory.py --check
python -m pytest tests/spec_governance -q
```

Desde frontend: `npm run typecheck`, `npm run lint:strict`, `npm run test:run`,
`npm run build`, `npm run audit:build` y E2E contextual nuevo más regresiones
de revisión, reemplazo y escáner. Registrar resultados reales aquí al finalizar.

## Puertas previas

Maqueta sintética384px revisada antes de implementar: `output/playwright/spec140-maqueta-384.png`.
No se observan recortes ni desplazamiento horizontal. No constituye prueba funcional.
El único aviso de consola fue favicon404 en el servidor estático de diseño.
Análisis cruzado: 12 FR, cuatro SC y 15 tareas, cobertura completa, cero hallazgos
críticos/altos, cero tareas sin propósito. Requisitos16/16, sin pendientes. Las
protecciones de contenido de Spec101 y actualización masiva de Spec137 se conservan.

## Resultados locales de implementación

- RED previo: helper ausente en unit; GET404 con router anterior cargado en
  memoria frente a200 esperado en integración; cinco casos UI fallidos antes del cambio.
- Backend final: **114 pruebas aprobadas** (unit comparador/reapertura/versiones/reparto
  e integración real de reapertura y reparto). PostgreSQL16 local tmpfs en
  127.0.0.1:55417, datos sintéticos y esquemas aleatorios; cero IA. Ruff y compileall: PASS.
- Una prueba adicional de reemplazo escaneado con puntos nuevos pasó aparte:
  originales e historial intactos, manifiesto y rotación conservados, referencia
  nueva exacta y replay sin duplicados. La consulta previa se probó dentro de una
  transacción READ ONLY real: no usa el lock exclusivo de admisión de materia.
- Muestra mixta24: cuatro reaperturas adoptan1,25/1,25 y archivan el contexto
  anterior; las otras veinte quedan intactas. Repetición, rollback, permisos y
  carreras comprobados. Dos POST siguen respetando el bloqueo exclusivo de materia
  preexistente; no se afirma paralelismo que el flujo no ofrece.
- Pruebas UI dirigidas finales: **27 aprobadas**, incluyendo actualización parcial
  fallida, nota publicada/procesando en otra sesión, cierre/reapertura y respuesta
  tardía para otra nota; contrato FormData exacto y sin aceptación inventada.
- Chromium final: **9/9**, sin omitidos ni reintentos, repetidos contra el build
  de producción local (**9/9**,23,7s) para incluir las fuentes empaquetadas.
  WebKit: **9/9**, sin omitidos ni reintentos. La regresión conjunta25 con134 fue
  interrumpida por el motor Docker; **no se afirma que esa ejecución pasó**.
- La primera ejecución WebKit con build/unidades en paralelo agotó el presupuesto
  global30s; las trazas no mostraron un bucle de geometría. Se repitió aislada con
  los mismos límites/aserciones y pasó9/9 en162s. No se amplió timeout ni se añadió retry.
- Un selector de etiqueta envolvente del motivo no encontraba el textarea tras
  escribir; se seleccionó por rol textbox/nombre accesible manteniendo el valor exacto.
- Tipos, lint completo, auditoría de acciones677/125, build y presupuesto: PASS.
  Auditoría npm producción: cero moderadas/altas/críticas; cuatro avisos bajos de
  KaTeX/transitivas preexistentes, sin actualización de dependencias ni lock.
- Suite frontend completa final: **1394/1394**, cero fallos/pendientes/omitidos;
  informe local `E:/tesis/output/spec140-tests/frontend-unit-final.json`.

Capturas reales384/1440 claro/oscuro: `frontend/output/playwright/spec140-*`
(Chromium con opacidad final comprobada); WebKit en
`E:/tesis/output/spec140-tests/linux-final/playwright/`. Las capturas iniciales de
animación no se usan como evidencia de legibilidad final.

## Incidencia del entorno local

Durante la regresión conjunta el proceso WebKit/WPE de WSL generó un volcado de
5,6GB, llenó C y Docker informó que no podía arrancar. Se detuvo el cliente de
pruebas, sin reiniciar ni borrar contenedores ajenos. El temporal se copió a la
carpeta privada de respaldo en D y se verificó SHA256 antes de retirarlo de C.
No se continúa ejecutando WebKit local; la validación Linux completa queda a
cargo del CI obligatorio. No se reduce timeout ni se omite ninguna prueba.

## Convergencia

12 FR, cuatro SC, diez escenarios de aceptación, ocho decisiones de plan y ocho
principios revisados contra fuente y pruebas. Cero faltantes de código, cero
contradicciones o ampliaciones sin justificar; sin fase adicional. El hash de
tasks.md se mantuvo intacto durante la evaluación y sus marcadores se cerraron
después en la fase Implement. Sin hooks configurados.

CI remoto completo pendiente en el PR borrador; no es autorización de fusión.
No se ha probado teléfono físico, inferencia, producción ni calidad pedagógica
mediante esta entrega; no se afirma un despliegue.

Gobernanza final: **61/61** en18,90s; inventario684superficies vigente y
`git diff --check` correcto. El inventario conservador marca routers anidados como
candidatos históricos; la nueva ruta se comprobó registrada mediante OpenAPI
real y su autorización mediante integración, sin ocultar el resultado del inventario.

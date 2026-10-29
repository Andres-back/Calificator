# Integración del escáner con el piloto vigente

## Alcance

Autorización inicial de reanudación para integrar, comprobar y publicar CI de la rama131. Después de CI verde, el2026-10-29 el usuario aprobó preparar la fusión con el escáner desactivado y activarlo después de las pruebas físicas. No autoriza activación productiva, despliegues manuales, inferencias de pago ni modificación de notas/evidencias reales.

Base de integración: `origin/main` en `33b8b1569b76ce6e56b96aefcd82982ba841c4fb`. Se conservan las entregas129/132/133/134: compartir con revisión integrada, lectura administrativa y límites versionados, edición directa de nota y prioridad de revisión por colores. En el docente los colores no se confunden con acierto/error.

## Flujo comprobado por inspección

El selector contextual abre el editor al recibir una fotografía. La propuesta de bordes no equivale a aceptación automática: el docente revisa y acepta o conserva la original. Aceptar actualiza la miniatura desde `scan.preview` y conserva el archivo original para enviar original y receta cerrada. La evidencia canónica se prepara en el backend y la vista docente ofrece preparada por defecto y original como comparación privada. Los registros anteriores no se procesan de nuevo automáticamente.

## Validación actual

- Tipos frontend: correcto después de resolver conflictos.
- Pruebas focalizadas de componentes de evidencia, desglose y administrador:18 archivos,133 casos correctos. La primera ejecución no llegó a ejecutar casos por restricciones EPERM de temporales; repetición fuera del aislamiento correcta, sin cambios a las pruebas.
- Chequeo final frontend (`npm run check`):correcto,187 archivos/1191 casos en103,59s, auditoría de640 acciones y122 enlaces,lint,tipos,construcción y auditoría de build. La regresión adicional de miniatura confirma preparada frente a original. Lint estricto también comprobado. OpenCV clásico/módulo:hashes fijados y cuatro combinaciones Chromium/WebKit correctas, sin violaciones CSP.
- Suite backend completa en Linux sin red:1791 casos correctos en213,44s;19 advertencias de dependencias/legacy, sin exclusiones de tests. Ruff con selectores de CI correcto. La ejecución nativa Windows se detuvo tras dejar de avanzar y no se usa como prueba de éxito; no se cambiaron pruebas para ocultarlo.
- Docker encendido por el usuario. Base PostgreSQL y Redis sintéticos en red interna sin puertos ni volúmenes productivos. Primera ejecución de persistencia detectó entorno sin tablas; aplicar el historial reveló dos cabezas131/133. Añadida revisión de unión `202610290001`, sin DDL/DML propio, manteniendo ambas revisiones publicadas y sus salvaguardas. Historial completo aplicado correctamente;49 contratos de ruta/páginas/migración/persistencia/caché correctos después de corregir la inspección de ramas del test (`implicit_base`, como el planificador de actualización). No se omitieron contratos ni se cambiaron las reglas de admisión.
- Gobernanza fuera del aislamiento:60 pruebas correctas y1 bloqueo esperado por tareas físicas abiertas de131. La primera ejecución en el aislamiento también falló por permisos de temporales y Git Bash; repetida sin esos errores. No se modifica el gate ni se dan por terminadas las tareas físicas.
- Primera matriz de navegador:125/126 casos correctos en19,7min. WebKit agotó30s al alternar preparada/original y páginas (768px oscuro). Traza:un click acumuló12,2s mientras se movía la vista. Regresión instrumental nueva, sin sustituir el desplazamiento nativo, reprodujo en Chromium que paginar solicitaba otro `scrollIntoView` estando ya en Evidencia (esperado0,observado1). Se limita ese acercamiento al cambio desde otra sección; se conservan clicks nativos,30s y todas las aserciones. Repetición específica posterior:32/32 recorridos correctos en5,1min, ambos motores,360/390/768/1440px y claro/oscuro, incluido el caso fallido. Es cobertura acumulada sobre el incremento:el125/126 anterior no se presenta como una ejecución completa verde ni se acredita iPhone físico.
- Prueba física: confirmación humana previa de Android, sin métricas nuevas. Safari/iPhone y recursos nativos siguen pendientes; la emulación no los reemplaza.

## Cierre local y publicación

T050/T051/T052 quedan comprobadas localmente; no se identifican otros huecos funcionales nuevos en la integración. Inventario regenerado:670 superficies; sin archivos privados, credenciales o muestras reales incorporados al cambio. El entorno PostgreSQL/Redis temporal se eliminó tras las pruebas; otros servicios y producción no se modificaron.

La integración se publicó en `codex/131-escaneo-evidencias`, commit `5d5977a9cec8d848c986b85c3f8019828a03ef3c`. Su [CI40950618711](https://github.com/Andres-back/Calificator/actions/runs/40950618711) terminó verde en los11 trabajos, incluidos todos los E2E y contenedores. Se prepara el PR de entrega apagada con CI/gobernanza propios; no se modifican ni omiten esos controles y no se anticipa el resultado del nuevo HEAD.

Los pendientes físicos T032/T033/T044/T047/T048 se conservan abiertos, trasladados sin marcar como realizados a [activation-pending.md](activation-pending.md) e [issue285](https://github.com/Andres-back/Calificator/issues/285), conforme al alcance de fusión apagada aprobado. Solo hay confirmación humana general de Android; el usuario indicó que no dispone de iPhone por ahora. La activación sigue bloqueada hasta cerrar el seguimiento y recibir autorización separada.

## Comprobación de entrega apagada

- Consulta SSH de solo lectura:las dos variables `EVIDENCE_SCAN_ENABLED` y `EVIDENCE_CORNER_ASSISTANCE_ENABLED` están ausentes del entorno del backend productivo; los defaults fijados por pruebas son `false`. No se escribieron `.env`, configuración, notas ni evidencias productivas.
- Cuatro pruebas nuevas de backend comprueban defaults, capacidad apagada para docente/admin incluso en allowlist y rechazo409 antes de bloquear/escribir/persistir/encolar. Primera ejecución detectó un nombre incorrecto en el doble de prueba; corregido a `enqueue_persisted_grading`,4/4 pasan y Ruff es correcto, sin cambiar la aplicación.
- Treinta y ocho pruebas focalizadas frontend pasan, incluida la nueva regresión de captura habitual sin editor/receta, capacidad por contexto y recalificación compatible.
- Chequeo frontend completo de entrega apagada:1192 casos correctos/187 archivos en101,11s,lint/tipos/build/auditorías correctos. Backend completo Linux sin red:1795 correctos en130,20s,19 advertencias legacy. Un pase simultáneo anterior obtuvo1794 correctos y1 fallo marginal del benchmark sintético:razón1.1011418 frente al límite1.10,0.118ms extra por entrega y40 llamadas simuladas/20 entregas,sin llamadas reales. Se repitió la suite completa de forma serial y pasó; no se modificaron código de aplicación, umbrales o aserciones para ocultar ese resultado.
- Convergencia del alcance de entrega apagada:33 FR,11 SC,25 escenarios,10 decisiones y8 principios revisados,0 hallazgos de construcción accionables. Las mediciones/pruebas físicas de activación no se acreditan:su alcance sigue en285. Durante Converge,tasks.md permaneció idéntico (SHA2567B95F0E8B76B6BBA3F2B0AB43F8F6DFD7213B343148C46B051E662293A15C722); no se añadió una fase vacía ni se modificaron validadores.
- Cuerpo de PR preparado con `Closes #276`,alcance apagado,seguimiento285,riesgo/migración/rollback y CI de su HEAD obligatorio. Las pruebas físicas no se sustituyen por estas regresiones.
- Gobernanza de la entrega apagada:61/61 pruebas locales correctas en20,10s e inventario670 vigente. No se cambiaron workflows,validadores ni pruebas de gobernanza. Las tareas físicas no se marcaron como realizadas:permanecen abiertas con su texto original en285/activation-pending.md; se cerraron únicamente las tareas del alcance de fusión apagada aprobado. No se anticipa aprobación de GitHub ni activación del escáner.

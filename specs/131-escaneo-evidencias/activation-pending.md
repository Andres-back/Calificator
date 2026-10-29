# Activación del escáner: validación física pendiente

Seguimiento abierto: [issue #285](https://github.com/Andres-back/Calificator/issues/285). Procede de Spec131 e issue #276. El2026-10-29 el usuario aprobó preparar la fusión con el escáner desactivado y activarlo después de las pruebas físicas. No constituye aprobación para activar ni para realizar nuevas llamadas a IA.

Estado: ABIERTO. Confirmación humana general previa de Android; iPhone no disponible, sin métricas físicas completas. Ninguna casilla siguiente se declara realizada por emulación o CI.

Responsable: mantenedor del repositorio Andres-back/Calificator y operador humano del piloto. Fecha límite de revisión:2026-11-05. Si no se completa, ambas banderas deben continuar apagadas; la fecha no habilita activación automática.

Condiciones de cierre: informes humanos Android/iPhone sin fotos/identificadores, geometría y conservación de contenido, latencia/memoria/cancelación nativas y aceptación del piloto; autorización humana separada para activar, con modelos/perfiles comprobados y revisión de CI vigente. No se permiten nuevos ensayos pagados por el mero traslado de estas tareas.

Hasta entonces: EVIDENCE_SCAN_ENABLED=false y EVIDENCE_CORNER_ASSISTANCE_ENABLED=false; captura/subida habitual siguen disponibles. Los lectores privados de versiones existentes permanecen compatibles. La entrega apagada no afirma mejora de OCR/calificación ni teléfonos verificados.

## Tareas originales no ejecutadas por completo

Copiadas sin modificar desde el alcance anterior. Su traslado no es un resultado de prueba ni una marca de completado.

- [ ] T032 Medir CSP/Worker, carga fría/caliente, diez páginas, fotos16MP, memoria/cancelación y límites en `frontend/e2e/evidence-scan.spec.ts` y `quickstart.md`; fallos conservan alternativa original, sin ampliar timeouts de calificación. Scan2:27/27 preparaciones16MP pasan bajo512MiB,1000–1633ms, RSS hijo217396KiB.20 previews/perfil/motor: p95 natural270/881ms y suave353/821ms Chromium/WebKit,0 fallos, frío393/1066ms;4 combinaciones CSP/hash previas intactas. Memoria nativa del renderer/teléfonos sigue sin medirse; estabilidad física/medición móvil pendientes. (FR-011, FR-012, FR-013, FR-018; SC-005, SC-007)

- [ ] T033 Ejecutar recorridos360/390/768/1440, claro/oscuro, horizontal, teclado/texto ampliado y Chromium/WebKit efectivos en `frontend/e2e/{evidence-scan,grade-evidence-review}.spec.ts`; registrar además iPhone/Android físicos pendientes hasta prueba real, sin equiparar emulación. Matriz final117/118 en un intento, un timeout WebKit30s con borrador intacto; repetición idéntica del único caso pasa24.6s, informes conservados. Página aislada compilada pasa smoke de ambos motores/CSP/sin red ni escrituras. Android autorizado en red privada; iPhone está en otro lugar. No acreditar dispositivos aún. (FR-014, FR-018, FR-020, FR-023; SC-006, SC-009, SC-010)

- [ ] T044 Recibir y revisar el resultado físico Android con el relay aprobado y documento sin identificadores; registrar solo geometría/tiempos/consumo y checklist sin fotos en `specs/131-escaneo-evidencias/quickstart.md`. Máximo una llamada nueva, incluidos fallos; ningún éxito se marca antes de la prueba humana. iPhone/memoria y cierre de T032/T033/T036 conservan su evidencia independiente. (FR-018, FR-027, FR-031; SC-006)

- [ ] T047 Medir solo las llamadas necesarias de la fase15 con copias anónimas, guardar resultados y verificar retención; habilitar nueva sesión Android privada con presupuesto restante e informe humano separado de emulación. Tres fotos reales anónimas medidas:3/15 llamadas,12 restantes. Auditoría repetida conserva37 regiones en ambos perfiles y SHA de originales; el caso03 remoto era demasiado interior y solo pasa tras margen conservador, sin ocultar el resultado negativo. Comparación HTML privada original/preparada creada y revisada visualmente; nueva sesión30min comprobada por HTTPS con contador12 y sin exponer claves. Prueba física humana completa todavía pendiente, por ello la tarea no se cierra. No certificar iPhone ni mejora de notas sin evidencia. (FR-018, FR-027, FR-031, FR-032, FR-033; SC-006, SC-008, SC-011)

- [ ] T048 Cerrar la validación física pendiente con resultados humanos Android/iPhone y medición nativa de recursos, consolidando T032/T033/T044/T047 en `quickstart.md`; no sustituir teléfonos por emulación ni anunciar preparación para producción antes del resultado. Por SC-005/SC-006, FR-014/FR-018 y plan:puerta7 (partial, HIGH).

Referencia inmutable del alcance previo:commit5d5977a9cec8d848c986b85c3f8019828a03ef3c, specs/131-escaneo-evidencias/tasks.md.

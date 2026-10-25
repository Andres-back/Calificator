# Guía de validación126

Guía y registro de validación local. Usar únicamente fixtures sintéticas y base aislada; no abrir el enlace real del usuario ni llamar proveedores de IA. Contratos en [retroalimentacion-chat.md](./contracts/retroalimentacion-chat.md).

## Preparación

Tras aprobación, Tasks/Analyze e implementación, instalar dependencias con el procedimiento del repositorio y habilitar feedback_sharing solo en entorno de pruebas. Revisar fixtures/conftest y variables locales de pytest antes de iniciar PostgreSQL; nunca copiar una DATABASE_URL de producción. Aplicar migración nueva y comprobar conservación de datos anteriores/filasNULL. No ejecutar downgrade destructivo.

## Comprobaciones automatizadas

Desde `frontend/`: `npm run typecheck`, `npm run lint:strict`, `npm run test:run -- src/modules/feedback_sharing`, `npm run test:run -- src/modules/calificaciones` y `npm run build`. Ejecutar auditorías vigentes de acciones/build; actualizar inventario con el script del repositorio si el cambio lo requiere, sin relajar controles.

E2E: `npx playwright test e2e/feedback-delivery.spec.ts e2e/feedback-delivery-batch.spec.ts --project=chromium`, y las mismas pruebas con `--project=webkit` tras registrar126 en su selección contextual. Añadir escenarios nuevos126 en esos archivos o declararlos explícitamente en la configuración. El selector actual no incluye126 automáticamente; verificar `--list` para no confundir cero casos con éxito.

Desde `backend/`, usando el Python/entorno del proyecto: `python -m pytest tests/unit/test_feedback_sharing_chat_context.py tests/unit/test_feedback_sharing_headers.py tests/unit/test_feedback_delivery_review.py tests/unit/test_feedback_delivery_batch.py`. Con PostgreSQL aislado: `python -m pytest tests/integration -k 'feedback_sharing or feedback_delivery or feedback_link_copy'`. Incluir nuevo archivo de historial y regresiones de idempotencia/migración/retención, no solo mocks de interfaz. Después ejecutar toda la batería exigida por CI.

## Escenarios de aceptación

1. **Unificación**: crear grupo sintético de30 con nota0, sin nota, confirmadas y pendientes. Seleccionar3 en revisión y abrir el grupo: conserva esos3, no aprueba nada. Abrir uno por ambas rutas: mismo editor/mensaje/estado. Guardar mensaje y comprobar fuente/nota intactas, edición sin guardar protegida, conflicto concurrente sin sobrescritura.
2. **Entrega**: mantener aceptar/publicar, print con continuación, motivos, copia individual y todos/seleccionados. Repetir copia no crea ni extiende enlaces. Lote con un fallo muestra resultado parcial y no modifica a ese estudiante. Docente ajeno/estudiante sin permiso no accede a gestión.
3. **Continuidad**: poblar25 intercambios vinculados y una pregunta pendiente mediante fixtures; recuperar todas las páginas. Recargar/reabrir: mismo contenido/orden sin duplicados; pendiente se consulta sinPOST adicional ni inferencia. Fallo de red tras admisión no duplica cupo.
4. **Aislamiento**: dos contextos de navegador con el mismo enlace no cruzan historia, poll o request_id idempotente. El mismo ID local en otro enlace no concede lectura. NULLlegacy no se enumera; cabezera/cursor corruptos o ajenos no filtran información. Desactivar, renovar o sustituir revisión antes/durante lectura la bloquea y limpia pantalla.
5. **Cupo y datos**: cinco preguntas aceptadas y sexta rechazada en ventana móvil; dos conversaciones comparten consumo. Abrir historial/poll no admite preguntas. Inspeccionar almacenamiento y tráfico: solo scope/UUID local, sin textos, nombre, notas o token; sin cookies de cuenta, URL secreta, telemetría ni llamadas externas por formato. Almacenamiento bloqueado/corrupto conserva visita temporal explicada.
6. **Presentación**: fixtures con `**V (Verdadera)**`, `** Paso concreto: **`, párrafos, listas, tabla, fórmula,8000caracteres, código y marcado incompleto. Sin asteriscos de énfasis habituales, contenido íntegro y sin imágenes/enlaces remotos ejecutables. HTML/script/URLmaliciosa no ejecuta ni solicita recursos. Capturas360/390/768/1440, dos temas, teclado y foco; revisar impresión Carta/A4 de mensaje6000caracteres sin truncar.
7. **Retención**: mantener el corte vigente tras cierre efectivo; reactivación o textos purgados no reconstruyen historial. Comparar notas, evidencias, matrículas, análisis y modelos antes/después: sin cambios por consulta/recuperación/formato.

## Resultados locales 2026-10-24

- Revisión autorizada16/16+8/8; Analyze22 requisitos/22 tareas con cobertura100 %, sin incidencias bloqueantes.
- PostgreSQL local con pgvector, base `spec107` en127.0.0.1:55417, sin volúmenes ni datos de producción; upgrade completo hasta202610240003 y prueba de migración sobre mensajes anteriores sin backfill. No se ejecutó downgrade destructivo.
- Backend:165 pruebas de devolución/historial/entrega/enlaces/migración/cuota/retención aprobadas, proveedor y broker simulados. RuffF401/F821/F822/F823/F841 de app/tests y compilación aprobados. Se usó `--import-mode=importlib` y lista explícita de archivos relevantes para evitar choques entre unit/integration homónimos; no se omiten casos de esas suites.
- Frontend:216 pruebas unitarias de feedback/calificaciones aprobadas en45 archivos, lint estricto, TypeScript y build aprobados; auditorías572 botones/121 enlaces y recursos del build aprobadas. Aviso existente de chunk grande, sin introducir dependencias nuevas.
- Navegador:26 casos126 aprobados en Chromium/WebKit,360/390/768/1440 y dos temas; recarga, scope local sin texto/token, lector aislado, almacenamiento bloqueado, servidor legacy, altura450px de escritura, tres seleccionados y ambas entradas docentes. Sesenta y cuatro regresiones de entrega, publicación, copia y fichas con motivos también aprobadas:90 casos en total. La comprobación se cerró sin servidores de distintos runners compartidos; en móvil se vuelve a lista antes de abrir sus acciones, sin forzar clics sobre controles cubiertos.
- Capturas sintéticas inspeccionadas en `output/playwright/spec126-chat-*`; no se abrió el enlace real ni se consultó evidencia de estudiantes. Cero llamadas pagadas y cero modificaciones de producción. Emulación, no dispositivos físicos.
- Converge detectó tres brechas de cobertura y añadió T023–025, ahora verificadas. Segunda revisión funcional:22 requisitos/14 escenarios de aceptación, siete decisiones de diseño y ocho principios, sin brechas de código restantes. Inventario regenerado y comprobado:653 superficies. Publicación del PR/CI remoto aparte, sin afirmar fusión o despliegue.
- PR[#267](https://github.com/Andres-back/Calificator/pull/267) creado y adjuntado al chat. La primera ejecución remota señaló la entrada nueva ausente en `ALL_SPECS`; se incorporó sin retirar aserciones y las58 pruebas de gobernanza pasaron localmente. En Windows estas pruebas necesitan crear repositorios temporales; la ejecución con permisos de procesos pasó. CI remoto se vuelve a ejecutar con la corrección, sin fusión/despliegue.

## Corrección de CI 2026-10-25

- La ejecución remota40163662660 falló en24 casos de biblioteca/impresión de motivos: los dos archivos aún buscaban el botón y diálogo «Retroalimentaciones», sustituidos por «Retroalimentación del grupo». Backend, compilación/calidad frontend, contenedores, gobernanza y regresiones contextuales aprobaron en ese HEAD.
- T026 actualiza únicamente esos recorridos y la documentación: nombre actual, impresión inicialmente deshabilitada sin selección y selección explícita «Todos los listos». Se mantienen todas las comprobaciones de contenido íntegro, treinta estudiantes, motivos, formatos A4/Carta y ausencia de escrituras académicas. No se cambian producto, workflows, timeouts ni filtros de CI.
- Prueba local: `npx playwright test e2e/motif-library.spec.ts e2e/motif-print.spec.ts e2e/feedback-chat-history.spec.ts e2e/feedback-delivery.spec.ts --project=chromium --project=webkit --project=webkit-feedback --grep '123|126' --workers=2 --reporter=line`:50/50 aprobadas en5,3min (24 casos afectados y26 regresiones126). Incluye360/390/768/1440px, ambos temas, chat recuperable, aislamiento, selección y espacio común individual/grupo; ocho PDF sintéticos generados. El filtro limita solo esta comprobación local; CI conserva su suite completa.
- TypeScript aprobado con `npm run typecheck`;58/58 pruebas de gobernanza aprobadas con `python -m pytest tests/spec_governance -q --tb=short` tras cerrar T026; `git diff --check` sin errores. Sin llamadas a IA, datos reales, modificaciones de producción ni fusión. El resultado del nuevo CI remoto se verifica separadamente tras publicar el ajuste.

## Puerta de entrega

Registrar resultados reales y limitaciones en tareas; Converge y CI completos antes de declarar listo el PR. La planificación no autoriza fusión, despliegue ni prueba pagada/real adicional. Una comprobación posterior en producción será con demo autorizada, sin publicar notas o accesos reales por defecto, y nunca presentará emulación como cámara/teléfono físico verificado.

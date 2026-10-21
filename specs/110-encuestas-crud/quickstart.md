# Validación del CRUD de encuestas

Estado: implementación y validación local completadas el 2026-10-21. PR/CI remoto y publicación aún pendientes al preparar esta evidencia.

## Entorno

Usar checkout de `codex/110-encuestas-crud`, Python y Node locales, navegador Chromium/WebKit y Docker Desktop. Bases temporales diferentes para diagnóstico y piloto; credenciales sintéticas mediante variables de entorno, nunca claves productivas. No enviar respuestas ficticias al sitio público.

## Pruebas automatizadas previstas

```powershell
python -m unittest discover -s encuesta-docente/tests -v
node --test encuesta-docente/tests/submission.test.mjs
python scripts/build_system_inventory.py --write
python scripts/build_system_inventory.py --check
python -m pytest tests/spec_governance -q
docker build -t encuesta-docente:qa110 encuesta-docente
```

Configurar TMP/TEMP dentro del directorio temporal del checkout cuando el entorno lo requiera. Seguir el smoke aislado existente de `encuesta-docente/tests/container_smoke.py` sobre la nueva imagen, sin red y con /data temporal. Ampliar primero las pruebas de CRUD y migración; no dar por comprobada la función solo con las pruebas anteriores.

## Recorrido sintético

1. Crear muestras válidas de diagnóstico 4/5 y piloto en bases aisladas. Guardar originales y hashes antes de migrar; ejecutar migración dos veces y comprobar igualdad.
2. Entrar a cada panel; abrir una respuesta y descargar original. Comprobar formulario de registro del instrumento correcto.
3. Corregir una pregunta y un dato de identificación con motivo. Ver diferencias e historial. Comprobar original y firma sin cambios.
4. Probar número fuera de rango, opción no válida, dependencia incompleta, motivo vacío y versión sin contexto; no debe añadirse evento.
5. Abrir dos ediciones concurrentes: la segunda obsoleta falla sin sobrescribir. Reintentar un comando idéntico y comprobar una única revisión.
6. Eliminar de la lista con código, comprobar papelera e indicadores; restaurar y comprobar recuentos, sin recepción nueva.
7. Comparar CSV original y corregido: fuentes rotuladas, campos decodificados con su versión, sin contactos/firmas/motivos ni fórmulas ejecutables.
8. Sin sesión, con sesión de otro panel o sin CSRF/origen correcto, comprobar denegación y originales intactos.
9. Completar recorrido en 360/390 px y escritorio Chromium/WebKit; abrir teclado, guardar/cancelar, navegar foco e inspeccionar capturas sin datos reales.

## Entrega

Registrar resultados reales en tasks/quickstart al ejecutarlos. PR con issue #228 y aprobación de spec/plan; CI verde antes de fusionar. Producción solo desde main y con autorización de publicación: copia de ambas bases, imagen previa, huellas y conteos; comprobar salud y lecturas sin probar escrituras con respuestas reales. Consultar plan para reversión y bloqueo administrativo si se usa una imagen que desconoce la papelera.

## Evidencia local — 2026-10-21

- Python: 74 pruebas correctas (59 anteriores y 15 nuevas del CRUD). Incluyen migración repetida, originales/huellas intactos, permisos/CSRF/origen, piloto aislado, contexto 4.0/5.0, entradas inválidas, idempotencia incluso tras cambios posteriores, conflicto concurrente, fallo atómico y supresión explícita del custodio en base temporal.
- JavaScript: 4 pruebas de recepción correctas; comprobación sintáctica de app.js/admin.js/administration.js correcta.
- Carga sintética: informe de 100 respuestas con tres SELECT como máximo; sin consulta por respuesta. Lecturas de proyección mantienen una instantánea transaccional.
- Docker: imagen encuesta-docente:qa110 construida, recepción y CRUD ejecutados con SQLite temporal, /data tmpfs y --network none. No utiliza volúmenes ni claves productivas.
- Navegador local, Playwright CLI: diagnóstico y piloto completan corrección, retirada y restauración en Chromium y WebKit. Móvil 360/390 px y escritorio 1440 px; sin desbordamiento horizontal de página. Revisión de capturas en claro/oscuro y ventana 360×500 para escritura; no equivale a prueba física de teclado en iPhone.
- WebKit: pérdida sintética de confirmación después de escribir; reintento conserva exactamente el mismo comando y genera un solo evento. Chromium: cambio concurrente devuelve 409, conserva texto escrito y permite consultar la revisión nueva tras confirmación de descarte.
- Consola: únicamente 503/409 provocados por las pruebas de error; no se atribuyen a errores espontáneos de producción.
- Capturas locales ignoradas en output/playwright/: crud110-mobile-trash.png, crud110-desktop.png, crud110-pilot-mobile.png, crud110-pilot-mobile-dark.png, crud110-chromium-typing.png y crud110-chromium-pilot.png. Solo docentes ficticios.
- Revisión de convergencia: detectada y resuelta compatibilidad de manage.py delete con los eventos nuevos (T017). El panel no expone supresión definitiva ni altera firmas. Sin cambios académicos, modelos ni APIs de IA.
- Inventario técnico regenerado: 596 superficies, sin cambios de inventario académico. La app independiente se prueba por su workflow específico.
- Gobernanza completa local: 49 pruebas correctas e inventario vigente. Se añadió la nueva especificación al índice y a la lista explícita de especificaciones, sin retirar validaciones ni modificar controles de CI.

### Mapa de cobertura

| Requisito | Tareas | Evidencia |
|-----------|--------|-----------|
| FR-001 | T004, T005, T014 | Registro enlaza al formulario propio; consulta y acciones en ambos paneles |
| FR-002 | T002, T003, T013 | Comparación de recibos/huellas, migración y fallo atómico |
| FR-003 | T006, T008, T013 | Tipos, dependencias, versiones y campos protegidos |
| FR-004 | T002, T003, T006 | Actor, motivo, diferencias e historial |
| FR-005 | T009, T011, T017 | Papelera/restauración y compatibilidad de supresión de custodia |
| FR-006 | T003, T007, T008, T013 | Reintentos, concurrencia, error de red y conflicto UI |
| FR-007 | T010, T013 | Recibidas, activas, retiradas y versión sin activas |
| FR-008 | T007, T010, T013 | CSV separados sin contactos/firmas/motivos y escape de fórmulas |
| FR-009 | T002, T004, T007 | Autorización, CSRF, origen e instrumentos aislados |
| FR-010 | T005, T008, T011, T014 | Móvil/escritorio y controles accesibles |
| FR-011 | T012, T015, T016 | Software 5.1.0, instrumentos intactos, inventario y PR |

No se crearon, corrigieron, retiraron ni restauraron respuestas reales durante estas verificaciones. La recepción pública y los informes de producción no han sido modificados por este trabajo.

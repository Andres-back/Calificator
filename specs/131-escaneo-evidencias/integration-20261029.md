# Integración del escáner con el piloto vigente

## Alcance

Autorización de reanudación para integrar, comprobar y publicar CI de la rama131. No autoriza fusión, activación productiva, inferencias de pago ni modificación de notas/evidencias reales.

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

Se prepara la publicación de esta integración en `codex/131-escaneo-evidencias` y el despacho de `ci.yml` para su HEAD exacto. El resultado remoto no se anticipa como verde; se comprueba en GitHub. T049 mantiene pendiente el cierre de CI vigente. No se modifican ni omiten los controles de gobernanza.

Los pendientes T032/T033/T044/T047/T048 se conservan abiertos. Publicar rama y ejecutar CI de código no significa que exista un PR de entrega apto para fusionar ni que la función esté activada en producción. Solo hay confirmación humana general de Android; el usuario indicó que no dispone de iPhone por ahora.

# Especificación: Respaldo visual con Ollama Cloud

**Rama**: `codex/036-ollama-cloud-vision-fallback` | **Creada**: 2026-09-11 | **Estado**: Hotfix aprobado | **Issue**: [#74](https://github.com/Andres-back/Calificator/issues/74)

## Escenarios de usuario

### Historia 1 — Configurar respaldo visual real (P1)

Como administrador quiero seleccionar Ollama Cloud como respaldo de la extracción visual para que una calificación pueda continuar cuando OpenCode falle.

**Prueba independiente**: con OpenCode como principal y Ollama Cloud configurado, el selector permite elegir un modelo visual de Ollama y guardar la ruta.

1. **Dado** que Ollama Cloud tiene credencial y modelos visuales activos, **cuando** el administrador configura la extracción, **entonces** Ollama aparece como proveedor de respaldo.
2. **Dado** un modelo de texto, **cuando** se muestran opciones de respaldo visual, **entonces** ese modelo no aparece.

### Historia 2 — Recuperar una extracción fallida (P1)

Como docente quiero que la evidencia pase automáticamente a Ollama Cloud si OpenCode no puede leerla para no perder la solicitud ni dejar al estudiante indefinidamente en proceso.

**Prueba independiente**: al simular un fallo de OpenCode, Ollama recibe la misma evidencia, devuelve la extracción estructurada y el flujo continúa con una única calificación.

1. **Dado** un fallo técnico del proveedor principal, **cuando** existe respaldo configurado, **entonces** el sistema intenta Ollama según la política vigente y conserva el orden de páginas.
2. **Dado** que Ollama completa la extracción, **cuando** continúa la calificación, **entonces** se registra el proveedor y modelo usados y no se duplica el trabajo.
3. **Dado** que ambos proveedores fallan, **cuando** finaliza el intento, **entonces** la evidencia queda segura y la entrega pasa a error recuperable o revisión docente, nunca a nota cero automática.

### Casos límite

- El respaldo no se ejecuta si OpenCode produjo una extracción utilizable.
- Una credencial ausente o rechazada genera un error sanitizado y no aparece en registros.
- Los PDF multihoja y las fotografías rotadas conservan el procesamiento actual.
- Un modelo retirado del catálogo permanece identificado como no disponible hasta que el administrador elija otro.

## Requisitos funcionales

- **FR-001**: La extracción y calificación visual DEBEN admitir Ollama Cloud como proveedor secundario configurable.
- **FR-002**: Solo modelos activos con capacidad visual DEBEN poder seleccionarse.
- **FR-003**: El respaldo DEBE ejecutarse únicamente cuando el principal no produce una extracción utilizable.
- **FR-004**: La misma evidencia y contexto permitido DEBEN enviarse al respaldo sin incluir respuestas esperadas, soluciones ni rúbricas.
- **FR-005**: La extracción de respaldo DEBE conservar páginas, respuestas detectadas, confianza, alertas y necesidad de revisión.
- **FR-006**: La telemetría DEBE registrar proveedor, modelo, duración, resultado y uso de respaldo sin secretos ni contenido sensible.
- **FR-007**: Un reintento o respaldo NO DEBE crear otra entrega, calificación o entrada de cola.
- **FR-008**: El comportamiento actual de OpenCode DEBE permanecer sin cambios cuando responde correctamente.

## Criterios de éxito

- **SC-001**: El 100 % de los modelos visuales activos de Ollama Cloud aparece como opción de respaldo.
- **SC-002**: Una falla simulada de OpenCode se recupera mediante Ollama Cloud sin intervención del docente.
- **SC-003**: Cada ejecución produce como máximo una entrega, una calificación y un trabajo de cola.
- **SC-004**: Cero credenciales o contenido completo de evidencias aparece en logs o respuestas administrativas.
- **SC-005**: Las pruebas existentes de extracción con OpenCode continúan pasando sin modificaciones funcionales.

## Supuestos

- Se usa exclusivamente Ollama Cloud institucional mediante su dirección oficial; el conector local no participa en trabajos ejecutados por el VPS.
- OpenCode continúa como principal y Ollama Cloud es el respaldo elegido por el administrador.
- El modelo de Ollama seleccionado declara capacidad de visión en el catálogo sincronizado.


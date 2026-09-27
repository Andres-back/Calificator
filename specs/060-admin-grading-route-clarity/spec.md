# Hotfix: distinguir respaldo visual, verificador y árbitro

**Rama**: `codex/060-admin-grading-route-clarity` | **Fecha**: 2026-09-22 | **Issue**: [#119](https://github.com/Andres-back/Calificator/issues/119) | **PR**: [#120](https://github.com/Andres-back/Calificator/pull/120) | **Estado**: aprobado por el usuario para publicación

## Impacto y reproducción

En el panel `/app/admin/configuracion-ia`, la etapa «Extracción visual» muestra a Ollama Cloud como «respaldo». El profesor y el administrador pueden interpretar que Ollama revisa o arbitra las notas, aunque en producción esa contingencia solo lee la imagen si falla el modelo visual principal. Las etapas independientes «Verificación» y «Revisión adicional» están configuradas con GLM-5.3-Flash.

## Causa

La interfaz presenta cada ruta por separado, pero usa el término genérico «respaldo» sin identificar la etapa a la que pertenece. No hay error en los valores persistidos: el problema es de representación del flujo.

## Requisitos

- **FR-001**: El panel DEBE mostrar la ruta efectiva institucional de lectura visual, segundo evaluador y árbitro en un resumen distinto.
- **FR-002**: La alternativa de lectura visual DEBE describirse como contingencia de esa etapa y no como sustituto del verificador ni del árbitro.
- **FR-003**: El cambio NO DEBE modificar rutas de proveedor, credenciales, inferencias, notas ni APIs.
- **FR-004**: Una prueba de regresión DEBE cubrir una configuración con Ollama para extracción y GLM para verificación/arbitraje.

## Aceptación

Con la configuración descrita, el administrador identifica a GLM en las dos etapas de revisión y a Ollama únicamente bajo «Si falla la lectura visual». La prueba focal, tipos, lint y build terminan verdes. Producción se actualiza solo desde un PR fusionado con CI verde.

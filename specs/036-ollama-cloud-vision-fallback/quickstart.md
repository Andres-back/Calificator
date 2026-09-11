# Validación rápida

## Automatizada

1. Ejecutar pruebas focales del cliente Ollama, extractor visual, orquestador y centro administrativo.
2. Ejecutar tipos y lint del frontend.
3. Ejecutar gobernanza e inventario.

## Escenario funcional

1. Configurar una credencial institucional válida de Ollama Cloud.
2. Actualizar el catálogo y comprobar que aparecen modelos con capacidad `vision`.
3. Elegir OpenCode como principal y Ollama Cloud como respaldo en “Extracción visual”.
4. Guardar la configuración.
5. Enviar una evidencia con el principal disponible: debe observarse OpenCode y no usar respaldo.
6. Simular un fallo recuperable del principal en un entorno controlado: debe observarse Ollama, continuar la misma calificación y marcar el uso de respaldo.
7. Simular fallo doble: la evidencia debe quedar guardada y el trabajo debe terminar en error recuperable o revisión, sin nota cero automática.

## Evidencia local 2026-09-11

- Backend focal: 72 pruebas aprobadas.
- Frontend administrativo: 11 pruebas aprobadas.
- Ruff focal: sin hallazgos.
- TypeScript y ESLint: aprobados.
- Las llamadas de proveedor se simularon; la validación no consumió tokens ni envió evidencia real.

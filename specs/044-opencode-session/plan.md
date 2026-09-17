# Plan de hotfix 044

Issue #88. La pausa de aprobación del plan se omite conforme al proceso constitucional de hotfix; el usuario aprobó expresamente continuar, probar en producción y corregir la causa detectada.

## Investigación y decisión

La medición directa contra el endpoint configurado devolvió HTTP 400 con tipo `MissingSessionID` antes de ejecutar el modelo. La documentación de OpenCode Go exige un `User-Agent` propio y un `x-opencode-session` estable por conversación. Se descarta reducir tiempos de espera: cancelaría solicitudes válidas y no corrige el rechazo actual.

## Implementación y reversión

1. Centralizar la construcción de encabezados Chat Completions/Messages y generar una sesión opaca, estable por cliente u operación.
2. Integrar el contrato en calificación, extractor visual, enrutador de contenido/digitalización, catálogo y prueba administrativa.
3. Verificar ambos protocolos, estabilidad en reintentos y ausencia de datos de negocio dentro de la sesión.
4. Ejecutar pruebas focalizadas, Ruff/gobernanza aplicables y CI por PR.
5. Tras el merge, verificar contenedores saludables y repetir la medición autorizada sin persistir nota. Si supera 20 segundos, usar los tiempos por etapa para el siguiente ajuste; no degradar calidad ni omitir revisión silenciosamente.

Reversión: revertir el PR mediante otro PR. No interviene datos ni requiere migración.

## Constitución

Se preservan integridad de calificaciones, procesamiento recuperable, proveedores intercambiables, secretos fuera de logs y main protegida. La sesión se deriva por hash cuando existe un identificador técnico, evitando enviar dicho identificador o datos personales al proveedor. La propiedad funcional permanece en 008, 012, 020, 031, 034 y 035; 044 documenta únicamente el hotfix de integración.

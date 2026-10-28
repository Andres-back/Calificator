# Validación y activación

## Regresiones antes del PR

1. pytest del consumidor/worker: perfiles, revisiones, origen docente, falta de selección, HTTP410, lista vacía y JSON inválido; claves ficticias/transporte simulado.
2. PostgreSQL aislado: revisión, confirmación, permisos y datos sintéticos.
3. Vitest, tipos, lint/build y E2E del importador a360/1440; recuperación sin desbordamiento.
4. Inventario/gobernanza, suites y CI requeridos en HEAD del PR. Registrar resultados reales.

## Selección GLM después de integrar

No cambiar producción sobre el consumidor anterior: GLM no recibe su credencial en ese binario. No fusionar automáticamente este PR.

Tras autorización de fusión, CI verde y despliegue automático confirmado:

1. Conservar versión/configuración previas. En administración IA elegir únicamente **Importación de estudiantes → Lectura visual de lista escolar** (`importacion_estudiantes.extraccion`).
2. Principal OpenCode / `glm-5.3-flash`, activo/visual/comprobado. Conservar origen institucional y ausencia de respaldo actuales. No alterar otras funciones/proveedores/imágenes/embeddings.
3. Validar/publicar mediante operación administrativa versionada existente. Si hay conflicto releer, no sobrescribir. Comparar rutas ajenas; comprobar guardado y snapshot efectivo.
4. Verificar con una lista sintética sin confirmar cuentas. No enviar listas reales adicionales para pruebas.
5. No reintentar lotes antiguos automáticamente: fuente temporal eliminada. Profesor vuelve a subir la foto. Reversión versionada, sin presentar el modelo retirado como recuperación funcional.

## Resultados

Validación local del28-10-2026:

- RED del consumidor:7 regresiones fallaron con código previo y2 pruebas existentes pasaron; después12 pruebas pasan, sin red ni proveedor real.
- PostgreSQL16 aislado, migrado hasta `202610260001`:15 contratos de importación pasan. El nuevo caso de worker guarda categoría segura, mantiene eliminación temporal y no cambia contadores de usuarios/matrículas; repetición no ejecuta de nuevo la extracción.
- Frontend:1033 pruebas/167 archivos pasan;14 recorridos Chromium pasan, incluidos seis de fallo/recuperación a360/1440 y flujos existentes a360/390/768/1366/1920. Sin modificación de timeouts, reintentos ni aserciones previas.
- TypeScript y lint estricto pasan. Se corrigió `Object.hasOwn` por el equivalente compatible con el target existente, sin subir versión de JavaScript; build Vite pasa.
- Ruff con las mismas reglas de CI (`F401,F821,F822,F823,F841`) pasa. La ejecución amplia por defecto informó53 estilos previos ajenos; no se modificó código ajeno ni el workflow.
- Suite backend completa final:1542 pruebas pasan, sin red. Se montaron también fixtures raíz de scripts, frontend, nginx, compose y conector. Los intentos parciales anteriores tuvieron errores de archivos ausentes; se corrigió el montaje, sin omitir pruebas ni alterar aserciones. CI repite la suite con el checkout íntegro.
- PDF: pin compartido `fpdf2` actualizado a2.8.8 con autorización previa expresa;50 regresiones de exportación/documentos/render pasan además de la suite completa que usa esa versión. No se cambió el diseño de los documentos ni el contenido académico.
- Inventario regenerado:663 superficies. No cambian rutas/API ni esquema. Gobernanza y CI remoto se registran en el PR del commit final.

Analyze previo:8 requisitos cubiertos por8 tareas,100% de cobertura, sin contradicciones/ambigüedades bloqueantes;16/16 criterios documentales revisados. La incorporación de FR-009/T009 traslada únicamente la actualización PDF ya autorizada. Converge final contrasta9 FR,4 SC,6 aceptaciones y8 principios: sin brechas de construcción. No hay hooks de extensión. La publicación productiva y calidad OCR con docentes no se acreditan por estas pruebas. No se ha cambiado configuración ni estudiantes reales; GLM se publica solo después de integrar el consumidor corregido.

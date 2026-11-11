# Plan: Claude Console listo

Hotfix bajo propietario116, solicitado explícitamente en este chat el 2026-11-10. Sin migración ni nueva dependencia. React/TypeScript y FastAPI/httpx mantienen contratos vigentes.

1. Añadir tarjeta administrativa que recibe el snapshot vigente y usa prepareCompatibleConnection, probeCompatibleModel y publishAIControlCenter. Perfil fijo solo en este preset de interfaz; el calificador sigue configurable.
2. Deshabilitar con borradores pendientes y durante operación. Tras preparar, limpiar clave; conservar conexión preparada para un reintento sin duplicarla. Validar todos los resultados antes de publicar. Incluir solo valoración principal y mantener el resto del snapshot.
3. Ajustar prueba sintética Messages a presupuesto acotado suficiente, diagnosticar HTTP/errores de salida con mensajes controlados y corregir cursor nativo de Anthropic.
4. Regresiones simuladas de éxito, error y preservación; types/lint/build y pytest específicos; gobernanza y CI.
5. PR a main con CI verde; despliegue reproducible de componentes afectados y verificación de salud/activo público. No activar ruta sin clave y prueba válida.

## Riesgos

La selección se publica solo tras prueba; un 409 exige recargar. No se confunde HTTP200 con éxito semántico. Las pruebas reales del botón pueden consumir una pequeña cantidad del saldo, indicada en el panel. No se infiere calidad pedagógica de esta prueba.

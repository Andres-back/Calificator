# Investigación: Estabilización de evidencia y calidad backend

## Decisión 1: Restaurar el límite correcto entre rutas

**Decisión**: devolver el documento completo dentro de `get_entrega_evidencia` y mantener el render de páginas exclusivamente en `get_entrega_evidencia_page`.

**Justificación**: el bloque que construye la respuesta completa quedó después de un retorno de la segunda ruta, por lo que nunca se ejecuta. Reubicarlo restaura el contrato existente con el cambio mínimo.

**Alternativas consideradas**: redirigir siempre a la primera página fue descartado porque perdería páginas y rompería PDF/multihoja; crear una URL nueva fue descartado porque cambiaría el contrato público.

## Decisión 2: Mensaje de dominio estable

**Decisión**: definir una constante local reutilizable para el conflicto de validación de estructura.

**Justificación**: conserva la intención existente y evita que una rama excepcional dependa de un nombre ausente.

**Alternativas consideradas**: escribir el texto directamente en la excepción fue descartado porque dificulta probar y reutilizar el contrato.

## Decisión 3: Barrera estática incremental

**Decisión**: añadir al CI únicamente las reglas de Pyflakes para nombres indefinidos.

**Justificación**: detectan las regresiones funcionales observadas y permiten adoptar limpieza progresiva sin convertir un hotfix en una reescritura de estilo.

**Alternativas consideradas**: Ruff completo fue pospuesto por sus 79 hallazgos actuales; ignorar el análisis estático fue descartado porque las pruebas no cubrieron estas ramas.

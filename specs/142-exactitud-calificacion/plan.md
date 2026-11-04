# Plan aprobado: exactitud objetiva

Se implementa la primera entrega aprobada en el chat; se reutiliza la arquitectura multiagente y el desglose. No hay migración ni endpoint nuevo. Python 3.11, Decimal, pytest y dependencias existentes.

1. Una regla pura recibe blueprint y lecturas originales por hoja. Acepta los nombres normalizados del extractor y transcripciones numeradas online; no usa el diccionario legacy que elimina duplicados. El tipo de fuente limita lecturas a la modalidad declarada.
2. Resuelve ID/clave primero y número solo único; valida la clave sin asociarla por posición. Inspecciona todas las observaciones, marca doble/corrección/ilegibilidad/parcial. Para foto exige legibilidad explícita, páginas positivas y confianza finita >=0,85; es un umbral conservador sin calibración real y no prueba certeza.
3. Emite resoluciones privadas `objective_resolution_v1` por clave, con resultado verdadero/falso/nulo, causa, páginas y referencia comprobada. Para selección múltiple admite A–D (o texto unívoco entre opciones); para V/F, una sola afirmación normalizada.
4. El consenso consume esas resoluciones antes de A/B, pero mantiene disputas del verificador y dibujos dudosos como pendientes. Las preguntas ajenas a esta regla siguen igual. El desglose y su fórmula existente son autoridad; no se agrega una segunda nota.
5. Gate desactivado por defecto y efectivo solo si está activo el desglose. La ruta previa no cambia sin gate. Los checkpoints, colas, tiempos, modelos, credenciales y autorización siguen sus contratos actuales.
6. Pruebas sintéticas del resolvedor, integración con consenso/orquestador y comparación offline con lectura y valoraciones congeladas. La comparación real y el estudio ciego de abiertas se describen como protocolo futuro; no se ejecutan ni habilitan sin nueva autorización.

**Constitución**: no se amplían permisos ni acceso público; se preserva integridad, trazabilidad, asincronía y aislamiento. No hay bypass, activación ni despliegue. Documentar la discrepancia global/desglose sin inventar causas.

# Modelo de datos

- **Plan**: schema_version1, modo total/tipo/sección/bloques, grupos con ID/título/claves canónicas/presupuesto/valores fijados. Cobertura exacta sin duplicados; suma igual a escala. Reglas del blueprint/snapshot, compiladas a máximos por pregunta.
- **Contexto**: `evaluacion_contenido_versiones`; revisión enlazada y hash verificable. Primera referencia antigua marcada `legacy_baseline`/`estado_observado`, nunca original certificado.
- **Propuesta**: calificacion_id, versión/fecha/estado esperados, fingerprint de definición/nota, anterior/propuesta o motivo de exclusión; es de lectura, no autorización persistente.
- **Recibo**: UUID de solicitud, evaluación/actor, hash de parámetros, versiones y resultados por nota. Único por actor/UUID; consulta privada. No contiene claves de acceso ni fotos.
- **Auditoría**: nuevo desglose/ajuste con referencias anteriores/nuevas, componentes/valoraciones originales, contexto previo/nuevo de entrega y motivo «Reparto de puntos confirmado por el docente». Historial antiguo inmutable.

UI: edición→guardado/error; previsualización→confirmación→aplicación→recibo con éxitos/exclusiones/fallos. Cambio de cuenta/evaluación cancela resultados tardíos. Migración aditiva sin recalcular datos existentes.

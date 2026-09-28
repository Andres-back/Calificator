# Investigación

## Causa

`GradingUploadPanel` limpiaba las hojas y mostraba un mensaje de éxito, pero recibía siempre la matrícula completa. La invalidación de revisión tampoco cambiaba esa entrada porque el selector no consultaba calificaciones existentes.

## Decisión

Reutilizar `GET /evaluaciones/{id}/calificaciones` mientras el modo de carga está abierto y excluir sus `estudiante_id`. Añadir una exclusión optimista cuando la carga termina para cubrir el tiempo entre la respuesta y el refresco de React Query.

## Alternativas descartadas

- **Ocultar solo en memoria**: el estudiante reaparecería al recargar.
- **Usar solo la página visible de revisión**: una matrícula paginada dejaría candidatos ya calificados fuera de esa página.
- **Crear otro endpoint**: duplica un contrato que ya entrega las calificaciones requeridas.


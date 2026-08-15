# Modelo de datos documental

## Superficie

Representa un elemento activo extraído del código.

Campos:
- id: clave canónica estable.
- kind: endpoint, frontend_route, frontend_call, table, job o integration.
- source_path y source_line: ubicación relativa verificable.
- signature: método/ruta, patrón frontend, tabla, tarea o integración.
- owner_spec: especificación responsable única.
- actors: roles observables; puede incluir ambiguous.
- authorization: guardas o dependencias detectadas.
- states: estados relevantes observables.
- tests: evidencias de prueba relacionadas.
- coverage: covered o missing.
- consumers: dominios consumidores sin propiedad.
- details: atributos propios del tipo, ordenados.

Identidad:
- endpoint: backend:METHOD:/path/normalizado.
- frontend_route: frontend:/path/normalizado.
- frontend_call: frontend_call:METHOD:/path/normalizado:source.
- table: table:nombre.
- job: job:nombre_canonico.
- integration: integration:nombre.

## Regla de propiedad

Campos:
- spec: directorio NNN-slug existente.
- source_patterns: patrones relativos permitidos.
- signature_patterns: patrones opcionales.
- consumers: dominios consumidores opcionales.
- priority: desempate explícito; no permite dos propietarios finales.

Reglas:
- Cada superficie debe resolver exactamente un owner_spec.
- Una regla no puede apuntar a una spec inexistente.
- Una superficie compartida conserva un propietario y cero o más consumidores.

## Evidencia de cobertura

Campos:
- test_path: archivo de prueba relativo.
- reference: símbolo, ruta o dominio observado.
- level: unit, integration, e2e, governance o build.
- status: direct o domain.

Una superficie sin evidencia conserva coverage=missing; no desaparece del inventario.

## Override de permiso

Campos obligatorios:
- surface_id exacto.
- actors.
- reason.
- issue_url.

Reglas:
- Solo resuelve actors y authorization; nunca cambia propiedad, firma ni cobertura.
- Una superficie inexistente o un actor desconocido invalida el override.
- La ausencia de override mantiene actors=[ambiguous].
## Excepción

Campos obligatorios:
- id.
- surface_id o pattern acotado.
- reason.
- owner.
- issue_url.
- closure_criteria.

Estados:
- active: aceptada temporalmente y todavía válida.
- expired: criterio o issue inválido; hace fallar la validación.
- resolved: debe retirarse junto con la deuda resuelta.

## Hallazgo

Campos:
- id.
- severity: critical, high, medium o low.
- category: authorization_mismatch, orphan_candidate, missing_coverage, duplicate o contract_mismatch.
- surface_ids.
- description.
- issue_url opcional durante borrador y obligatorio para critical/high antes de aprobación.

## Inventario

Campos:
- schema_version.
- source_digest: huella de fuentes permitidas, independiente de rutas absolutas.
- counts por tipo y cobertura.
- surfaces ordenadas por id.
- findings ordenados por id.
- exceptions ordenadas por id.
- permission_overrides ordenados por surface_id.

No contiene timestamps, secretos, datos estudiantiles ni valores de configuración.
# Feature Specification: Comprobación de embeddings institucionales

**Feature Branch**: `codex/086-embedding-admin-check`
**Created**: 2026-10-06
**Status**: Aprobada como hotfix por el usuario («corrigelo»)
**Input**: Corregir el aviso incorrecto del panel administrador sobre Ollama embeddings.
**Issue**: #178

## Contexto del incidente

El servicio institucional respondió correctamente en producción con texto sintético, pero el panel lo trata como un proveedor desconocido o sin configurar. El diagnóstico no debe confundirse con la configuración de Ollama Cloud.

## User Scenarios & Testing

### User Story 1 - Comprobar el servicio real (Priority: P1)

El administrador comprueba los embeddings institucionales y obtiene un resultado comprensible, no una solicitud de credenciales de nube.

**Why this priority**: Un falso aviso induce cambios innecesarios en un sistema estable.
**Independent Test**: Probar con texto ficticio; verificar éxito únicamente ante un vector válido.
**Acceptance Scenarios**:

1. **Given** un servicio institucional operativo, **When** el administrador pulsa probar, **Then** ve éxito y latencia medida sin necesitar una clave.
2. **Given** servicio desconectado, lento o respuesta incompatible, **When** se prueba, **Then** ve error claro, no un éxito aparente.
3. **Given** un docente, estudiante o usuario sin sesión, **When** intenta la comprobación administrativa, **Then** se conserva la denegación de acceso.

### User Story 2 - Interpretar el estado del panel (Priority: P2)

El administrador distingue un servicio interno sin clave de un proveedor de nube pendiente de configuración y distingue configuración de comprobación exitosa.

**Why this priority**: El estado visible debe representar lo observado, no inferir disponibilidad de una credencial.
**Independent Test**: Renderizar la tarjeta en estados sin probar, probado y fallido, con y sin clave para proveedores de nube.
**Acceptance Scenarios**:

1. **Given** el proveedor interno activo y sin prueba reciente, **When** se muestra, **Then** se identifica como interno sin exigir clave ni afirmar conexión comprobada.
2. **Given** una prueba exitosa, **When** se actualiza la tarjeta, **Then** muestra conexión comprobada; una prueba fallida muestra error.
3. **Given** un proveedor de nube sin clave, **When** se muestra o prueba, **Then** conserva la necesidad de credenciales.

### Edge Cases

- Modelo no instalado, dimensiones incorrectas, lista vacía o valores vectoriales no finitos.
- Proveedor desconocido devuelve un error estructurado.
- El diagnóstico usa texto sintético fijo; no indexa ni modifica información académica.
- No se introduce sondeo automático de inferencia ni cambios de modelo/respaldo.

## Requirements

### Functional Requirements

- **FR-001**: Reconocer el servicio institucional al comprobarlo desde administración.
- **FR-002**: Confirmar éxito solo mediante un embedding válido del modelo institucional solicitado o configurado, con dimensión compatible; medir latencia.
- **FR-003**: Mostrar errores comprensibles de conexión, espera y respuesta incompatible sin divulgar secretos, vectores o contenido educativo.
- **FR-004**: Distinguir servicio interno sin clave, nube sin configurar y conexión comprobada; no inferir éxito de la mera configuración.
- **FR-005**: Mantener permisos administrativos y el comportamiento de proveedores de nube y pruebas de credenciales docentes.
- **FR-006**: No modificar notas, evidencias, embeddings guardados, rutas efectivas ni configuración al probar; añadir regresiones del fallo.

### Key Entities

- **Proveedor institucional**: modelo y dirección definidos por despliegue/configuración institucional, sin credenciales de nube.
- **Resultado de comprobación**: estado, latencia, código y mensaje seguro; no es una nueva entidad persistente.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Todos los casos simulados de vector válido son exitosos y todos los casos de vector incompatible o proveedor desconocido son fallidos.
- **SC-002**: La tarjeta distingue sin comprobar, conexión comprobada y error, además de configuración interna o de nube.
- **SC-003**: Todas las regresiones de permisos y proveedores existentes pasan; no se producen escrituras académicas en la comprobación.

## Assumptions

- Alcance aprobado por el usuario tras el diagnóstico en producción; hotfix sin pausa adicional del plan.
- Se reutilizan modelo, tiempo de espera y dimensiones institucionales existentes; no se promete una nueva velocidad.
- La responsabilidad del panel/proveedores sigue en `021-configuracion-ia-docente` (delegada por 012); este documento registra la corrección puntual.

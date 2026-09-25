# Research: Aislar y organizar el flujo del estudiante

## Decision 1: conservar permisos de lectura compartidos

**Decision**: Mantener los permisos predeterminados `grading.read`, `resources.read`, `presentations.read` y `dba.read` del estudiante.

**Rationale**: El backend ya usa esos permisos junto con matrícula, publicación y propiedad para consultar notas o contenido legítimo. Retirarlos rompería flujos correctos y mezclaría autorización de datos con selección de interfaz.

**Alternatives considered**: retirar los permisos al estudiante, con riesgo de romper boletín y contenido publicado; o crear permisos nuevos y migrar roles, desproporcionado para este hotfix.

## Decision 2: distinguir estudiante estándar de rol personalizado

**Decision**: Tratar como estudiante estándar únicamente al usuario cuyo rol base es estudiante y no tiene rol personalizado activo.

**Rationale**: El administrador puede asignar módulos mediante roles personalizados. Esa decisión explícita debe prevalecer sobre la plantilla base, mientras los permisos predeterminados no deben abrir herramientas docentes.

**Alternatives considered**: bloquear siempre por rol base, que anula roles personalizados; o autorizar solo por permiso, que reproduce el defecto actual.

## Decision 3: doble condición para superficies docentes

**Decision**: Las bibliotecas y espacios de trabajo docentes exigen un perfil elevado/personalizado y el permiso específico existente.

**Rationale**: La clasificación de perfil elimina falsos positivos; el permiso conserva la granularidad del panel administrativo.

**Alternatives considered**: guardas rígidos profesor/admin, incompatibles con roles personalizados; o comprobaciones duplicadas en cada página, propensas a divergencia.

## Decision 4: Presentaciones tendrá variante estudiantil

**Decision**: Mantener la lectura de presentaciones publicadas para estudiantes matriculados, pero cambiar encabezados, estados vacíos y acciones a lenguaje estudiantil.

**Rationale**: El servicio filtra contenido publicado por matrícula; bloquear la ruta eliminaría una capacidad legítima. El problema es la interfaz editorial, no la lectura publicada.

**Alternatives considered**: bloquear Presentaciones por completo o duplicar endpoint y página.

## Decision 5: pruebas con permisos reales

**Decision**: Las regresiones usarán el conjunto de permisos predeterminado observado en producción y cubrirán estudiante estándar, profesor y rol personalizado.

**Rationale**: Las pruebas existentes omitían permisos en el usuario simulado, por lo que no reprodujeron Calificar ni DBA.

**Alternatives considered**: probar solo etiquetas del sidebar o depender únicamente de E2E.


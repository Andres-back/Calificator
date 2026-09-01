# Especificación: Usuarios, roles y permisos modulares

**Rama**: codex/029-roles-permisos-modulares | **Creada**: 2026-08-30 | **Estado**: Especificación y plan aprobados | **Issue**: #59

## Clarifications

### Session 2026-08-30

- Q: ¿Los roles personalizados deben respetar un perfil base o pueden combinar capacidades de profesor, estudiante y administración? → A: Pueden combinar libremente capacidades de los tres perfiles, incluidas funciones administrativas.
- Q: ¿Debe existir un Administrador principal protegido para otorgar permisos críticos? → A: Sí. Debe permanecer al menos un Administrador principal protegido; los administradores delegados no pueden elevarse ni conceder permisos que no poseen.

## Escenarios de usuario y pruebas

### Historia 1 - Crear roles por funciones (Prioridad: P1)

Como administrador quiero crear un rol con nombre, descripción y funciones seleccionables para adaptar responsabilidades sin modificar código.

**Prueba independiente**: El administrador crea “Auxiliar académico”, habilita recursos y presentaciones, guarda y comprueba un resumen exacto de lo autorizado.

**Aceptación**:
1. **Dado** un nombre único, **cuando** el administrador selecciona módulos y acciones, **entonces** el rol queda disponible para asignación.
2. **Dado** un rol existente, **cuando** se modifican permisos, **entonces** las nuevas operaciones usan la versión vigente y las retiradas dejan de autorizarse.
3. **Dado** un rol sin asignaciones, **cuando** se archiva, **entonces** deja de aparecer para usuarios nuevos y conserva auditoría.

### Historia 2 - Gestionar usuarios completamente (Prioridad: P1)

Como administrador quiero crear, editar, desactivar y eliminar usuarios, además de asignarles un rol, desde una sola pantalla.

**Prueba independiente**: Se crea una cuenta, se cambia su nombre, correo, estado y rol; luego se desactiva o elimina respetando sus relaciones académicas.

**Aceptación**:
1. **Dado** un correo disponible, **cuando** el administrador crea la cuenta, **entonces** aparece con el estado y rol elegidos.
2. **Dado** un usuario distinto del administrador actual, **cuando** se editan sus datos o acceso, **entonces** el cambio es visible, auditado y efectivo.
3. **Dado** un usuario con historial académico, **cuando** se solicita eliminar, **entonces** se retira su acceso y se preservan datos y referencias.
4. **Dado** un usuario sin relaciones de negocio, **cuando** se confirma la eliminación definitiva, **entonces** desaparece de la lista activa.

### Historia 3 - Navegar y operar según permisos (Prioridad: P1)

Como usuario quiero ver y usar solo los módulos y acciones que me asignaron, sin botones que fallen ni acceso directo a funciones restringidas.

**Prueba independiente**: Un usuario con presentaciones y sin calificación puede generar presentaciones, no ve calificación y el servidor rechaza una llamada directa a ese módulo.

**Aceptación**:
1. **Dado** un rol parcial, **cuando** el usuario inicia sesión, **entonces** menú, inicio, rutas y acciones reflejan sus permisos.
2. **Dado** un permiso ausente, **cuando** se intenta usar su ruta directamente, **entonces** el servidor rechaza antes de consultar o modificar información.
3. **Dado** un permiso retirado, **cuando** el usuario intenta guardar desde una pantalla ya abierta, **entonces** se rechaza la operación y se explica el cambio de acceso.

### Historia 4 - Comprender y auditar accesos (Prioridad: P2)

Como administrador quiero comprender qué permite un rol, quién lo usa y quién lo cambió para resolver configuraciones incorrectas.

**Prueba independiente**: El detalle del rol muestra módulos, acciones, usuarios asignados e historial administrativo sin secretos.

**Aceptación**:
1. **Dado** un rol, **cuando** se abre su detalle, **entonces** se ven permisos agrupados, estado y usuarios asignados.
2. **Dado** un cambio, **cuando** se guarda, **entonces** se registra actor, fecha, objetivo y naturaleza del cambio.

### Casos límite

- Debe permanecer al menos un Administrador principal activo.
- El administrador no puede eliminar su cuenta ni retirarse sus privilegios desde esta pantalla.
- Un usuario que administra roles no puede otorgar permisos que él mismo no posee ni aprobar una elevación sobre su propia cuenta.
- Los roles del sistema se consultan, pero no se eliminan ni convierten en personalizados.
- Los nombres de roles son únicos ignorando mayúsculas y espacios exteriores.
- Un rol asignado se archiva o reasigna antes de poder eliminarse definitivamente.
- Dos ediciones concurrentes del mismo rol no se mezclan silenciosamente.
- Desactivar un usuario invalida sus sesiones vigentes.
- Usuarios con materias, entregas, calificaciones o auditoría no se eliminan físicamente.

## Requisitos

### Requisitos funcionales

- **FR-001**: El administrador DEBE poder listar, buscar y filtrar usuarios por estado, perfil operativo y rol personalizado.
- **FR-002**: El administrador DEBE poder crear usuarios con nombre, correo, contraseña inicial, estado, perfil operativo y rol.
- **FR-003**: El administrador DEBE poder editar los datos, contraseña, estado, perfil y rol de otro usuario.
- **FR-004**: La eliminación definitiva DEBE limitarse a cuentas sin relaciones de negocio; las demás se desactivan preservando trazabilidad.
- **FR-005**: El sistema DEBE proteger al último administrador activo y la cuenta del administrador que realiza la operación.
- **FR-006**: El administrador DEBE poder crear, consultar, editar, duplicar y archivar roles personalizados.
- **FR-007**: Un rol DEBE incluir nombre, descripción, estado, versión y permisos seleccionados; el perfil operativo pertenece al usuario y no limita la combinación del rol.
- **FR-008**: Cada usuario DEBE tener como máximo un rol personalizado activo, además de su perfil operativo.
- **FR-009**: La matriz DEBE incluir como mínimo usuarios, configuración administrativa, materias, DBA, asistencia, evaluaciones, recursos, presentaciones, entregas, calificación, boletín, reportes y Xali.
- **FR-010**: Los permisos DEBEN distinguir consultar, crear, editar, eliminar, asignar, publicar y calificar donde cada acción exista.
- **FR-011**: Cada módulo DEBE permitir seleccionar todas sus acciones o elegirlas individualmente y explicar dependencias.
- **FR-012**: Los roles personalizados DEBEN poder combinar funciones de profesor, estudiante y administración, manteniendo las reglas de propiedad y contexto de cada operación.
- **FR-013**: El backend DEBE validar cada permiso y el frontend DEBE reflejar la misma decisión sin sustituir esa validación.
- **FR-014**: Los permisos modulares NO DEBEN omitir las reglas de propiedad de materias, entregas, evidencias o calificaciones.
- **FR-015**: Cambiar rol, permisos, contraseña o estado DEBE invalidar autorizaciones anteriores del usuario.
- **FR-016**: Toda creación, edición, asignación, retiro, archivo o eliminación DEBE quedar auditada.
- **FR-017**: La gestión DEBE mostrar estados de carga, vacío, éxito, error y confirmación destructiva.
- **FR-018**: La pantalla DEBE funcionar desde 360 px, con teclado, objetivos táctiles y modos claro y oscuro.
- **FR-019**: Los perfiles actuales DEBEN conservar sus recorridos existentes sin reasignación manual.
- **FR-020**: Antes de guardar un rol, la interfaz DEBE resumir el menú y las capacidades resultantes.
- **FR-021**: Ningún administrador delegado DEBE poder otorgar permisos que no posee, modificar su propia asignación privilegiada ni usar una cadena de roles para elevarse indirectamente.
- **FR-022**: El sistema DEBE conservar al menos un Administrador principal activo, protegido frente a edición o retiro mediante roles personalizados y con autoridad exclusiva para otorgar o retirar permisos administrativos críticos.
- **FR-023**: Los administradores delegados DEBEN poder gestionar únicamente usuarios, roles y permisos dentro del alcance que ya poseen.

### Entidades clave

- **Perfil operativo**: Naturaleza estable del usuario en relaciones académicas: administrador, profesor o estudiante; no limita por sí solo los módulos concedidos por un rol personalizado.
- **Rol personalizado**: Conjunto administrable y versionado de permisos que puede combinar funciones académicas y administrativas.
- **Permiso**: Capacidad controlada, identificada por módulo y acción y descrita de forma legible.
- **Asignación**: Relación vigente entre un usuario y un rol personalizado con actor y fechas.
- **Usuario**: Cuenta existente con perfil, estado, historial y rol personalizado opcional.
- **Evento de auditoría**: Registro del cambio administrativo sin contraseñas ni secretos.
- **Administrador principal**: Autoridad protegida que conserva el control de permisos críticos, recuperación administrativa y designación de otros administradores principales.

## Criterios de éxito

- **SC-001**: Un administrador crea y asigna un rol en menos de tres minutos sin asistencia técnica.
- **SC-002**: El 100 % de operaciones incluidas en la matriz tiene una comprobación permitida y otra denegada.
- **SC-003**: Un permiso retirado deja de autorizar en la siguiente interacción del usuario.
- **SC-004**: Ningún dato académico ni evento de auditoría queda huérfano durante migración o retiro de usuarios.
- **SC-005**: Los tres perfiles actuales conservan sus recorridos aprobados.
- **SC-006**: La gestión funciona sin desbordamiento en 360×800, 390×844, 768×1024 y escritorio.
- **SC-007**: Un administrador identifica en menos de 30 segundos por qué un usuario tiene o no una función.

## Supuestos

- Los permisos provienen de un catálogo controlado; no se crean identificadores técnicos arbitrarios.
- Cada cuenta conserva un perfil operativo para mantener propiedad de datos y relaciones académicas, aunque su rol personalizado pueda añadir módulos de otros perfiles.
- Sin rol personalizado, el usuario conserva el comportamiento completo de su perfil actual.
- Eliminar prioriza desactivar cuando existen datos relacionados.
- La primera versión no incluye permisos por horario, sede, materia concreta o estudiante concreto.

## Inventario técnico

Las rutas, tablas, componentes y pruebas bajo responsabilidad de esta función se
mantienen en el [inventario generado](./inventory.md), enlazado al inventario
global para detectar superficies sin propietario o desajustes de autorización.

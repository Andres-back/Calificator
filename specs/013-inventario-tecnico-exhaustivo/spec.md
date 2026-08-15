# Especificación: Inventario técnico exhaustivo

**Rama**: codex/013-inventario-tecnico-exhaustivo | **Creada**: 2026-08-14 | **Estado**: En revisión | **Issue**: #15

## Escenarios de usuario y pruebas

### Historia 1 - Encontrar al propietario de cualquier superficie (Prioridad: P1)

Como mantenedor, necesito localizar cada endpoint, ruta frontend, tabla y trabajo activo en una única especificación responsable para evaluar cambios sin revisar todo el repositorio.

**Razón de prioridad**: La trazabilidad incompleta permite modificar contratos sensibles sin actualizar su documentación ni sus pruebas.

**Prueba independiente**: Al seleccionar cualquier superficie activa del sistema, el inventario muestra su dominio propietario, permisos, estados relacionados y evidencia de prueba, o una excepción explícita pendiente de resolver.

**Aceptación**:
1. **Dado** un endpoint registrado, **cuando** se consulta el inventario, **entonces** aparece una sola especificación propietaria y sus actores autorizados.
2. **Dada** una ruta frontend protegida, **cuando** se consulta el inventario, **entonces** aparecen su guarda de acceso, vista y cliente de datos relacionado.
3. **Dada** una tabla o trabajo activo, **cuando** se consulta el inventario, **entonces** aparecen su ciclo de vida, dominio y pruebas conocidas.

### Historia 2 - Detectar deriva documental (Prioridad: P1)

Como revisor, necesito que los cambios estructurales no documentados sean detectados antes del merge para impedir que el inventario vuelva a quedar desactualizado.

**Prueba independiente**: Una superficie activa añadida, eliminada o movida sin actualizar su propiedad hace fallar el control de gobernanza con un mensaje accionable.

**Aceptación**:
1. **Dado** un cambio que agrega una superficie activa, **cuando** se ejecuta la validación, **entonces** falla si no existe una asignación documental única.
2. **Dado** un inventario sin diferencias frente al sistema vigente, **cuando** se ejecuta la validación, **entonces** finaliza correctamente sin modificar archivos.

### Historia 3 - Revisar inconsistencias sin alterar producción (Prioridad: P2)

Como responsable del producto, necesito separar los hallazgos documentales de las correcciones funcionales para proteger los flujos de calificación ya operativos.

**Prueba independiente**: Cada contradicción detectada queda registrada como hallazgo enlazable y esta iniciativa no cambia contratos públicos, datos ni comportamiento del producto.

**Aceptación**:
1. **Dada** una diferencia entre permisos visuales y permisos efectivos, **cuando** se documenta, **entonces** queda marcada como inconsistencia y no se corrige silenciosamente.
2. **Dada** una superficie aparentemente huérfana, **cuando** no puede demostrarse que esté inactiva, **entonces** permanece inventariada hasta que un cambio posterior apruebe su retiro.

### Casos límite

- Una misma URL con varios métodos se registra como superficies distintas.
- Las rutas parametrizadas se normalizan sin perder sus parámetros ni confundirlas con rutas literales.
- Los routers o pantallas no alcanzables se registran como candidatos a código muerto, no se eliminan.
- Las tablas históricas presentes solo en migraciones se distinguen de las tablas activas del modelo actual.
- Los permisos del frontend y backend se registran por separado cuando no coinciden.
- Las pruebas parametrizadas o compartidas pueden respaldar varias superficies, pero cada relación debe ser explícita.
- Los archivos generados, credenciales, datos estudiantiles y valores de producción quedan fuera del inventario.
- Un fallo durante la generación conserva íntegros los artefactos válidos anteriores.
- Un permiso no concluyente no se convierte automáticamente en acceso permitido.

## Requisitos

### Requisitos funcionales

- **FR-001**: El inventario DEBE incluir el 100 % de endpoints registrados, identificados por método y patrón de ruta.
- **FR-002**: Cada endpoint DEBE indicar módulo propietario, actores permitidos y mecanismo efectivo de autorización observable.
- **FR-003**: El inventario DEBE incluir el 100 % de rutas frontend registradas con su vista, guarda de autenticación y restricción de rol.
- **FR-004**: Cada cliente o familia de llamadas frontend DEBE vincularse con el dominio y contrato backend que consume.
- **FR-005**: El inventario DEBE incluir tablas y modelos activos, relaciones, restricciones de identidad y estados de ciclo de vida relevantes.
- **FR-006**: El inventario DEBE incluir trabajos asíncronos activos, disparadores, estados terminales, reintentos y efectos que deben ser idempotentes.
- **FR-007**: Cada superficie DEBE pertenecer a una sola especificación responsable; las dependencias compartidas deben conservar propietario y consumidores diferenciados.
- **FR-008**: Cada superficie DEBE enlazar pruebas existentes o declarar explícitamente que no tiene cobertura conocida.
- **FR-009**: La validación DEBE detectar superficies nuevas, eliminadas, duplicadas o sin propietario y producir mensajes accionables.
- **FR-010**: Las excepciones DEBEN incluir justificación, responsable, issue y criterio verificable de cierre.
- **FR-011**: Los hallazgos de permisos, contratos o código aparentemente muerto DEBEN registrarse para corrección posterior sin modificar silenciosamente el comportamiento vigente.
- **FR-012**: El inventario y su validación NO DEBEN leer secretos, datos productivos ni evidencias estudiantiles.
- **FR-013**: La generación repetida sobre el mismo commit DEBE producir contenido equivalente y no crear cambios espurios.
- **FR-014**: Las once especificaciones funcionales 002–012 DEBEN enlazar su vista de dominio; 001 y specs/README.md DEBEN enlazar el inventario global.
- **FR-015**: Si la extracción, validación o escritura falla, la operación NO DEBE reemplazar artefactos válidos ni dejar salidas parciales.
- **FR-016**: Todo permiso que el análisis estático no pueda resolver DEBE permanecer ambiguo o usar un override explícito con superficie, actores, justificación e issue.

### Entidades clave

- **Superficie técnica**: elemento activo identificable —endpoint, ruta, llamada, tabla, trabajo o integración— con clave canónica y propietario único.
- **Asignación de propiedad**: relación entre una superficie y una especificación responsable, con consumidores opcionales.
- **Permiso efectivo**: actor y condición de acceso observables independientemente en servidor e interfaz.
- **Evidencia de cobertura**: prueba o verificación existente relacionada con una superficie.
- **Override de permiso**: resolución humana de un permiso ambiguo con superficie, actores, justificación e issue.
- **Excepción de inventario**: desviación temporal justificada, responsable y enlazada a un issue.
- **Hallazgo**: contradicción o posible código muerto que requiere una iniciativa posterior.

## Criterios de éxito

- **SC-001**: El 100 % de endpoints, rutas frontend, tablas y trabajos activos tiene una única especificación responsable o una excepción válida.
- **SC-002**: Dos ejecuciones consecutivas sobre el mismo commit producen cero diferencias documentales.
- **SC-003**: Una superficie de prueba añadida sin propietario es detectada en menos de dos minutos y el mensaje identifica la corrección necesaria.
- **SC-004**: El 100 % de superficies inventariadas indica cobertura existente o ausencia explícita de cobertura.
- **SC-005**: Ninguna prueba de aceptación requiere acceso a producción, credenciales ni datos de estudiantes.
- **SC-006**: Todos los hallazgos críticos de autorización o integridad quedan asociados a un issue antes de aprobar el inventario.

## Supuestos

- Se considera activa una superficie registrada o importada por el arranque vigente de la aplicación, por el router frontend, por los modelos actuales o por los workers configurados.
- El código no alcanzable se conserva como candidato a retiro hasta demostrar que carece de consumidores.
- El inventario se deriva del código versionado y se complementa con decisiones humanas para permisos ambiguos y excepciones.
- Esta iniciativa documenta y valida; las correcciones funcionales tendrán especificaciones, ramas y PR propios.
- Las doce especificaciones existentes mantienen sus identificadores y pasan a enlazar el inventario detallado de su dominio.
# Especificación: Higiene incremental del backend

**Rama**: `codex/038-backend-hygiene` | **Creada**: 2026-09-11 | **Estado**: Aprobada | **Issue**: #78

## Escenarios de usuario y pruebas

### Historia 1 - Conservar el comportamiento mientras se limpia (Prioridad: P1)

Como docente o estudiante, necesito que la limpieza interna no cambie ningún recorrido funcional para seguir creando, entregando y calificando sin regresiones.

**Razón de prioridad**: la versión actual es estable y la limpieza solo aporta valor si preserva todos sus contratos.

**Prueba independiente**: los controles funcionales existentes terminan con los mismos resultados antes y después de retirar símbolos sin uso.

**Aceptación**:
1. **Dado** un flujo vigente, **cuando** se instala la versión limpia, **entonces** conserva las mismas rutas, respuestas y permisos.
2. **Dado** un proceso de calificación o IA, **cuando** se ejecuta después del mantenimiento, **entonces** su selección, persistencia y resultado no cambian por esta intervención.

### Historia 2 - Eliminar residuos comprobables (Prioridad: P1)

Como responsable de mantenimiento, necesito retirar imports y variables que una comprobación estática demuestra que no se usan para reducir ruido y evitar falsas dependencias.

**Razón de prioridad**: los residuos dificultan entender qué necesita realmente cada módulo y vuelven más riesgosos los cambios posteriores.

**Prueba independiente**: la comprobación de símbolos sin uso encuentra cero casos en el backend y sus pruebas.

**Aceptación**:
1. **Dado** el conjunto de hallazgos actual, **cuando** termina la limpieza, **entonces** no queda ninguno sin resolver o justificar explícitamente.
2. **Dado** un import necesario solo por efectos de inicialización, **cuando** se revisa el hallazgo, **entonces** se conserva y documenta en lugar de eliminarlo automáticamente.

### Historia 3 - Impedir que vuelva el residuo (Prioridad: P2)

Como responsable del proyecto, necesito que la integración continua rechace nuevos imports y variables sin uso para mantener el beneficio en cambios futuros.

**Razón de prioridad**: una limpieza puntual se pierde rápidamente si no existe una barrera automática.

**Prueba independiente**: el control acepta el estado limpio y rechaza una muestra aislada con un símbolo sin uso.

**Aceptación**:
1. **Dado** un cambio limpio, **cuando** se ejecuta el control obligatorio, **entonces** puede avanzar a las pruebas.
2. **Dado** un cambio con un símbolo sin uso, **cuando** se ejecuta el control obligatorio, **entonces** se detiene antes de fusionarse.

### Casos límite

- Un import puede existir para registrar modelos, rutas o plugins; no se elimina sin comprobar que carece de efecto de inicialización.
- Una variable aparentemente sin uso puede representar validación o consumo deliberado; se simplifica únicamente si el comportamiento permanece equivalente.
- Los avisos de estilo, complejidad o formato quedan fuera de esta fase.
- Los módulos grandes se documentan como deuda posterior, pero no se dividen dentro de esta limpieza.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE conservar rutas, contratos, permisos y esquemas existentes.
- **FR-002**: El mantenimiento NO DEBE cambiar selección de modelos, ejecución de trabajos ni cálculo o publicación de calificaciones.
- **FR-003**: Cada import y variable reportado como no usado DEBE eliminarse o conservarse con una justificación verificable.
- **FR-004**: La comprobación de calidad DEBE terminar sin hallazgos de imports o variables sin uso en el backend y sus pruebas.
- **FR-005**: La integración continua DEBE rechazar nuevos imports o variables sin uso antes de permitir la fusión.
- **FR-006**: La intervención NO DEBE eliminar tablas, endpoints, archivos funcionales ni realizar migraciones.
- **FR-007**: El inventario técnico y la documentación viva DEBEN permanecer sincronizados con el código.
- **FR-008**: La división de módulos grandes DEBE quedar explícitamente fuera de este cambio y realizarse posteriormente por límites funcionales.

## Criterios de éxito

- **SC-001**: El 100 % de los 22 hallazgos iniciales queda resuelto o justificado sin alterar comportamiento.
- **SC-002**: El 100 % de las pruebas backend aplicables continúa aprobado.
- **SC-003**: La comprobación automática detecta una muestra aislada con un símbolo sin uso y acepta el árbol limpio.
- **SC-004**: El cambio introduce cero rutas, migraciones, tablas o modificaciones de contratos públicos.

## Supuestos

- El informe estático de 22 hallazgos es la línea base de esta intervención.
- Los controles funcionales existentes representan el comportamiento que se debe preservar.
- La autorización “sigue” confirma continuar con esta fase progresiva y acotada.
- La extracción de dominios desde los módulos de más de mil líneas será una especificación posterior.

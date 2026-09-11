# Especificación: Catálogo dinámico de modelos IA

**Rama**: `codex/035-modelos-dinamicos-api` | **Creada**: 2026-09-10 | **Estado**: Hotfix aprobado | **Issue**: [#72](https://github.com/Andres-back/Calificator/issues/72)

## Escenarios de usuario

### Historia 1 — Ver todos los modelos disponibles (P1)

Como administrador quiero actualizar el catálogo desde cada proveedor configurado para seleccionar modelos nuevos sin esperar un despliegue.

**Prueba independiente**: al actualizar un proveedor, los modelos devueltos por su cuenta aparecen en los selectores compatibles y los retirados quedan identificados como no disponibles.

1. **Dado** un proveedor con credencial válida, **cuando** el administrador actualiza modelos, **entonces** el catálogo refleja la respuesta vigente sin exponer la clave.
2. **Dado** un modelo nuevo, **cuando** termina la actualización, **entonces** aparece sin recargar toda la aplicación.
3. **Dado** un fallo del proveedor, **cuando** se intenta actualizar, **entonces** el catálogo anterior se conserva y se muestra un error entendible.

### Historia 2 — Actualizar después de cambiar una clave (P2)

Como administrador quiero que guardar una credencial consulte inmediatamente el catálogo de ese proveedor para no trabajar con una lista anterior.

1. **Dado** que se reemplaza una clave, **cuando** se guarda correctamente, **entonces** se intenta sincronizar su catálogo y se informa el resultado por separado.
2. **Dado** que una etapa admite varios proveedores, **cuando** se elige respaldo, **entonces** se puede escoger cualquier API configurada con un modelo compatible.

### Casos límite

- Respuestas duplicadas, vacías o con formatos parcialmente distintos se normalizan sin duplicar opciones.
- Los modelos seleccionados que desaparecen no se sustituyen silenciosamente; se muestran como no disponibles hasta que el administrador elija otro.
- Los proveedores internos sin API de catálogo no ofrecen un botón engañoso.
- Una sincronización fallida no desactiva modelos ni modifica rutas publicadas.

## Requisitos funcionales

- **FR-001**: El administrador DEBE poder sincronizar por separado cada proveedor externo compatible.
- **FR-002**: La sincronización DEBE usar la credencial y URL efectiva del proveedor sin devolver secretos al navegador.
- **FR-003**: La respuesta DEBE normalizar identificador, nombre, capacidades conocidas y contexto cuando esté disponible.
- **FR-004**: Los modelos descubiertos DEBEN aparecer en los selectores correspondientes inmediatamente.
- **FR-005**: Un fallo DEBE conservar íntegramente el último catálogo válido.
- **FR-006**: Guardar una credencial nueva DEBE iniciar la actualización de ese proveedor y distinguir ambos resultados.
- **FR-007**: Un modelo seleccionado pero ausente DEBE permanecer visible como no disponible, sin reemplazo automático.
- **FR-008**: Solo administradores autorizados DEBEN poder actualizar el catálogo institucional.
- **FR-009**: Los selectores de respaldo DEBEN ofrecer cualquier API activa, configurada y compatible que el ejecutor de esa etapa pueda consumir; no deben limitarse al proveedor principal ni a una lista estática.

## Criterios de éxito

- **SC-001**: El 100 % de los modelos devueltos por un proveedor compatible y utilizable aparece una sola vez tras actualizar.
- **SC-002**: El catálogo visible se actualiza en menos de 15 segundos en condiciones normales.
- **SC-003**: Cero claves o respuestas sensibles aparecen en logs, interfaz o contratos.
- **SC-004**: Un fallo de descubrimiento deja sin cambios el catálogo previo en el 100 % de los casos probados.
- **SC-005**: El 100 % de los proveedores alternativos compatibles y configurados aparece como opción de respaldo.

## Supuestos

- Los proveedores OpenAI-compatibles exponen un listado de modelos; Ollama conserva su conector especializado.
- Cuando el proveedor no declara capacidades, se infieren conservadoramente y el modelo queda disponible para texto por defecto.
- La publicación de rutas sigue siendo una acción separada y confirmada.

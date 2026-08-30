# Especificación: Pulido de navegación y presentaciones

**Rama**: `codex/028-pulir-navegacion-presentaciones`  
**Issue**: [#57](https://github.com/Andres-back/Calificator/issues/57)  
**Estado**: Aprobado  
**Fecha**: 2026-08-30

## Historias

### P1 — Presentaciones que realmente enseñan

Como docente quiero que cada diapositiva agregue una idea nueva y cumpla una función pedagógica distinta, para que la presentación explique el tema progresivamente en vez de repetirlo.

### P2 — Navegación sin redundancias

Como docente quiero un encabezado despejado y accesos únicos, para comprender rápidamente dónde crear recursos.

### P2 — Guía lateral legible

Como usuario quiero ver la mascota integrada limpiamente y poder abrir Xali desde la tarjeta, sin recortes ni fondos rectangulares.

## Requisitos

- **FR-001**: La barra superior docente NO DEBE mostrar `Crear recurso`; la acción existente en Recursos y Materias se conserva.
- **FR-002**: La tarjeta inferior DEBE usar una mascota transparente, preservar texto legible y abrir el destino contextual de Xali o configuración administrativa.
- **FR-003**: La tarjeta DEBE funcionar en claro, oscuro, escritorio y menú móvil sin desbordamiento.
- **FR-004**: El prompt de presentaciones DEBE exigir una pregunta de aprendizaje y conocimiento nuevo por diapositiva.
- **FR-005**: Concepto, explicación, ejemplo, proceso y comparación DEBEN tener funciones pedagógicas diferenciadas.
- **FR-006**: El control de calidad DEBE detectar bullets idénticos y explicaciones semánticamente casi equivalentes.
- **FR-007**: La secuencia determinística DEBE garantizar desarrollo conceptual entre apertura y actividad para presentaciones de seis o más diapositivas.
- **FR-008**: No se modificarán contratos, rutas de API, formatos PDF/PPTX, modelos persistentes ni proveedores.

## Éxito

- **SC-001**: No existe el enlace `Crear recurso` en el topbar docente.
- **SC-002**: La tarjeta de Xali no referencia las imágenes RGB con fondo blanco y tiene un destino real.
- **SC-003**: Un borrador con dos explicaciones parafraseadas equivalentes es rechazado por calidad.
- **SC-004**: Pruebas focalizadas frontend/backend, tipos, lint y build quedan verdes.

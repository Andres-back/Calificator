# Especificación: Capacidades correctas por etapa de IA

**Rama**: `codex/053-fix-ai-stage-capabilities` | **Creada**: 2026-09-20 | **Estado**: Aprobada como hotfix | **Issue**: [#105](https://github.com/Andres-back/Calificator/issues/105)

## Escenarios de usuario y pruebas

### Historia 1 - Selección correcta de modelos por función (Prioridad: P1)

Como administrador, quiero que cada etapa de IA anuncie su capacidad real para seleccionar únicamente modelos compatibles y evitar que una ruta visual aparezca como textual.

**Razón de prioridad**: Una capacidad incorrecta puede ocultar modelos válidos o permitir una selección incompatible en el panel administrativo.

**Prueba independiente**: Consultar la configuración efectiva después de actualizar una instalación existente y comprobar que extracción de calificación y digitalización son visuales, mientras la generación de imágenes de presentaciones figura como imagen.

**Aceptación**:

1. **Dada** una instalación existente con rutas granulares etiquetadas como texto, **cuando** se actualiza el sistema, **entonces** las dos rutas de extracción quedan etiquetadas como visión.
2. **Dada** la ruta de generación de imágenes de presentaciones, **cuando** se actualiza el sistema, **entonces** queda etiquetada como generación de imagen.
3. **Dada** una ruta con proveedor o modelo personalizado, **cuando** se corrige su capacidad, **entonces** se conservan proveedor, modelo, respaldo y credenciales configuradas.

### Casos límite

- La migración se ejecuta sobre una instalación donde una o varias capacidades ya son correctas.
- La ruta existe con un modelo elegido manualmente por el administrador.
- Una instalación no contiene todavía alguna de las rutas granulares.
- Se revierte el hotfix durante un rollback controlado.

## Requisitos

### Requisitos funcionales

- **FR-001**: La extracción visual de calificaciones DEBE identificarse como una capacidad de visión.
- **FR-002**: La extracción de evaluaciones digitalizadas DEBE identificarse como una capacidad de visión.
- **FR-003**: La generación de imágenes para presentaciones DEBE identificarse como una capacidad de imagen.
- **FR-004**: La corrección DEBE aplicarse a instalaciones existentes sin cambiar proveedor, modelo principal, respaldo ni permisos.
- **FR-005**: La corrección DEBE poder ejecutarse más de una vez sin producir cambios adicionales después del primer resultado correcto.
- **FR-006**: El sistema DEBE conservar la capacidad textual de verificación y revisión adicional de calificaciones.
- **FR-007**: Una prueba de regresión DEBE comprobar las tres capacidades corregidas y la reversibilidad del cambio.

### Entidades clave

- **Ruta de IA por función**: configuración que asocia una etapa del producto con su capacidad, proveedor y modelos.

## Criterios de éxito

- **SC-001**: El 100 % de las tres rutas afectadas muestra la capacidad esperada tras el despliegue.
- **SC-002**: Ninguna selección existente de proveedor o modelo cambia como consecuencia del hotfix.
- **SC-003**: El panel administrativo puede filtrar modelos compatibles con las tres etapas sin usar una etiqueta textual incorrecta.
- **SC-004**: Las pruebas de enrutamiento y migración aplicables permanecen verdes.

## Supuestos

- La capacidad es una propiedad contractual de la etapa y no una preferencia modificable por docente.
- Las rutas granulares ya existen en producción; si falta alguna, el hotfix no crea una configuración incompleta y el sembrado normal podrá crearla correctamente.
- No cambian las APIs, la nota, el procesamiento asíncrono ni los modelos actualmente seleccionados.

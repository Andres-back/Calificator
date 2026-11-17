# Especificación: Quitar lo que estorba en Crear material, Analítica y Xali

**Rama**: `codex/190-pantallas-claras` | **Creada**: 2026-11-14 | **Estado**: Aprobada e implementada | **Issue**: [#400](https://github.com/Andres-back/Calificator/issues/400)

**Entrada**: segunda entrega de la revisión visual de todos los flujos que pidió el usuario (ver Spec 189).

## Evidencia (capturas en 390 px y 1440 px)

| Pantalla | Hallazgo |
| --- | --- |
| Crear material | Bloque «Modelo de negocio · Ciclo completo del docente» con 8 tarjetas que no hacen nada; el paso 1 queda fuera de la primera pantalla. |
| Analítica | Tarjeta «Ahorro observado» vacía y tarjeta «Tiempo docente observado» sin datos; «Dashboard docente», «Métricas operativas», «Coincidencia docente–IA»; pie de 10 px con «línea base de 3 min». |
| Analítica en celular | La tabla de evaluaciones sale letra por letra; estados en bruto («borrador»). |
| Xali en celular | Con el chat vacío, la página baja al final: el saludo queda arriba, fuera de la vista. |

## Escenarios de usuario y pruebas

### Historia 1 - Ver primero lo que sirve (Prioridad: P1)

**Aceptación**:
1. **Cuando** abro Crear material, **entonces** el primer paso aparece arriba, sin el bloque de modelo de negocio.
2. **Dado** que no hay mediciones de tiempo, **entonces** Analítica no muestra tarjetas vacías; con mediciones, muestra «Tiempo ahorrado» y «Tiempo que te ahorra la IA».
3. **En celular**, cada evaluación reciente es una tarjeta con entregas, por revisar, publicadas, promedio y aprobados, y el estado traducido.
4. **Cuando** abro Xali sin conversación, **entonces** veo el saludo y las sugerencias sin desplazarme.

## Requisitos

### Requisitos funcionales

- **FR-001**: Crear material NO DEBE mostrar el bloque «Modelo de negocio».
- **FR-002**: Analítica DEBE ocultar las métricas de tiempo sin mediciones y usar lenguaje llano («Resumen de mis clases», «Coincidiste con la IA», «Por revisar»).
- **FR-003**: En celular, las evaluaciones recientes DEBEN mostrarse como tarjetas legibles con el estado traducido.
- **FR-004**: Xali NO DEBE desplazarse al final cuando no hay mensajes.

## Criterios de éxito

- **SC-001**: En 390 px, el contenido principal de las tres pantallas se ve sin desplazarse ni leer jerga.
- **SC-002**: Las pruebas existentes siguen pasando.

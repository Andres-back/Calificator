# Especificación: Nota con un decimal y redondeo consistente en todas las vistas

**Rama**: `codex/145-nota-un-decimal` | **Creada**: 2026-11-04 | **Estado**: Aprobada (spec y plan aprobados por el usuario el 2026-11-04) | **Issue**: [#310](https://github.com/Andres-back/Calificator/issues/310)

**Entrada**: hallazgo A3 de la revisión del frontend de `main` (2026-11-04). La misma nota se ve distinta según la pantalla: el docente ve 2.95 y el estudiante 3.0, y algunos valores se redondean al revés (1.15 se ve 1.1). El docente responsable definió la regla en el chat de revisión: 1 decimal, la mitad sube, y el empate exacto en el umbral de aprobación lo decide el docente.

Esta spec es la **primera de tres** entregas pequeñas: unifica cómo se **muestra** la nota. La regla al confirmar (backend) y la pregunta al docente en el empate van en specs posteriores.

## Escenarios de usuario y pruebas

### Historia 1 - Ver la misma nota en todas partes (Prioridad: P1)

Como docente y como estudiante, quiero ver la misma cifra de nota en la revisión, el boletín, el resultado de la evaluación, el panel del estudiante y Xali, para no tener dudas sobre cuál es la nota real.

**Razón de prioridad**: hoy un estudiante puede ver 3.0 (aprobado) mientras el docente ve 2.95, y hay valores que se redondean hacia abajo cuando deberían subir. Es un problema de confianza en la nota.

**Prueba independiente**: con las notas 2.94, 2.96, 3.45 y 1.15 sobre 5, y 8.05 sobre 10, cada vista muestra 2.9, 3.0, 3.5, 1.2 y 8.1 respectivamente.

**Aceptación**:
1. **Dado** una nota con dos decimales, **cuando** se muestra en cualquier vista de nota final, **entonces** aparece con un decimal, redondeando la mitad hacia arriba de forma exacta.
2. **Dado** la misma calificación, **cuando** la ven el docente y el estudiante, **entonces** ambos ven exactamente la misma cifra.

### Historia 2 - No anticipar la decisión del docente en el empate (Prioridad: P1)

Como docente, quiero que una nota que cae exactamente en el empate del umbral de aprobación (2.95 sobre 5) no se muestre redondeada a 3.0 ni a 2.9 mientras yo no decida, para que el sistema no apruebe ni repruebe por mí.

**Razón de prioridad**: es la regla acordada. Redondear automáticamente ese caso decidiría por el docente si el estudiante aprueba.

**Prueba independiente**: una nota de 2.95 sobre 5 se muestra "2.95" a docente y estudiante; 5.95 sobre 10 se muestra "5.95"; 2.95 sobre 10 se muestra "3.0" porque no es el empate de esa escala.

**Aceptación**:
1. **Dado** una nota igual al umbral de aprobación menos 0.05 (60 % de la nota máxima), **cuando** se muestra, **entonces** conserva sus dos decimales.
2. **Dado** una nota en cualquier otro valor, **cuando** se muestra, **entonces** se aplica la regla de un decimal sin excepción.

### Casos límite

- Nota máxima con una cifra decimal (por ejemplo 4.5): el umbral es 60 % de la nota máxima, llevado a un decimal con la misma regla (2.7), y el empate es 2.65.
- Si no se conoce la nota máxima en esa vista, se aplica la regla de un decimal sin detectar empate, y se documenta qué vistas están en ese caso.
- Notas enteras se muestran con un decimal (3 → 3.0), igual que hoy.
- Sin nota (pendiente o calificando) se conserva el texto actual ("—", "Calificando").
- Las vistas de **cálculo y auditoría** (fórmula de la nota, historial de versiones, editor de puntajes, nota anterior al reprocesar, comparación de calificadores) conservan dos decimales: muestran el cálculo, no la nota final.

## Requisitos

### Requisitos funcionales

- **FR-001**: Toda vista de nota final DEBE mostrar la nota con un decimal, redondeando la mitad hacia arriba de forma exacta (sin el error de la aritmética binaria).
- **FR-002**: La nota que cae exactamente en el empate del umbral de aprobación (umbral − 0.05, con umbral = 60 % de la nota máxima llevado a un decimal) DEBE mostrarse con dos decimales.
- **FR-003**: Docente y estudiante DEBEN ver la misma cifra para la misma calificación.
- **FR-004**: La nota máxima mostrada junto a la nota ("de 5.0") DEBE seguir la misma presentación de un decimal.
- **FR-005**: Las vistas de cálculo y auditoría DEBEN conservar su presentación actual de dos decimales.
- **FR-006**: DEBEN existir pruebas que fijen la presentación de los valores de SC-002 y que fallen con la presentación anterior.

### Entidades clave

- **Nota mostrada**: representación de una calificación para lectura humana. No cambia el valor guardado ni su precisión de dos decimales.

## Criterios de éxito

- **SC-001**: 0 diferencias entre la cifra que ve el docente y la que ve el estudiante para la misma calificación.
- **SC-002**: En escala 5, los valores 2.94, 2.95, 2.96, 3.45 y 1.15 se muestran como 2.9, 2.95, 3.0, 3.5 y 1.2; en escala 10, 8.05, 5.95 y 2.95 se muestran como 8.1, 5.95 y 3.0, en todas las vistas de nota final.
- **SC-003**: Ninguna vista de nota final decide por el docente el empate del umbral.

## Supuestos

- El umbral de aprobación es el 60 % de la nota máxima (decisión del docente responsable).
- Solo se cambia la presentación en el frontend. El valor guardado, la confirmación y la analítica no cambian en esta spec; una nota confirmada en 2.95 seguirá mostrándose 2.95 hasta que exista la pregunta al docente (spec posterior).
- Los promedios del curso en analítica y panel no son notas de un estudiante y no se cambian aquí.

## Añade, reutiliza y retira

| Área | Qué añade | Qué reutiliza | Qué texto o control retira/reubica |
| --- | --- | --- | --- |
| Presentación de notas | Una regla única de un decimal con excepción del empate | La función existente de presentación de notas del docente, que se corrige | Retira los redondeos sueltos de cada pantalla. Ningún control. |

## Evidencia visual requerida

No se requiere maqueta ni capturas: no cambia la jerarquía, los textos ni los controles, solo la cifra mostrada. Las pruebas comparan el texto exacto de la nota en cada vista, que es la evidencia verificable.

# Especificación: Suma verificable como nota sugerida

**Rama**: `codex/051-nota-desglose`
**Creada**: 2026-09-19
**Estado**: Aprobada
**Issue**: [#101](https://github.com/Andres-back/Calificator/issues/101)
**Entrada**: Cuando cada respuesta tiene un puntaje verificable, la nota mostrada debe ser la suma real; una respuesta incorrecta no puede coexistir con una nota global que ignore su descuento.

## Escenarios de usuario y pruebas

### Historia 1 - Ver la nota que corresponde al desglose (Prioridad: P1)

Como docente, quiero que la nota sugerida coincida con la suma de los puntajes por pregunta para entender y defender el resultado.

**Por qué esta prioridad**: Una diferencia entre la explicación y la nota final rompe la confianza y la trazabilidad de la calificación asistida.

**Prueba independiente**: Procesar una evaluación cuya nota global sea 4,95 pero cuyos componentes completos sumen 4,67 y comprobar que la sugerencia visible sea 4,67.

**Escenarios de aceptación**:

1. **Dado** un desglose completo con una respuesta incorrecta, **cuando** se calcula la nota, **entonces** la nota sugerida coincide exactamente con la fórmula del desglose.
2. **Dada** una nota global distinta de la suma completa, **cuando** finaliza la calificación, **entonces** la suma prevalece y ambas cifras quedan trazables.
3. **Dada** una nota sugerida con dos decimales significativos, **cuando** el docente la revisa, **entonces** la interfaz no la redondea visualmente hasta convertirla en otra nota.

### Historia 2 - Conservar decisiones docentes y casos incompletos (Prioridad: P2)

Como docente, quiero que el ajuste automático solo afecte sugerencias completas y no cambie notas que ya confirmé o publiqué.

**Por qué esta prioridad**: La fórmula debe mejorar la integridad sin sustituir decisiones humanas ni inventar puntos ausentes.

**Prueba independiente**: Comparar una sugerencia completa, una incompleta y una nota confirmada; solo la sugerencia completa adopta la suma verificable.

**Escenarios de aceptación**:

1. **Dado** un desglose con componentes pendientes o sin puntaje, **cuando** finaliza el proceso, **entonces** no se presenta la suma parcial como nota definitiva y el caso requiere revisión.
2. **Dada** una nota confirmada, ajustada o publicada, **cuando** se despliega el hotfix, **entonces** esa decisión docente no cambia.
3. **Dadas** sugerencias históricas todavía no confirmadas con desglose completo, **cuando** se actualiza el sistema, **entonces** se alinean con su suma verificable.

### Casos límite

- Una evaluación sin desglose mantiene el comportamiento compatible anterior.
- Un desglose sin puntos posibles no produce una nota autoritativa.
- Una calificación manual conserva la nota establecida por el docente.
- Una diferencia de precisión se compara usando la regla de redondeo del desglose.
- Un reintento conserva la idempotencia y no duplica versiones.

## Requisitos

### Requisitos funcionales

- **FR-001**: Un desglose automático completo, sin bloqueos y con puntajes válidos DEBE ser la fuente autoritativa de la nota sugerida.
- **FR-002**: La nota global propuesta por un modelo NO DEBE reemplazar la suma verificable de componentes completos.
- **FR-003**: Cuando las cifras difieran, el sistema DEBE registrar la nota global, la nota calculada y la diferencia para auditoría.
- **FR-004**: Un desglose incompleto, inconsistente o bloqueado NO DEBE presentarse como suma final y DEBE conservar la revisión requerida.
- **FR-005**: Las notas confirmadas, ajustadas, publicadas o manuales NO DEBEN modificarse automáticamente.
- **FR-006**: La revisión docente DEBE mostrar precisión suficiente para distinguir 4,67 de 4,95 o 5,0.
- **FR-007**: Las sugerencias históricas no confirmadas con desglose activo completo DEBEN alinearse de forma segura con ese desglose.
- **FR-008**: La corrección DEBE conservar compatibilidad con calificaciones sin desglose y reintentos existentes.

### Entidades clave

- **Nota sugerida**: Resultado provisional que el docente revisa antes de confirmar.
- **Desglose activo**: Versión vigente de los puntajes por pregunta y su fórmula verificable.
- **Discrepancia de agregación**: Diferencia auditable entre la cifra global del modelo y la suma determinista.

## Criterios de éxito

### Resultados medibles

- **SC-001**: El 100 % de desgloses completos produce una nota sugerida igual a su fórmula después del redondeo definido.
- **SC-002**: El caso 4,95 global frente a 4,67 desglosado muestra y confirma 4,67.
- **SC-003**: Ninguna nota confirmada o publicada cambia durante la actualización.
- **SC-004**: El 100 % de discrepancias queda identificable con las dos cifras de origen.
- **SC-005**: Calificaciones heredadas sin desglose continúan disponibles y sin errores.

## Supuestos

- Los puntos de componentes ya se validan contra su máximo y la cobertura determina si la fórmula está completa.
- La IA propone la valoración; la suma aritmética no requiere otra llamada de IA.
- Confirmar y publicar siguen siendo decisiones explícitas del docente.
- El hotfix corrige sugerencias pendientes, nunca decisiones humanas finalizadas.

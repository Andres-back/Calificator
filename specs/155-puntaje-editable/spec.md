# Especificación: El docente puede escribir el puntaje de una pregunta al revisar

**Rama**: `codex/155-puntaje-editable` | **Creada**: 2026-11-06 | **Estado**: Aprobada | **Issue**: [#327](https://github.com/Andres-back/Calificator/issues/327)

**Entrada**: al agregar una pregunta a una evaluación digitalizada no se podía cambiar su puntaje: en celular no aparecía el teclado. El usuario pidió un flujo fácil para docentes con poca experiencia técnica, sin afectar notas ni resultados actuales.

## Escenarios de usuario y pruebas

### Historia 1 - Escribir el puntaje (Prioridad: P1)

Como docente, quiero escribir el valor de una pregunta en una evaluación sin entregas, para terminar de revisarla sin pasos adicionales.

**Prueba independiente**: abrir una evaluación guardada sin entregas a 360 px, agregar una pregunta, tocar su puntaje, escribir `0,5` y guardar.

**Aceptación**:
1. **Dada** una evaluación sin entregas, **cuando** toco el puntaje, **entonces** puedo escribirlo y en celular aparece el teclado numérico con separador decimal.
2. **Dado** un valor con coma o con punto, **cuando** lo escribo, **entonces** se interpreta igual.
3. **Dado** un campo vacío, cero o inválido, **cuando** lo dejo así, **entonces** se explica el error y no se guarda ese valor.

### Historia 2 - Ver la suma y corregirla con un toque (Prioridad: P1)

Como docente, quiero ver si los puntos coinciden con la nota máxima y ajustarlos sin calcular, para no descubrir el problema al publicar.

**Prueba independiente**: con 5 preguntas que suman 5 sobre 5, agregar una sexta de 1 punto, ver que sobra 1, tocar "Ajustar las demás" y comprobar que suma 5 y que la sexta sigue valiendo 1.

**Aceptación**:
1. **Dada** cualquier suma, **cuando** reviso una pregunta, **entonces** veo la suma, la nota máxima y cuánto sobra o falta.
2. **Dada** una suma distinta, **cuando** toco "Ajustar las demás", **entonces** la pregunta abierta conserva su valor y las demás cambian en proporción hasta sumar exactamente la nota máxima.
3. **Dado** un valor que no deja puntos para las demás, **cuando** intento ajustar, **entonces** se explica por qué no es posible y nada cambia.
4. **Dado** un ajuste, **cuando** todavía no guardo, **entonces** nada se ha guardado en el servidor.

### Historia 3 - Las notas siguen protegidas (Prioridad: P1)

Como docente, quiero que una evaluación con entregas no cambie sus puntos por accidente, para no alterar notas ya dadas.

**Prueba independiente**: abrir una evaluación con entregas y comprobar que el puntaje sigue de solo lectura, con "Repartir puntos" y un mensaje claro.

**Aceptación**:
1. **Dada** una evaluación con al menos una entrega, **cuando** la abro, **entonces** el puntaje sigue de solo lectura y explica que se cambia con "Repartir puntos".
2. **Dada** esa evaluación y una pregunta nueva, **cuando** la suma no coincide, **entonces** se explica que para añadir preguntas conviene usar una copia.
3. **Dado** que todavía no se sabe si hay entregas, o la consulta falló, **cuando** reviso, **entonces** el puntaje sigue de solo lectura.

### Casos límite

- La evaluación recibe una entrega mientras se edita: el servidor conserva sus protecciones actuales.
- Evaluación con reparto por secciones: sus puntos siguen cambiándose en ese editor.
- Evaluación nueva, todavía sin guardar: el puntaje ya era editable; gana la suma y el ajuste.
- Una sola pregunta: "Ajustar las demás" no aplica; se explica que su valor debe ser la nota máxima.

## Requisitos

### Requisitos funcionales

- **FR-001**: El puntaje DEBE poder escribirse en evaluaciones sin entregas, también en las ya publicadas.
- **FR-002**: El campo DEBE abrir teclado numérico con decimal en celular y aceptar coma o punto.
- **FR-003**: Un valor vacío, cero o inválido NO DEBE guardarse y DEBE explicarse.
- **FR-004**: El editor DEBE mostrar la suma, la nota máxima y la diferencia.
- **FR-005**: "Ajustar las demás" DEBE conservar la pregunta abierta y dejar la suma exactamente igual a la nota máxima, sin guardar en el servidor.
- **FR-006**: Con entregas, o sin confirmar que no las hay, el puntaje DEBE seguir de solo lectura con la explicación.
- **FR-007**: El reparto de puntos DEBE informar si la evaluación tiene entregas. Esa información NO DEBE llegar a estudiantes.
- **FR-008**: NO DEBEN cambiar notas, entregas, versiones ni la regla de publicación.

### Entidades clave

- Sin tablas ni migraciones. Solo se añade un dato calculado a la lectura del reparto.

## Criterios de éxito

- **SC-001**: A 360 px, un docente agrega una pregunta, escribe su puntaje y deja la suma correcta sin salir del editor.
- **SC-002**: En evaluaciones con entregas, el recorrido no produce ningún cambio en notas ni en puntajes.

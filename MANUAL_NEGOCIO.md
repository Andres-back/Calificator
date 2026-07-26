# XCalificator — Manual de Negocio

> **Proyecto de investigación** — Institución Educativa San Agustín, Mocoa, Putumayo  
> Versión 1.1 · Contexto: Colombia, educación básica y media · Idioma del sistema: español  
> Enfoque: plataforma docente con IA para planear, crear, evaluar, calificar, retroalimentar, reforzar y reportar.

---

## 1. Propósito del manual

Este manual define las reglas de negocio, actores, conceptos, flujos y comportamientos esperados de **XCalificator**. Debe usarse como guía para desarrollo, pruebas, documentación funcional y toma de decisiones del producto.

XCalificator no es solamente una herramienta para calificar. Es una plataforma educativa que acompaña al docente durante el ciclo completo de enseñanza:

```txt
Planear → Crear material → Asignar → Resolver → Calificar → Retroalimentar → Reforzar → Reportar
```

**Principio fundamental:**

> La IA sugiere. El docente decide. Siempre.

Ninguna nota, retroalimentación final, reporte académico o boletín debe entregarse al estudiante sin revisión y confirmación del docente cuando se trate de una actividad evaluable.

---

## 2. Visión de negocio

XCalificator busca reducir el tiempo de trabajo docente y mejorar el seguimiento académico mediante:

- Creación de materias con matrícula por código.
- Generación de evaluaciones alineadas a DBA, criterios y metas del profesor.
- Resolución de evaluaciones en modalidad **online**, **física** o **mixta**.
- Calificación asistida por IA usando visión multimodal, RAG y rúbricas.
- Generación de materiales didácticos imprimibles y resolubles online.
- Retroalimentación individual y grupal.
- Planes de refuerzo basados en resultados reales.
- Reportes para docente, estudiante, acudiente e impacto de tesis.

La propuesta de valor central es:

> XCalificator se adapta a la realidad del aula: permite trabajar con estudiantes conectados, estudiantes sin dispositivos, evaluaciones en papel, actividades interactivas y materiales imprimibles.

---

## 3. Actores del sistema

### 3.1 Administrador

Responsable de la operación general del sistema.

Funciones:

- Configurar claves globales de IA: OpenAI, Cloudflare, Groq, Open Code, Ollama y Presenton.
- Importar y mantener el catálogo de DBA.
- Gestionar usuarios, roles y permisos.
- Visualizar métricas globales de uso.
- Revisar logs de errores, consumo de IA y fallbacks.
- Configurar límites generales de generación, almacenamiento y uso.

### 3.2 Profesor

Actor principal del sistema.

Funciones:

- Crear materias.
- Compartir códigos de matrícula.
- Aprobar o retirar estudiantes de una materia.
- Crear evaluaciones nativas, externas o sorpresa.
- Seleccionar DBA, criterios, metas y nota máxima.
- Generar materiales didácticos.
- Asignar materiales como práctica o evaluación.
- Calificar entregas online, físicas o mixtas.
- Revisar, confirmar o ajustar notas sugeridas por IA.
- Consultar reportes y boletines.
- Generar planes de refuerzo.

### 3.3 Estudiante

Usuario que participa en las materias y resuelve actividades.

Funciones:

- Unirse a materias mediante código de matrícula.
- Resolver evaluaciones online.
- Subir archivos, capturas o fotos cuando la actividad lo permita.
- Realizar actividades interactivas: sopa de letras, crucigrama, emparejar, unir columnas, fichas, cuentos con preguntas, etc.
- Consultar calificaciones confirmadas.
- Recibir retroalimentación del docente.
- Chatear con Xali sobre evaluaciones ya calificadas por el docente. Xali le muestra al estudiante cómo debió resolverlo, lo guía paso a paso, señala el error y cómo abordarlo correctamente, pero nunca le entrega la respuesta resuelta. El objetivo es que el estudiante entienda su error y aprenda a resolverlo por sí mismo.

### 3.4 Acudiente o padre de familia (opcional futuro)

Actor de consulta.

Funciones posibles:

- Ver reportes autorizados por la institución.
- Recibir informes de progreso.
- Consultar recomendaciones de acompañamiento.

---

## 4. Conceptos clave del negocio

### 4.1 Materia

La materia es el contenedor principal del sistema. Conecta:

```txt
Profesor → Estudiantes → Contenidos → Evaluaciones → Actividades → Calificaciones → Reportes
```

Cada materia tiene:

- Nombre.
- Área.
- Grado.
- Profesor responsable.
- Código único de matrícula.
- Estado.
- Estudiantes matriculados.
- Evaluaciones y materiales asociados.

Ejemplo:

```txt
Materia: Matemáticas 5A
Área: Matemáticas
Grado: 5
Código: MAT-5A-X7K2
Profesor: Carlos Pérez
```

### 4.2 Código de matrícula

Cuando un profesor crea una materia, el sistema genera un código único que se comparte con los estudiantes.

Flujo:

```txt
Profesor crea materia
↓
Sistema genera código
↓
Profesor comparte código
↓
Estudiante ingresa código
↓
Sistema matricula al estudiante
↓
La materia aparece en el panel del estudiante
```

Reglas:

- El código debe ser único.
- El profesor puede regenerarlo.
- El código anterior queda inválido si se regenera.
- Un estudiante no puede tener dos matrículas activas en la misma materia.
- Si la materia requiere aprobación, el estudiante queda pendiente hasta que el profesor confirme.

### 4.3 DBA

Los DBA son Derechos Básicos de Aprendizaje. En XCalificator sirven para alinear evaluaciones, materiales, retroalimentaciones y planes de refuerzo.

Cada DBA debe tener:

- Área.
- Grado.
- Código.
- Descripción.
- Fuente.
- Estado activo/inactivo.

Los DBA pueden usarse en:

- Evaluaciones.
- Rúbricas.
- Guías de clase.
- Talleres.
- Presentaciones.
- Actividades online.
- Planes de refuerzo.
- Reportes de desempeño.

### 4.4 RAG pedagógico

RAG significa Retrieval-Augmented Generation. En XCalificator es la base de conocimiento que permite que la IA no responda ni califique de manera genérica.

Fuentes del RAG:

- DBA.
- Contenido de clase.
- Guías generadas.
- Presentaciones generadas.
- Evaluaciones anteriores.
- Rúbricas.
- Criterios del docente.
- Respuestas esperadas.
- Feedback anterior.
- Errores comunes.
- Materiales didácticos asociados a la materia.

Uso del RAG:

```txt
Materia + DBA + metas + criterios + contenido previo
↓
RAG recupera contexto relevante
↓
LLM genera o califica con contexto pedagógico
```

Regla:

> Toda generación o calificación importante debe usar contexto de la materia cuando exista.

---

## 5. Evaluaciones

### 5.1 Definición

Una evaluación es un instrumento que mide el aprendizaje del estudiante. Puede resolverse online, en físico o en modalidad mixta.

Una evaluación siempre pertenece a una materia.

Debe tener como mínimo:

- Materia.
- Nombre.
- Tipo de origen.
- Modalidad de resolución.
- Nota máxima.
- DBA o competencias asociadas.
- Criterios de evaluación.
- Estado.

### 5.2 Tipos de origen de evaluación

| Tipo | Descripción | Contexto disponible | Precisión esperada |
|---|---|---|---|
| `nativa` | El profesor la crea dentro de XCalificator. | Alto: preguntas, DBA, criterios, respuestas esperadas. | Alta |
| `externa_digitalizada` | El profesor sube una foto/PDF de una evaluación hecha fuera del sistema. | Medio-alto: visión reconstruye estructura y docente valida. | Media-alta |
| `sorpresa` | Evaluación rápida creada en clase con información mínima. | Medio: materia, DBA, criterios y nota máxima. | Media |

### 5.3 Modalidades de resolución

| Modalidad | Descripción | Quién responde | Quién sube evidencia |
|---|---|---|---|
| `online` | El estudiante responde en la plataforma. | Estudiante | Estudiante |
| `fisica` | El estudiante responde en papel. | Estudiante | Docente o estudiante, según configuración |
| `mixta` | Algunas preguntas se responden online y otras en físico. | Estudiante | Estudiante/docente |

### 5.4 Evaluación online

La evaluación online permite que el estudiante resuelva directamente en la plataforma.

Puede incluir:

- Preguntas de selección múltiple.
- Verdadero/falso.
- Respuesta corta.
- Respuesta abierta.
- Relacionar columnas.
- Ordenar elementos.
- Arrastrar y soltar.
- Subir archivo.
- Subir captura.
- Resolver actividad interactiva integrada.

Flujo:

```txt
Profesor publica evaluación online
↓
Estudiante abre evaluación
↓
Sistema muestra preguntas/interacciones
↓
Estudiante responde
↓
Sistema guarda respuestas
↓
IA califica según blueprint
↓
Docente confirma o ajusta
↓
Estudiante ve nota y feedback
```

Reglas:

- El estudiante solo puede responder si está matriculado en la materia.
- El docente puede configurar tiempo límite.
- El docente puede permitir o bloquear reintentos.
- La entrega queda registrada con fecha y hora.
- La nota sugerida por IA no se muestra hasta que el docente confirme.

### 5.5 Evaluación física

La evaluación física se resuelve en papel. El sistema usa visión multimodal para interpretar la evidencia.

Flujo:

```txt
Profesor publica evaluación física
↓
Estudiante resuelve en hoja/cuaderno
↓
Docente toma foto o el estudiante sube foto
↓
Vision Router interpreta la respuesta
↓
LLM califica con base en blueprint + RAG
↓
Docente confirma o ajusta
↓
Nota queda en boletín
```

Submodos:

| Submodo | Uso |
|---|---|
| `foto_individual` | Se sube una foto por estudiante. |
| `modo_salon` | El profesor recorre estudiante por estudiante tomando foto. |
| `lote` | El profesor sube varias fotos y luego las asocia a estudiantes. |

Reglas:

- Visión es el flujo principal para comprender la imagen.
- Visión por computadora puede existir como apoyo auxiliar, no como centro del sistema.
- Si la imagen está borrosa o incompleta, la entrega pasa a `requiere_reintento` o `requiere_revision`.
- La IA debe devolver nivel de confianza y alertas.

### 5.6 Evaluación mixta

La modalidad mixta permite combinar preguntas online y preguntas físicas.

Ejemplo:

```txt
Preguntas 1-5: selección múltiple online
Pregunta 6: desarrollo escrito en plataforma
Pregunta 7: dibujo del sistema digestivo en hoja física
Pregunta 8: foto del procedimiento matemático
```

Flujo:

```txt
Estudiante responde parte online
↓
Estudiante o docente sube evidencia física
↓
Sistema une ambas entregas en una sola evaluación
↓
IA califica cada sección según su tipo
↓
Docente revisa calificación consolidada
```

Reglas:

- Cada pregunta puede tener `modalidad_respuesta`: `online`, `fisica` o `archivo`.
- La nota final se calcula sumando puntajes por pregunta o criterio.
- El docente puede revisar cada sección por separado.

---

## 6. Blueprint de Evaluación

### 6.1 Definición

El Blueprint de Evaluación es el mapa pedagógico que guía la calificación.

Contiene:

- Materia.
- Grado.
- DBA.
- Metas del profesor.
- Criterios.
- Pesos.
- Preguntas.
- Respuestas esperadas.
- Errores comunes.
- Reglas de retroalimentación.
- Contexto RAG.
- Nota máxima.

### 6.2 Cuándo se crea

| Caso | Momento de creación |
|---|---|
| Evaluación nativa | Durante la creación y se consolida al publicar. |
| Evaluación externa | Después de que visión reconstruye la evaluación y el docente valida. |
| Evaluación sorpresa | Al registrar nombre, DBA, criterios y nota máxima. |
| Material evaluable | Cuando el docente decide asignarlo con nota. |

### 6.3 Regla crítica

> No se puede calificar una evaluación o actividad evaluable sin blueprint.

Si el blueprint no existe, el sistema debe generarlo antes de iniciar la calificación.

---

## 7. Entregas y calificaciones

### 7.1 Entrega

La entrega es la evidencia del estudiante para una evaluación o actividad.

Tipos:

| Tipo | Modalidad | Ejemplo |
|---|---|---|
| `online` | Digital | Texto escrito en la plataforma. |
| `opcion_multiple` | Digital | Respuestas seleccionadas. |
| `interactiva` | Digital | Crucigrama, sopa, emparejar, ficha online. |
| `pdf` | Digital | Documento subido. |
| `captura` | Digital | Imagen de una respuesta digital. |
| `foto` | Física | Foto de cuaderno u hoja. |
| `mixta` | Híbrida | Respuestas online + foto. |

### 7.2 Estados de entrega

| Estado | Significado |
|---|---|
| `pendiente` | El estudiante aún no entrega. |
| `en_progreso` | El estudiante abrió y está resolviendo. |
| `recibida` | La entrega fue enviada. |
| `procesando` | La IA está analizando. |
| `calificada` | Hay nota sugerida. |
| `revisada` | El docente confirmó o ajustó. |
| `requiere_reintento` | Debe repetir la entrega o subir mejor evidencia. |

### 7.3 Calificación

Toda calificación tiene dos etapas:

1. `nota_sugerida`: generada por IA o autocorrección.
2. `nota_confirmada`: validada por el docente.

Estados:

| Estado | Descripción |
|---|---|
| `sugerida` | La IA o el motor automático propuso resultado. |
| `confirmada` | El docente aceptó la sugerencia. |
| `ajustada` | El docente cambió la nota. |
| `requiere_revision` | La confianza es baja o hay alerta. |
| `anulada` | El docente descarta la calificación. |

Regla:

> El estudiante solo ve calificaciones `confirmada` o `ajustada`.

### 7.4 Resultado de calificación IA

Formato conceptual:

```json
{
  "nota_sugerida": 4.2,
  "nota_maxima": 5.0,
  "confianza": 0.86,
  "criterios": [
    {
      "nombre": "Procedimiento",
      "puntaje": 1.8,
      "maximo": 2.0,
      "observacion": "El procedimiento es correcto, aunque falta explicar un paso."
    }
  ],
  "feedback_estudiante": "Buen trabajo. Refuerza la explicación del paso final.",
  "alertas": [],
  "requiere_revision_docente": true
}
```

---

## 8. Material didáctico y actividades generadas

### 8.1 Concepto principal

XCalificator debe diferenciar entre:

| Concepto | Significado |
|---|---|
| `material` | Recurso para enseñar o practicar. No necesariamente tiene nota. |
| `actividad` | Material asignado a estudiantes para resolver. Puede tener seguimiento. |
| `actividad_evaluable` | Actividad que genera nota o puntaje. |
| `evaluacion` | Instrumento formal de medición con nota máxima, criterios y blueprint. |

Regla:

> Todo material generado debe poder usarse como imprimible, como actividad online o como actividad evaluable, cuando su tipo lo permita.

### 8.2 Estados del material

| Estado | Descripción |
|---|---|
| `borrador` | Generado, pero no publicado. |
| `publicado` | Disponible para estudiantes o descarga. |
| `asignado` | Enviado a una materia o grupo. |
| `cerrado` | Ya no acepta respuestas. |
| `archivado` | Solo lectura. |

### 8.3 Modos de uso del material

| Modo | Descripción |
|---|---|
| `imprimible` | Se descarga en PDF/imagen para trabajar en papel. |
| `online` | Se resuelve directamente en la plataforma. |
| `mixto` | Puede imprimirse y luego subirse evidencia o resolverse online. |
| `presentacion` | Se usa como apoyo visual en clase. |

### 8.4 Herramientas que debe generar el sistema

| Herramienta | Imprimible | Online | Evaluable | Autocorrección | IA requerida |
|---|---:|---:|---:|---:|---|
| Sopa de letras | Sí | Sí | Opcional | Sí | LLM para palabras; algoritmo para grilla |
| Crucigrama | Sí | Sí | Opcional | Sí | LLM para pistas; algoritmo para grilla |
| Emparejar conceptos | Sí | Sí | Opcional | Sí | LLM |
| Unir columnas | Sí | Sí | Opcional | Sí | LLM |
| Armar la ficha / ficha didáctica | Sí | Sí | Opcional | Parcial | LLM + RAG |
| Cuento educativo | Sí | Sí | Opcional | Parcial | LLM + imagen opcional |
| Lectura comprensiva | Sí | Sí | Sí | Parcial | LLM |
| Para colorear | Sí | Parcial | Opcional | No automática completa | Imagen IA + foto evidencia |
| Guía de clase | Sí | Sí | No/optativo | No | LLM + RAG |
| Taller | Sí | Sí | Sí | Parcial | LLM + RAG |
| Quiz rápido | No necesario | Sí | Sí | Sí | LLM |
| Examen | Sí | Sí | Sí | Parcial/total | LLM + RAG |
| Rúbrica | Sí | Sí | No | No | LLM + RAG |
| Plan de refuerzo | Sí | Sí | No/optativo | No | LLM + datos de notas |
| Mapa conceptual | Sí | Sí | Opcional | Parcial | LLM + SVG/HTML |
| Flashcards | Sí | Sí | Opcional | Sí | LLM |
| Presentación | PPTX/PDF | Vista web | No | No | LLM + imagen + Presenton |

---

## 9. Actividades online generadas

### 9.1 Regla general

Toda herramienta interactiva debe generar dos salidas:

```txt
1. Versión docente: incluye solución, respuestas correctas y criterios.
2. Versión estudiante: oculta solución y permite resolver online.
```

Además, si el profesor lo decide, la actividad se puede convertir en evaluable.

### 9.2 Sopa de letras online

El sistema genera:

- Título.
- Instrucciones.
- Lista de palabras.
- Grilla.
- Coordenadas de solución.
- Pistas opcionales.
- Tiempo sugerido.

El estudiante puede:

- Seleccionar letras arrastrando o tocando.
- Ver palabras encontradas.
- Enviar intento.

Corrección:

- Automática por coordenadas.
- Puntaje por palabras encontradas.
- Puede guardar tiempo de resolución.

Estados:

```txt
no_iniciada → en_progreso → enviada → autocorregida → revisada/opcional
```

### 9.3 Crucigrama online

El sistema genera:

- Grilla.
- Pistas horizontales.
- Pistas verticales.
- Solución.
- Nivel de dificultad.

El estudiante puede:

- Escribir respuestas en casillas.
- Validar al final.
- Enviar intento.

Corrección:

- Automática por palabra completa.
- Puede aceptar mayúsculas/minúsculas sin penalizar.
- Puede mostrar feedback después del cierre o inmediatamente, según configuración docente.

### 9.4 Emparejar conceptos online

El sistema genera pares:

```txt
Concepto ↔ Definición
Imagen ↔ Nombre
Pregunta ↔ Respuesta
Término ↔ Ejemplo
```

El estudiante puede:

- Arrastrar y soltar.
- Tocar un elemento de la columna A y luego su pareja en B.
- Reordenar respuestas.

Corrección:

- Automática por pares correctos.
- Puntaje proporcional.

### 9.5 Unir columnas online

Similar a emparejar, pero con enfoque más dirigido.

El estudiante puede:

- Trazar líneas entre columnas.
- Seleccionar correspondencias.
- Enviar intento.

Corrección:

- Automática.
- El docente puede revisar si contiene respuestas abiertas adicionales.

### 9.6 Armar la ficha online

La ficha didáctica es una actividad estructurada que puede incluir:

- Título.
- Objetivo.
- Conceptos clave.
- Espacios para completar.
- Preguntas cortas.
- Arrastrar etiquetas.
- Ordenar pasos.
- Relacionar imagen y texto.
- Pregunta de reflexión.
- Actividad final.

Ejemplos:

```txt
Ficha: Partes de la planta
- Arrastra cada nombre a la parte correspondiente.
- Completa la función de raíz, tallo y hojas.
- Responde: ¿por qué las plantas necesitan luz?
```

Modos:

| Modo | Descripción |
|---|---|
| `imprimible` | PDF con espacios para escribir. |
| `online` | Campos interactivos, drag & drop y respuestas. |
| `mixto` | Parte online y parte foto/dibujo. |

Corrección:

- Automática en campos cerrados.
- IA en respuestas abiertas.
- Docente confirma si es evaluable.

### 9.7 Cuento educativo online

El sistema genera:

- Título.
- Cuento.
- Personajes.
- Moraleja.
- Vocabulario.
- Preguntas de comprensión.
- Actividad final.

El estudiante puede:

- Leer el cuento.
- Responder preguntas.
- Completar vocabulario.
- Crear final alternativo.

Corrección:

- Automática para selección múltiple.
- IA para preguntas abiertas.
- Docente confirma si afecta nota.

### 9.8 Para colorear

El sistema genera:

- Imagen en blanco y negro.
- Instrucciones.
- Preguntas o consigna opcional.

Modos:

| Modo | Descripción |
|---|---|
| `imprimible` | Descarga PDF/PNG para colorear en papel. |
| `evidencia_fisica` | Estudiante colorea en papel y sube foto. |
| `canvas_online` | Futuro: colorear directamente en pantalla. |

Corrección:

- No debe calificarse automáticamente por estética.
- Puede validarse como entregado/no entregado.
- Si es evaluable, la IA puede revisar cumplimiento de consigna, pero el docente confirma.

---

## 10. Actividades evaluables

### 10.1 Convertir material en actividad evaluable

Un profesor puede tomar una herramienta generada y elegir:

```txt
[Usar como recurso]
[Asignar como práctica]
[Asignar como evaluación]
```

Si elige evaluación, debe configurar:

- Materia.
- Estudiantes o grupo.
- Fecha de apertura.
- Fecha de cierre.
- Intentos permitidos.
- Nota máxima.
- Criterios.
- Si la autocorrección requiere confirmación docente.
- Si el feedback se muestra inmediatamente o después del cierre.

### 10.2 Tipos de calificación en actividades online

| Tipo | Herramientas | Confirmación docente |
|---|---|---|
| `autocorreccion_total` | Sopa, crucigrama, emparejar, unir columnas, quiz cerrado | Opcional, pero recomendada si va al boletín |
| `ia_asistida` | Cuento, ficha, taller, lectura con abiertas | Obligatoria |
| `manual` | Para colorear, proyectos, dibujo libre | Obligatoria |
| `mixta` | Examen con cerradas + abiertas + foto | Obligatoria |

Regla:

> Si la actividad genera nota oficial en boletín, el docente debe poder revisar y confirmar.

### 10.3 Intentos

El docente puede configurar:

| Configuración | Descripción |
|---|---|
| `un_intento` | Solo una entrega. |
| `multiples_intentos` | Se permite repetir. |
| `mejor_puntaje` | Se guarda el puntaje más alto. |
| `ultimo_intento` | Se guarda el último intento. |
| `practica_libre` | No afecta nota. |

---

## 11. Modo Salón

### 11.1 Definición

Modo Salón permite calificar en clase una evaluación física o sorpresa sin obligar al docente a cargar archivos manualmente uno por uno desde una vista pesada.

Flujo:

```txt
Docente selecciona materia
↓
Selecciona evaluación o crea evaluación sorpresa
↓
Sistema carga estudiantes matriculados
↓
Docente toma foto al estudiante 1
↓
IA sugiere nota
↓
Docente confirma/ajusta
↓
Siguiente estudiante
↓
Resumen final
```

### 11.2 Reglas

- La sesión debe persistir en base de datos, no solo en memoria, para evitar pérdida si se reinicia el servidor.
- Cada estudiante puede quedar en estado: `pendiente`, `fotografiado`, `calificado`, `confirmado`, `omitido`.
- El docente puede saltar estudiantes y volver luego.
- Si la imagen falla, puede repetir foto.
- Al final se muestra resumen de pendientes, confirmados y alertas.

---

## 12. Flujos principales del sistema

### 12.1 Crear materia y matricular estudiantes

```txt
Profesor crea materia
↓
Sistema genera código único
↓
Profesor comparte código
↓
Estudiante ingresa código
↓
Sistema valida código
↓
Matrícula activa o pendiente de aprobación
↓
Estudiante ve materia y actividades publicadas
```

### 12.2 Crear evaluación nativa online

```txt
Profesor selecciona materia
↓
Elige crear evaluación
↓
Selecciona modalidad: online
↓
Selecciona DBA y metas
↓
Define criterios y nota máxima
↓
LLM + RAG generan preguntas
↓
Profesor revisa
↓
Sistema crea blueprint completo
↓
Publica evaluación
↓
Estudiantes responden online
↓
Sistema califica y docente confirma
```

### 12.3 Crear evaluación nativa física

```txt
Profesor selecciona materia
↓
Crea evaluación con DBA, criterios y nota máxima
↓
Genera versión imprimible
↓
Estudiantes resuelven en papel
↓
Docente usa foto individual, lote o Modo Salón
↓
Visión interpreta respuestas
↓
LLM califica con blueprint
↓
Docente confirma notas
```

### 12.4 Evaluación externa digitalizada

```txt
Profesor sube foto/PDF de evaluación externa
↓
Visión detecta preguntas, instrucciones y estructura
↓
Profesor selecciona materia, DBA y criterios
↓
Sistema reconstruye blueprint
↓
Profesor valida
↓
Publica como online, física o mixta
↓
Se califica según modalidad
```

### 12.5 Evaluación sorpresa

```txt
Profesor selecciona materia
↓
Clic en evaluación sorpresa
↓
Escribe nombre
↓
Selecciona DBA o meta
↓
Define criterios y nota máxima
↓
Sistema crea blueprint mínimo
↓
Docente usa Modo Salón o foto individual
↓
Notas quedan asociadas a cada estudiante y materia
```

### 12.6 Generar y asignar sopa de letras online

```txt
Profesor selecciona herramienta: sopa de letras
↓
Define tema, grado, número de palabras y dificultad
↓
LLM propone palabras
↓
Algoritmo construye grilla y solución
↓
Profesor revisa
↓
Elige: imprimir, publicar como práctica o publicar como evaluable
↓
Estudiantes resuelven online
↓
Sistema autocorrige
↓
Docente revisa si afecta nota
```

### 12.7 Generar y asignar crucigrama online

```txt
Profesor define tema, grado y cantidad de pistas
↓
LLM genera palabras y pistas
↓
Algoritmo arma la grilla
↓
Profesor revisa
↓
Publica online o descarga PDF
↓
Estudiante completa casillas
↓
Sistema autocorrige por solución
```

### 12.8 Generar y asignar ficha didáctica online

```txt
Profesor elige “Armar ficha”
↓
Define tema, DBA, grado y tipo de actividad
↓
LLM + RAG generan estructura
↓
Sistema crea versión imprimible y versión online
↓
Profesor publica
↓
Estudiante completa campos, arrastra etiquetas o responde preguntas
↓
Sistema autocorrige lo cerrado e IA evalúa lo abierto
↓
Docente confirma si es evaluable
```

---

## 13. Reglas de negocio críticas

### R1 — La IA sugiere, el docente confirma

Ninguna nota oficial generada por IA llega al estudiante sin confirmación docente.

### R2 — Las actividades interactivas pueden ser práctica o evaluación

Sopa de letras, crucigrama, emparejar, unir columnas y fichas pueden ser solo práctica o pueden convertirse en actividad evaluable.

### R3 — Toda actividad online debe guardar intento

Cada intento debe guardar:

- Estudiante.
- Materia.
- Actividad.
- Respuestas.
- Tiempo.
- Puntaje automático si aplica.
- Estado.
- Fecha.

### R4 — Versión estudiante nunca muestra solución antes de enviar

Las soluciones solo se muestran al docente o al estudiante después de enviar, si la configuración lo permite.

### R5 — Todo material debe poder exportarse

Cuando aplique, el material debe poder exportarse como:

- PDF.
- HTML imprimible.
- Imagen.
- PPTX si es presentación.

### R6 — Evaluación online y física deben producir el mismo tipo de calificación final

Sin importar si el estudiante respondió en plataforma o en papel, el resultado final debe llegar al mismo boletín:

```txt
Materia → Evaluación/Actividad → Entrega → Calificación confirmada → Boletín
```

### R7 — Blueprint siempre presente

No se califica sin blueprint. Para actividades autocorregibles, el blueprint puede ser la clave de respuestas + reglas de puntaje.

### R8 — Nota máxima inmutable después de publicar

Una vez publicada una evaluación o actividad evaluable, la nota máxima no se cambia. Si el docente necesita otra escala, debe crear una nueva versión.

### R9 — Control de visibilidad

El estudiante solo ve:

- Actividades publicadas.
- Evaluaciones publicadas.
- Feedback liberado.
- Notas confirmadas o ajustadas.

### R10 — Reintentos configurables

El docente define si una actividad acepta reintentos y cómo se calcula el puntaje final.

### R11 — Evidencia física se conserva

Las fotos o archivos usados para calificar deben conservarse como evidencia, salvo políticas de eliminación configuradas por la institución.

### R12 — Xali solo responde sobre evaluaciones ya calificadas

Para estudiantes, Xali únicamente puede conversar sobre evaluaciones que el docente ya haya calificado y confirmado. Su rol es guiar al estudiante: mostrarle cómo debió resolver el ejercicio, señalar el error, explicar el concepto y cómo abordarlo correctamente, pero **nunca entregar la respuesta resuelta**. El aprendizaje debe ocurrir por descubrimiento guiado, no por solución directa.

No responde como tutor general ni sobre temas no vinculados a una entrega calificada.

Para docentes, Xali actúa como copiloto pedagógico para planear clases y crear materiales.

---

## 14. Reportes y boletín

### 14.1 Boletín del estudiante

Incluye únicamente calificaciones confirmadas.

Campos:

- Materia.
- Evaluación o actividad.
- Tipo: evaluación, sopa, crucigrama, ficha, taller, etc.
- Modalidad: online, física, mixta.
- Nota confirmada.
- Nota máxima.
- Feedback.
- Fecha.

### 14.2 Reporte docente

Debe mostrar:

- Promedio de materia.
- Distribución de notas.
- Entregas pendientes.
- Actividades con mayor dificultad.
- Errores comunes.
- Estudiantes en riesgo.
- Tiempo ahorrado.
- Comparación nota IA vs nota docente.

### 14.3 Reporte por actividad interactiva

Para sopa, crucigrama, emparejar, ficha y similares:

- Número de estudiantes asignados.
- Número de estudiantes que iniciaron.
- Número que terminaron.
- Promedio de puntaje.
- Tiempo promedio.
- Ítems con más errores.
- Estudiantes que requieren refuerzo.

### 14.4 Informe para acudiente

Debe usar lenguaje claro y no técnico:

- Qué actividad realizó el estudiante.
- Cómo le fue.
- Qué debe reforzar.
- Recomendaciones para casa.

---

## 15. Métricas de impacto para tesis

XCalificator debe registrar evidencia para demostrar impacto.

| Métrica | Uso |
|---|---|
| Tiempo ahorrado | Comparar tiempo manual vs tiempo con IA. |
| Kappa | Medir concordancia entre IA y docente. |
| Promedio Likert | Medir percepción docente. |
| Tasa de revisión | Cuántas notas IA fueron ajustadas. |
| Confianza promedio | Calidad percibida por el modelo. |
| Actividades generadas | Productividad docente. |
| Actividades resueltas online | Uso real del estudiante. |
| Actividades físicas calificadas | Adopción en aulas sin dispositivos. |
| Errores comunes detectados | Utilidad pedagógica. |

---

## 16. Glosario

| Término | Definición |
|---|---|
| DBA | Derecho Básico de Aprendizaje. |
| Materia | Contenedor académico de estudiantes, evaluaciones y materiales. |
| Código de matrícula | Código usado por estudiantes para unirse a una materia. |
| Blueprint | Mapa pedagógico de evaluación o actividad evaluable. |
| RAG | Recuperación de contexto pedagógico desde documentos de la materia. |
| Entrega | Evidencia enviada por el estudiante. |
| Actividad interactiva | Material que se resuelve online. |
| Actividad evaluable | Actividad que genera nota. |
| Sopa online | Sopa de letras resoluble en plataforma. |
| Crucigrama online | Crucigrama resoluble en plataforma. |
| Emparejar | Actividad de asociación entre elementos. |
| Ficha didáctica | Actividad estructurada con campos, preguntas y componentes interactivos. |
| Modo Salón | Flujo físico de calificación secuencial con fotos. |
| Nota sugerida | Nota propuesta por IA/autocorrección. |
| Nota confirmada | Nota validada por el docente. |
| Vision Router | Módulo que interpreta fotos, cuadernos, hojas y capturas. |
| Xali (estudiante) | Asistente IA que guía al estudiante sobre evaluaciones ya calificadas. Muestra cómo debió resolverlo, señala errores y explica conceptos, pero nunca da la respuesta resuelta. Solo responde sobre entregas confirmadas por el docente. |
| Xali (docente) | Copiloto pedagógico para planear clases y crear materiales. |

---

## 17. Cierre conceptual

La regla de producto más importante es:

```txt
Todo lo que el profesor crea debe poder convertirse en experiencia de aprendizaje.
Todo lo que el estudiante resuelve debe poder convertirse en evidencia.
Toda evidencia debe poder convertirse en retroalimentación.
Toda retroalimentación debe ayudar a reforzar.
```

XCalificator debe funcionar tanto para instituciones con buena conectividad como para aulas donde el papel sigue siendo el medio principal. Por eso el sistema debe soportar evaluaciones online, evaluaciones físicas, actividades interactivas, materiales imprimibles y calificación asistida por visión.

# Contratos de interfaz de recursos

## Catálogo docente

- Muestra únicamente formatos habilitados para nuevas creaciones.
- `Relacionar pares` representa la asociación interactiva e imprimible.
- `Taller` representa hojas de ejercicios nuevas.
- Materiales históricos `unir_columnas` y `ficha` conservan metadatos y destinos existentes.
- Las descripciones deben responder “para qué sirve” y “qué recibiré”.

## Generación

### Entrada común

- Materia opcional.
- Título, tema, área y grado.
- Indicaciones adicionales.
- DBA y rúbrica opcionales e independientes.

### Salida común

- Identificador único del material.
- Tipo estable.
- Título y contenido estructurado.
- Relación con materia cuando fue elegida.
- Estado inicial de borrador, sin publicación automática.

### Reglas de error

- Un contenido incompleto no se devuelve como exitoso ni se persiste.
- El mensaje indica qué sección no pudo construirse.
- Un reintento no crea dos materiales.

## Vista previa y edición

- Todos los campos del contrato pedagógico son visibles para el docente.
- Listas y objetos permiten agregar, modificar y eliminar entradas sin editar JSON.
- La versión estudiantil no muestra respuestas esperadas, justificaciones docentes, criterios de logro ni evidencias que revelen la solución.

## PDF

- PDF de estudiante: consignas, contenido, opciones y espacio de respuesta.
- PDF con soluciones: agrega respuestas, evidencias, criterios e indicadores docentes.
- El orden de secciones coincide con la vista previa.
- Se preservan saltos y tarjetas completas siempre que sea posible.

## Compatibilidad

- El contrato de lectura acepta los campos históricos.
- Los campos nuevos son aditivos.
- No se renombra ni elimina ningún identificador persistido.
- El plan de refuerzo conserva `semanas`; cada elemento se presenta y valida como sesión para no migrar ni romper contenido histórico.

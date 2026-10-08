# Datos y conservación

No se crea ni modifica ningún modelo persistido.

- **MaterialRead**: conservar identificador, tipo, materia, asignación, publicación, evaluación enlazada y contenido. Para una actividad leída por un estudiante, `contenido_json` es proyección segura; jamás se escribe de vuelta al material. Apoyo y autor conservan formatos autorizados.
- **Crucigrama seguro**: máscara booleana y pistas horizontales/verticales con número, posición y longitud; no contiene letras de solución ni claves. PDF dibuja casillas/pistas desde esa máscara.
- **Emparejamiento seguro**: columnas visibles sin `soluciones`; no se usa para emitir comprobaciones locales evaluativas.
- **BoletinItem**: reutilizar evaluación, nota confirmada nullable, escala, feedback, estado y fecha. Null no equivale a cero; homónimos de evaluación conservan identificación por id.
- **Desglose**: conservar resultado autorizado o null. La presentación maneja carga/error/ausencia/datos sin alterar su ciclo de publicación.

Enlaces y reintentos usan lectura exclusivamente. No se cambia estado de entrega, evaluación o calificación ni identidad de estudiante. Las matrículas/publicación y titularidad se validan como antes.

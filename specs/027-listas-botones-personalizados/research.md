# Investigación

## Decisiones

- Se conserva `Button` como única base para evitar dos implementaciones visuales divergentes.
- Las acciones frecuentes permanecen visibles; las ocasionales van a un menú contextual.
- La búsqueda se realiza en memoria sobre los datos ya obtenidos para no añadir latencia ni contratos.
- Los iconos educativos identifican entidades; Lucide identifica acciones universales.

## Alternativas descartadas

- Migrar todas las pantallas en un solo cambio: riesgo de regresión demasiado alto.
- Crear un endpoint de búsqueda: innecesario para el volumen actual y fuera del alcance frontend.
- Sustituir todos los iconos de acción por ilustraciones: reduce reconocimiento y consistencia.

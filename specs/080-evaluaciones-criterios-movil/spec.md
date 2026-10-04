# Evaluaciones con criterios de aprendizaje y creación móvil

Rama: `codex/080-evaluaciones-criterios-movil`. Fecha: 2026-10-04.
Issue principal: [#167](https://github.com/Andres-back/Calificator/issues/167).
Estado: alcance y ejecución autorizados por el usuario; despliegue condicionado a CI verde.

## Escenarios y aceptación

### P1: Crear una evaluación sin el error productivo
El docente genera un borrador dentro de su materia y lo revisa antes de guardar/publicar.
Si el servicio institucional de referencias está disponible se usa; si falla, se informa
que se generó sin recuperación semántica, conservando instrucciones y criterios explícitos.
No se simulan fuentes ni se ocultan errores del generador de preguntas.

### P1: Elegir qué aprendizaje evaluar
El docente busca y selecciona los criterios guardados de su materia. Solo los elegidos
se envían como criterios exigibles; las preguntas justifican su alineación. Ningún criterio
se selecciona automáticamente. Puede trabajar sin criterios o añadir una rúbrica opcional.

### P2: Crear cómodamente en celular
En 360×800 y 390×844, título/progreso y controles dejan espacio al formulario. Hay un
único scroll del contenido, sin solapar controles; cambiar de paso vuelve al inicio.
La materia, área y grado se heredan cuando se crea desde la materia.

## Requisitos funcionales

- FR-001: Admitir el hostname institucional real de embeddings mediante validación exacta, sin habilitar direcciones arbitrarias.
- FR-002: Un fallo de embeddings/RAG opcional no debe producir un 500 de generación; registrar y mostrar advertencia, sin inventar referencias.
- FR-003: Mostrar «Criterios de aprendizaje» en creación, selección y gestión de la materia; conservar nombres internos y contratos DBA existentes.
- FR-004: Buscar criterios, preservar selección al filtrar y enviar exclusivamente los IDs elegidos, validados por materia/propietario; no recuperar el catálogo completo como contexto.
- FR-005: Mantener controles accesibles y un scroll móvil utilizable en los seis pasos, edición y confirmación.
- FR-006: Conservar borradores locales compatibles, rúbricas editables, preguntas/respuestas y registros anteriores, sin migración ni cambios al cálculo de notas.
- FR-007: Verificar regresión backend/frontend, CI protegido y generación nueva aislada en la cuenta demo después del despliegue.

## Entidades y límites

Se reutilizan materia, catálogo oficial, criterios personalizados y evaluación/borrador.
Los campos `dba_ids` y `dba_personalizado_ids` siguen identificando las selecciones.
El material explícito y las referencias de la materia no equivalen a nuevos criterios.
Sin nuevas tablas, permisos, proveedores, modelos ni cambios a la calificación.
Analítica bloqueada y credenciales inválidas son problemas independientes; no debilitar CSP.

## Casos límite

Materia sin criterios, búsqueda vacía/sin resultados, criterio de otra materia, fallo del
servicio semántico, generador inválido, recuperación de borrador, teclado móvil y edición existente.

## Resultados verificables

La prueba demo devuelve borrador revisable, sin publicar ni alterar evaluaciones existentes.
La prueba de generación con embeddings caídos continúa sin fuentes falsas y con advertencia.
El payload y el prompt contienen los criterios seleccionados, no los descartados.
En ambas anchuras móviles no hay desbordamiento ni footer encima de los campos.

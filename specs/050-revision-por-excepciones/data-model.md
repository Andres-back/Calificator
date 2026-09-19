# Modelo de datos: Revisión por excepciones

No se añade persistencia. Los siguientes objetos son derivados en memoria de la versión activa del desglose.

## ReviewTriageItem

- `componentId`: identificador del componente.
- `level`: `safe | attention | blocked`.
- `priority`: orden numérico; bloqueada antes que atención.
- `reasons`: códigos deterministas y textos legibles.
- `evidencePages`: hojas ya asociadas al componente.
- `confidence`: menor confianza válida registrada, cuando existe.

## ReviewTriageSummary

- `safe`: lista de componentes sin alertas detectadas.
- `attention`: lista con señales de incertidumbre.
- `blocked`: lista no apta para confirmación rápida.
- `exceptions`: combinación ordenada de bloqueadas y atención.
- `hasGlobalBlocker`: cobertura incompleta, bloqueo del desglose o revisión global.

## Transiciones

La clasificación se recalcula cuando cambia la versión del desglose:

```text
desglose recibido/actualizado
  → clasificar cada componente
  → ordenar excepciones
  → renderizar resumen
```

No existe una transición persistida de “segura a revisada”. Editar un puntaje produce una nueva versión mediante el flujo ya existente y el resumen vuelve a derivarse.

## Validaciones

- Ningún componente puede pertenecer a más de un nivel.
- La suma de los tres niveles debe igualar la cantidad de componentes.
- Toda respuesta bloqueada debe aparecer en `exceptions`.
- Los textos de razones no contienen respuestas ni evidencia.

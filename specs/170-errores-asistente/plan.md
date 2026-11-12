# Plan: El asistente deja ver por qué falló al generar o guardar

**Spec**: [spec.md](spec.md) | **Issue**: [#359](https://github.com/Andres-back/Calificator/issues/359)

## Diagnóstico

- `GenerationWizard` pinta `generationError` y `saveError` al inicio del contenido desplazable (`contentRef`). El botón «Generar evaluación» y el pie quedan abajo. Tras un fallo, la vista no se mueve.
- En la auditoría, con un 503 del proveedor de IA, el texto «La IA configurada no pudo generar la evaluación…» estaba en la página pero fuera de la vista.
- El `onError` del guardado ignora la respuesta y fija siempre «No pudimos guardar los cambios. Se conservan aquí; revisa tu conexión y vuelve a guardar».
- El backend sí explica sus rechazos: suma de puntajes distinta de la nota máxima, evaluación cambiada en otra pestaña, entregas en proceso.

## Decisión

Solo frontend, en `GenerationWizard.tsx`:

- Un efecto deja `contentRef.current.scrollTop` en 0 cuando aparece `generationError` o `saveError`.
- El `onError` del guardado usa `toApiError`: con código de respuesta 400 o mayor muestra «No pudimos guardar los cambios. {motivo} Tu edición se conserva aquí.»; sin respuesta conserva el texto de conexión.

Descartado:

- **`scrollIntoView` sobre el aviso**: desplaza todos los contenedores que admiten desplazamiento, también el del modal. Mover solo el contenido evita ese riesgo.
- **Mostrar el error en un aviso flotante**: desaparece solo y el docente puede no verlo.
- **Mover el aviso junto al botón**: cambia la disposición del asistente, que otra sesión está reorganizando.
- **Validar la suma de puntajes antes de guardar**: es otra mejora; aquí solo se deja ver el motivo.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/evaluaciones/components/GenerationWizard.tsx` | volver al inicio al aparecer un error; motivo real al guardar |
| `frontend/src/modules/evaluaciones/components/GenerationWizard.test.tsx` | pruebas de regresión |

Sin backend, sin migraciones y sin cambios de datos.

## Riesgos

- El texto que se muestra es el que devuelve el backend. Si un mensaje es poco claro, ahora se verá tal cual.
- La Spec 165 toca el mismo archivo en otras líneas; el segundo PR que se fusione necesita rebase.

# Plan: Tomar varias fotos seguidas no pierde la foto ni bloquea el envío

**Spec**: [spec.md](spec.md) | **Issue**: [#390](https://github.com/Andres-back/Calificator/issues/390)

## Diagnóstico

- `CalificacionesWorkspace` pasaba `eligibilityVerified = isSuccess && !isFetching` de la consulta `['calificaciones', evalId]`. `GradingJobMonitor` la invalida cada vez que termina una calificación, y `GradingUploadPanel` al enviar.
- Con 0 hojas, `scanEnabled` es `capability.available`, y la capacidad solo se consulta con `eligibilityVerified`. Cada consulta de fondo hacía `true → false → true`.
- `MultiPageEvidencePicker` reiniciaba con `[contextKey, disabled, scanEnabled]`: subía la época, cerraba las vistas y quitaba el `<input capture>` pendiente. La foto que volvía se descartaba; si llegaba, su cola de calidad se cortaba y la hoja quedaba sin calidad («Comprobando…» para siempre).
- En modo preparación, una hoja cerrada sin decidir no tiene `quality` y el panel la contaba como «comprobando».
- `Modal` no añade entrada al historial: Atrás cambia la dirección y el `useBlocker` del espacio de trabajo pregunta si descartar.

## Decisión

Solo frontend.

- `uploadEligibilityVerified` (en `submissionCandidates.ts`): verificada si la consulta tuvo éxito y ya se trajo en esta pantalla (`isFetchedAfterMount`), aunque se esté repitiendo. El aviso «Consultando quiénes…» solo sale mientras no está verificada.
- `GradingUploadPanel` consulta la capacidad de preparación una vez verificada la lista para ese estudiante y no la apaga después.
- `MultiPageEvidencePicker` reinicia solo con `[contextKey, disabled]`. Cambiar `scanEnabled` solo invalida el editor (época propia), y `addFiles` lee el valor actual de `scanEnabled`.
- El selector muestra «Prepara la hoja N o usa la original para poder enviar» con «Abrir hoja N»; el panel ya no cuenta esas hojas como «comprobando» y deja de repetir el aviso genérico.
- `useCloseOnBack`: con la cámara o la preparación abiertas añade una entrada al historial con el mismo estado del enrutador; Atrás la quita y cierra la vista. Al cerrar con un botón, la entrada se quita con `history.back()` tras un instante; si otra vista se abre en ese instante (cámara → preparación, modo estricto) la reutiliza, y si la quita está en curso espera a que termine.

Descartado:

- **Solo cambiar el texto del aviso de cambios sin guardar** o seleccionar estudiantes con `replace`: no evita perder las hojas.
- **Mover la entrada del historial a `Modal`**: afecta a todos los diálogos de la aplicación.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/calificaciones/submissionCandidates.ts` | `uploadEligibilityVerified` |
| `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` | usa la verificación estable y oculta el aviso en consultas de fondo |
| `frontend/src/modules/materias/MateriaCalificar.tsx` | capacidad estable por estudiante; hojas sin preparar no cuentan como «comprobando» |
| `frontend/src/components/evidence/MultiPageEvidencePicker.tsx` | reinicio solo por estudiante o deshabilitado; aviso de hoja pendiente; Atrás |
| `frontend/src/components/evidence/useCloseOnBack.ts` | entrada de historial para las vistas a pantalla completa |

## Riesgos

- Si la consulta de fondo trae que el estudiante ya tiene entrega, sale de la lista y el envío se deshabilita, como antes. El servidor rechaza duplicados.
- Ir atrás quita la entrada con la misma dirección; el enrutador recibe una navegación a la misma dirección, sin bloqueo.
- Tocar dos vistas en milisegundos podría dejar una entrada de más: Atrás iría a la misma dirección.

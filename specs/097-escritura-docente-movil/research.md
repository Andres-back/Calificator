# Investigación y decisiones

Inspección local de main 0619678: Preparation enfoca automáticamente el tema; Wizard reserva header/footer y alto 100dvh; manual muestra listas/ayudas/criterios con separación amplia y algunos controles Agregar encogen. Los campos manuales usan estilos generales que deben verificarse frente al zoom de iOS. No se atribuye una causa física definitiva sin la captura solicitada.

- **Decisión**: tamaño visible opt-in, no solo altura del layout. **Motivo**: el teclado puede reducir el viewport visual sin reducir el layout. **Alternativa descartada**: suponer que 100dvh evita siempre tapar acciones.
- **Decisión**: compactar por foco textual en móvil, con Listo explícito sin submit. **Motivo**: prioriza escritura y funciona también con teclado externo. **Alternativa**: heurística universal de teclado a partir de cualquier resize, rechazada por zoom/barras/orientación.
- **Decisión**: conservar control activo y un estado padre. **Motivo**: impedir pérdida de cursor/texto. **Alternativa**: reemplazar el formulario por un editor paralelo, rechazada.
- **Decisión**: mantener API y proceso académico. **Motivo**: proteger fase demo y datos. **Alternativa**: simplificar borrando opciones/criterios, rechazada.
- **Decisión**: revisar casos afectados con fixtures y luego iPhone real. **Motivo**: WebKit de escritorio no representa un teclado físico. **Alternativa**: prometer compatibilidad física solo por un resize, rechazada.

Fuentes primarias consultadas el 2026-10-13:
- [MDN VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport): dimensiones/offset/eventos y separación entre viewport visual y layout; teclado/zoom pueden reducir solo el primero.
- [Chrome for Developers: viewport resize behavior](https://developer.chrome.com/blog/viewport-resize-behavior): explica diferencias de teclado/viewport entre navegadores, incluido Safari iOS. No usar VirtualKeyboard API como requisito de Safari.

Sin nuevas dependencias, versiones o tecnologías pendientes de investigación; no se requieren agentes.

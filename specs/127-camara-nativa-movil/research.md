# Investigación de diseño127

Inspección de solo lectura2026-10-25 sobre main0c194705. El agente principal revisó código y documentación primaria; la fase de Plan delegó una investigación acotada de riesgos/consumidores, sin modificar archivos o acceder a producción. Ninguna prueba física o llamada a IA realizada.

## Captura y espacio de imagen

**Hallazgo**: `CameraCapture.tsx` limita vídeo/foto a40dvh dentro de un grid `min-h-0` y un Modal flex. Esto demuestra el límite del encuadre web, pero no reproduce físicamente el síntoma de una línea. `MultiPageEvidencePicker` ya contiene un input nativo; el botón principal/repetición lo omite y monta la cámara integrada.

**Decisión**: promover la captura nativa en perfiles móviles y conservar la cámara integrada en PC. Sin un modal web intermedio para móvil. La respuesta nativa vuelve al mismo paquete de hojas.

**Evidencia**: [MDN capture](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture) documenta la petición de cámara trasera y su disponibilidad limitada; en escritorio puede abrir solo archivos. No es garantía de pantalla, lente o transcodificación.

**Alternativas**: ampliar solo el vídeo no da la interfaz nativa pedida; usar siempre input nativo también en PC perdería el selector de webcams del incremento103.

## Selección de plataforma

**Hallazgo**: `HomeScreenShortcut.tsx` ya reconoce iPad mediante `MacIntel`+touch. [WebKit Safari13](https://webkit.org/blog/9674/new-webkit-features-in-safari-13/) confirma que iPad puede anunciar un UA de Mac. Un ancho pequeño también puede ser una ventana de PC.

**Decisión**: política de preferencia, no de permisos, con señales móviles y caso iPad-UA-Mac; no depender exclusivamente de ancho, UA o existencia de una propiedad de captura como prueba de soporte real. Mantener salida de archivos y alternativa nativa explícita del visor PC.

**Alternativas**: solo `max-width` falla en landscape/tablet y cambia el PC estrecho; solo UA iPad omite su presentación de escritorio. No se añade un servicio de detección o fingerprint remoto.

## Vida del intento

**Hallazgo**: el selector compara solo `selectionContext` con un string `contextKey`; A→B→A puede volver a coincidir. El stream actual se cierra con `visibilitychange`, lo cual no debe trasladarse a una cámara externa que normalmente oculta el navegador.

**Decisión**: intento con identidad y época, handler unido a apertura y cleanup explícito; invalidar por contexto, desmontaje o deshabilitación, no por hidden/focus. Al aceptar, entregar una sola vez al pipeline vigente y conservar la época para el análisis de calidad. Escuchar cancelación cuando exista, pero no depender de ella para permitir reabrir.

**Evidencia**: [MDN cancel](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/cancel_event) explica que puede significar cancelar o reelegir los mismos archivos. Resetear el valor del input permite reelección; los eventos de foco no prueban cancelación.

**Alternativas**: un ref al último contexto o último ID sin ligar el evento a su apertura puede confundir eventos antiguos; un efecto para abrir el input pierde el vínculo directo con el gesto del usuario. No crear bloqueo de carga hasta recibir un evento que podría no llegar.

## Tipos, hojas y consumidores

**Hallazgo**: frontend/backend admiten JPEG/PNG/WebP; backend ya aplica `ImageOps.exif_transpose`. [WebKit Safari17](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/) documenta HEIC; admitirlo en el navegador no equivale a que el sistema lo procese. No hay razón para modificar normalización, IA o API.

**Decisión**: solicitar tipos admitidos, validar el MIME real, conservar originales admitidos y avisar sin borrar ante formato no compatible. Mantener límites propios: calificación/reemplazo40MB por paquete, digitalización20MB por paquete y sin PDF en su modo Fotos, según props actuales. La entrega del estudiante conserva su autorización y confirmación.

**Alternativas**: renombrar HEIC a JPEG no convierte datos; añadir conversor o subirlo sin validación amplía el alcance y riesgo. La deduplicación actual por nombre/tamaño/fecha es prevención básica, no prueba de identidad del contenido: cubrir repetición de nombres, sin eliminar la protección general.

## Resultado

No quedan incógnitas de diseño que exijan ampliar autoridad. La compatibilidad física se comprobará manualmente; no se afirma demostrada con Playwright. El usuario aprobó el plan y la revisión de requisitos el 2026-10-25; esto no autoriza fusión ni despliegue.

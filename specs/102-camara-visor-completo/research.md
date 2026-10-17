# Investigación: cámara y lector completo

2026-10-17, main `f1a98fb`. Investigación delegada de solo lectura conforme a Speckit Plan; sin IA externa.

## Cámara

**Decisión**: cámara integrada iniciada por clic, sin audio, alternativa por archivos y sesión cancelable.
**Razón**: el picker actual solo tiene input `capture="environment"`; orienta un selector, no garantiza cámara integrada. Tiene consumidores docente y estudiante; conservar ambos flujos.
**Alternativas**: cambiar solo el título no cumple captura directa; depender solo de input nativo conserva variabilidad; librería/aplicación nativa añade complejidad innecesaria.
**Limpieza**: apagar tracks al cerrar/salir/ocultar/deshabilitar/cambiar contexto; descartar permiso/captura tardíos. Ningún envío automático.
**Compatibilidad**: vídeo inline sin audio, permiso y contexto seguro. Fuentes primarias: [MDN capture](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture), [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [WebKit iOS](https://webkit.org/blog/6784/new-video-policies-for-ios/).
**Configuración**: `frontend/Dockerfile` usa `nginx/templates/default.conf.template`, que ya permite cámara propia en server y SPA. `frontend/nginx.conf` alternativo prohíbe cámara y tiene herencia de headers distinta: alinear y verificar sin atribuirlo al despliegue Docker.

## Visor

**Decisión**: reutilizar Blob/PDF.js/worker, espacios por página y ventana activa de máximo tres canvases con render serial.
**Razón**: actualmente se dibuja una página, se resetea scroll al navegar y el modal añade scroll/pie de descargas. Todas las páginas a alta resolución consumirían demasiada memoria.
**Alternativas**: iframe PDF irregular en móvil; todos los canvases simultáneos excesivos; fullscreen nativo obligatorio incompatible; abrir PDF como única lectura no resuelve interfaz propia.
**Límite**: progresivo es el dibujo, no los bytes: se descarga el Blob autorizado completo una vez. [PDF.js sobre memoria y páginas](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions#i-want-to-render-all-100-pages-in-a-document-at-a-high-resolution-is-it-a-good-idea).
**Pruebas**: veinte páginas, cancelación, scroll/zoom/resize, texto/píxeles reales, memoria, error parcial y solucionario restringido.

Sin incertidumbres técnicas pendientes. El usuario aprobó el plan y autorizó la revisión de la lista el 2026-10-17. Esa aprobación no equivale a implementación ni pruebas terminadas.

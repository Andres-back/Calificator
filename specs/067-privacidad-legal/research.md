# Investigación y auditoría

## Estado encontrado

- No existían rutas ni documentos públicos de privacidad, tratamiento de datos, términos, cookies o aviso.
- El registro solicitaba nombre, correo y contraseña sin enlaces ni aceptación explícita.
- La aplicación usa cookies `access_token`, `refresh_token` y `xcalificator_csrf` para sesión y seguridad.
- Existen preferencias funcionales en `localStorage` y telemetría académica autenticada de primer nivel.
- Producción incluye Cloudflare Web Analytics. La respuesta pública no fija cookies antes de iniciar sesión.
- La plataforma puede enviar texto e imágenes educativas al proveedor de IA configurado por administrador o docente.
- El estudio de impacto ya distingue medición voluntaria, pero la existencia de una cuenta no equivale a consentimiento investigativo.

## Fuentes oficiales consultadas

- Ley 1581 de 2012: principios, derechos, deberes y protección prevalente de niños, niñas y adolescentes.
- Decreto 1074 de 2015, capítulo de protección de datos: contenido mínimo de política y aviso.
- SIC, Circular Externa 002 de 2024: tratamiento de datos personales en sistemas de inteligencia artificial, privacidad desde el diseño y responsabilidad demostrada.
- SIC, conceptos sobre tratamiento de menores: interés superior, derechos fundamentales, representante legal y derecho a ser escuchado según madurez.
- SIC, conceptos de nube: el proveedor puede actuar como encargado; el responsable conserva obligaciones y debe definir seguridad y tratamiento.
- Cloudflare Web Analytics: declara no usar cookies, `localStorage` ni huellas individuales para sus métricas de rendimiento.

## Decisión

Publicar una base legal honesta y guardar aceptación para altas nuevas. No afirmar que estos textos, por sí solos, regularizan el piloto: antes de ampliar la muestra deben formalizarse roles con la institución, autorizaciones de representantes, asentimiento cuando corresponda, instrumento de consentimiento investigativo, contratos/condiciones de proveedores y programa interno de conservación y atención de incidentes.

## Decisión jurídica pendiente: licencia del código

- El producto se presenta públicamente como proyecto de código abierto, pero el repositorio no contiene un archivo `LICENSE`.
- Publicar el código no concede automáticamente permisos de uso, modificación o redistribución.
- Elegir una licencia permisiva (por ejemplo Apache-2.0 o MIT) o una licencia copyleft de red (por ejemplo AGPL-3.0) modifica derechos de terceros y requiere una decisión expresa de los titulares antes del merge.
- Hasta esa decisión, los términos no afirman que exista una licencia publicada.

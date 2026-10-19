# Formato de retroalimentación del piloto

Fecha de creación: 19 de octubre de 2026. Código **FR-PIL-01**, versión **1.0-web**, consentimiento **CI-PIL-RET-01-v1-2026-10-19**. Es un formato propio de registro de observaciones solicitado por el asesor. No se presenta como escala estandarizada o validada.

Actualización del mismo día: los nuevos envíos usan el consentimiento
**CI-PIL-RET-01-v2-2026-10-19** y requieren firma dibujada más autorización expresa
para conservar el dibujo. No se acepta el nombre escrito como sustituto de la firma.
Los registros recibidos con la versión anterior permanecen intactos y consultables.

## Finalidad y aplicación

Recoger comentarios escritos de los docentes sobre su experiencia en las pruebas o plan piloto de XCalificator y conservar una constancia de aceptación al final. Aplicarlo después de una sesión o período de uso, indicando su última fecha. Quienes solo observan una demostración deben marcar esa modalidad; su registro no demuestra uso directo ni participación sostenida en el piloto.

Tiene nueve preguntas en dos bloques, más identificación, consentimiento y firma. La meta orientativa de 5–7 minutos está pendiente de comprobar con docentes. Antes de distribuirlo, revisar comprensión, claridad y duración; documentar ajustes y crear una nueva versión cuando cambie el contenido.

| Preguntas | Información | Finalidad |
|---|---|---|
| 1–2 | Institución y área | Contextualizar el comentario y vincular autorización; no solicitar cédula |
| 3–4 | Fecha y experiencia directa, acompañada o demostración | Vincular el registro con la prueba sin atribuir uso que no ocurrió |
| 5–6 | Funciones probadas u observadas y versión o referencia conocida | Identificar alcance y facilitar seguimiento; la versión no se inventa si se desconoce |
| 7 | Actividad y observación concreta | Registrar aspectos favorables, dificultades o ausencia de problemas |
| 8–9 | Sugerencia y prioridad opcionales | Orientar mejoras sin exigir aprobación o recomendación positiva |

Nombre, institución, fecha, modalidad, actividad y una observación son necesarios para registrar una retroalimentación interpretable. Los contactos, área, versión, sugerencia y prioridad pueden omitirse. No se exige proponer cambios. La participación es voluntaria y se puede abandonar antes del envío.

## Cómo respalda la tesis y un artículo

El registro sirve como evidencia cualitativa de la experiencia declarada, de los problemas señalados y de las mejoras propuestas durante la prueba. Conserva texto, contexto, consentimiento, confirmación del docente, constancia electrónica y fecha de recepción. La fecha de prueba es declarada; la fecha de recepción es del servidor. La firma no verifica por sí sola identidad, uso real ni participación efectiva y no garantiza aceptación de una publicación.

Analizar todos los comentarios recibidos, incluidos críticos y neutros. Distinguir número de personas de número de aplicaciones: un docente puede registrar varias sesiones. Reportar institución, funciones, modalidad, fechas, omisiones y número efectivo de participantes. No contar nuevas entradas como docentes adicionales ni fusionarlas con la encuesta de necesidades.

Procedimiento recomendado para análisis y trazabilidad:

1. Guardar la constancia privada; asignar al participante un código de análisis y revisar cualquier identificador en el texto.
2. Codificar temas emergentes, por ejemplo navegación, rúbricas, notas sugeridas, comentarios, archivo o reportes. Registrar también resultados que no encajen y opiniones divergentes.
3. Mantener una matriz privada con **código de registro, observación, categoría, sugerencia, prioridad declarada, decisión de los investigadores, justificación, cambio o commit asociado y verificación posterior**. No marcar una propuesta como resuelta por haber recibido el comentario.
4. Cuando se implemente una mejora, vincular su comprobación técnica y, si se realiza, una nueva prueba docente con fecha. Conservar la observación original sin sustituirla por una versión más favorable.
5. Publicar resultados agrupados y síntesis revisadas sin nombres, contactos, firmas ni formularios identificados, conforme al consentimiento. Las constancias completas quedan bajo custodia privada.

El CSV excluye nombre, contacto y firma, pero los textos y combinaciones contextuales pueden identificar al participante. Revisarlo antes de compartir; no publicarlo íntegro por defecto. La huella SHA-256 permite comparar contenido y no es certificación independiente de autoría ni de fecha.

Este formato complementa la evaluación del piloto. No sustituye el registro exacto y comparable de tiempos manuales/asistidos, la concordancia docente–IA, la evaluación de calidad de retroalimentación ni un instrumento de aceptación fundamentado en TAM. Las sugerencias no equivalen a resultados objetivos de eficacia ni a una escala global de satisfacción.

## Respaldo de la decisión

NASA incluye encuestas y entrevistas como técnicas para recoger necesidades y expectativas de interesados. Ese principio respalda recoger comentarios docentes y vincularlos con requisitos y mejoras; no implica que NASA haya diseñado o validado FR-PIL-01. [NASA Systems Engineering Handbook sección 4.1](https://www.nasa.gov/reference/4-1-stakeholder-expectations-definition/).

AAPOR recomienda claridad y neutralidad, limitar carga de respuesta y preprobar los instrumentos. Se aplica a este formato mediante pocos campos, sugerencias opcionales y aceptación de observaciones favorables, críticas o neutras. No prescribe nueve preguntas ni acredita una duración determinada. [Buenas prácticas de AAPOR](https://aapor.org/standards-and-ethics/best-practices/).

Estas fuentes respaldan criterios de diseño y no son resultados del piloto. El registro solicitado por el asesor tampoco acredita por sí solo revisión de contenido, aprobación ética institucional o ejecución de todos los procedimientos previstos en la propuesta.

## Acceso y custodia

Se ejecuta en el mismo servicio independiente de la encuesta, con ruta `/retroalimentacion-piloto/` y panel privado `/retroalimentacion-piloto/admin/`. Usa las mismas credenciales administrativas del servicio, un consentimiento propio y otra base SQLite. No modifica el cuestionario LR-CR-01 ni sus respuestas.

Por defecto la base es `retroalimentacion-piloto.sqlite3` junto a `DATABASE_PATH`; en Docker se conserva en `/data/retroalimentacion-piloto.sqlite3`, dentro del volumen persistente. Opcionalmente configurar `FEEDBACK_BASE_PATH` y `FEEDBACK_DATABASE_PATH`. No usar la misma base o ruta de ambos instrumentos. Si se cambia la ruta, adaptar Nginx. La conservación y los contactos se heredan de `settings.json`; el contenido específico está en `feedback/settings.json` y `feedback/schema.json`.

El panel incorpora las funciones de búsqueda, estados, etiquetas y notas privadas del servicio, manteniendo estas anotaciones separadas de la respuesta firmada. El acceso usa el formulario web de administración y una sesión propia de este instrumento. Para el VPS ya instalado, conservar `compose.vps.yaml`, su red y volumen; añadir la nueva ruta al proxy central y actualizar la copia instalada de `backup.vps.sh`, que ahora guarda ambas bases por separado. Véase [la administración del VPS](ADMINISTRACION.md).

Para una instalación existente, actualizar el código, reconstruir el contenedor y añadir las ubicaciones de retroalimentación de `nginx-location.conf` al servidor HTTPS, validar y recargar Nginx. No borrar el volumen. No es necesario regenerar `.env` ni cambiar secretos. Verificar ambas rutas de salud. No se publica en el VPS automáticamente al subir el código a GitHub.

Comandos de custodia de esta base en Docker:

```bash
docker compose -p xcalificator-encuesta exec encuesta-docente python manage.py --database /data/retroalimentacion-piloto.sqlite3 stats
docker compose -p xcalificator-encuesta exec encuesta-docente python manage.py --database /data/retroalimentacion-piloto.sqlite3 verify
docker compose -p xcalificator-encuesta exec encuesta-docente python manage.py --database /data/retroalimentacion-piloto.sqlite3 backup /data/respaldo-retroalimentacion-AAAA-MM-DD.sqlite3
```

Cambiar `enabled` a `false` en `feedback/settings.json` y reconstruir cierra solo esta recolección. Los procesos de supresión y custodia se aplican también a exportaciones y respaldos; consultar el [manual de operación](README.md).

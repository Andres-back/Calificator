# Investigación y decisiones

## Lectura y versiones

- **Decisión**: extraer lectura separada y persistir clave controlada en blueprint con campo público explícito. Snapshots ya incluyen reglas del blueprint.
- **Fundamento**: prompts actuales excluyen lectura y normalización la descarta. ORM no tiene campo de lectura; blueprint evita migración y conserva contexto congelado.
- **Alternativas**: descripción mezclaría instrucciones/lectura; nueva tabla innecesaria; no reconstruir lectura antigua ni forzar versiones sobre entregas legacy.
- **Riesgos**: update_evaluation usa setattr genérico y requiere caso expreso; estudiantes usan dict allowlisted; exportación de snapshot usa blueprint dict. Evitar truncamiento silencioso de 12.000 caracteres.

## Impresión

- **Decisión**: build_evaluation_material transmite texto y flag compacta. PDF examen debe renderizar lectura; Word ya soporta contenido_json.texto. Opciones cortas en dos columnas, VF una fila, largas una columna.
- **Fundamento**: opciones por párrafo y tarjetas desperdician papel. Mantener numeración, abiertas y figuras.
- **Alternativas**: no compactar todos los recursos ni imponer columnas en móvil.

## Fotos

- **Decisión**: parametrizar límites/formatos de MultiPageEvidencePicker y evidence_bundle_service, conservando defaults de calificación. Multipart file repetido + rotaciones para fotos; PDF/Word individual compatible.
- **Fundamento**: ya existen cámara, dispositivos, orden, giro y detección de calidad. Modal actual usa files[0]; backend dispone de consolidación normalizada.
- **Alternativas**: PDF en celular consume memoria; trabajos por hoja perderían contexto. No mezclar PDF/Word con fotos.

Investigación completada sobre código local; no requiere datos personales ni nuevos proveedores.

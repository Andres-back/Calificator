# Especificación: exactitud de preguntas objetivas

**Issue**: [#303](https://github.com/Andres-back/Calificator/issues/303). **Rama**: `codex/142-exactitud-calificacion`. Base: `28c1fa7`.

El usuario aprobó el plan «Mejorar la exactitud de la calificación» y solicitó implementarlo. Esta entrega prepara una candidata desactivada; no autoriza activación, fusión, datos reales o llamadas adicionales de IA.

## Necesidad y aceptación

El docente necesita distinguir una respuesta objetivamente incorrecta de una lectura que no se pudo verificar. Un número repetido entre secciones, dos marcas, una hoja faltante o una lectura ilegible no justifican un cero. La nota sigue saliendo del desglose guardado y las decisiones del docente se conservan.

- ABCD de respuesta única y V/F: una lectura y clave inequívocas reciben el máximo guardado o cero según coincidencia.
- Identidad incierta, clave ausente, lecturas incompatibles, corrección/tachón, poca confianza o evidencia incompleta: puntaje nulo con causa breve y páginas.
- Una respuesta abierta o dibujo conserva el comportamiento vigente. No se añade otro evaluador ni se modifica el verificador.
- Si se repite la operación o se consulta un resultado anterior, no se reescribe por este cambio.

## Requisitos

- **FR-001** Resolver la identidad por clave/ID estable; usar número solo si es único. No elegir la última lectura o clave entre duplicados.
- **FR-002** Puntuar por regla únicamente ABCD de selección única y V/F con lectura y clave verificables. Máximo exacto o cero, sin cambiar pesos, escala ni redondeo.
- **FR-003** Mantener nulo lo ilegible, parcial, ambiguo, ausente o contradictorio; conservar páginas y motivos. Alertas del verificador o evidencia gráfica dudosa no se convierten en aciertos/cero.
- **FR-004** Conservar la ruta de abiertas, dibujos, rúbricas y decisiones docentes. Mantener compatibles las salidas previas y contratos HTTP.
- **FR-005** Mostrar explicación breve por pregunta y conservar traza privada en el resultado existente, sin nuevas llamadas ni datos públicos.
- **FR-006** Comparar políticas con la misma lectura y salidas de modelos congeladas y referencia sintética explícita. Separar error de puntaje, abstenciones y limitaciones; no afirmar mejora docente por pruebas sintéticas.
- **FR-007** Entregar desactivado mediante `GRADING_SAFE_OBJECTIVE_ENABLED=false`. Sin flag no cambiar las valoraciones. No aplicar retrospectivamente ni mutar notas/evidencias/enlaces en las pruebas.
- **FR-008** Antes de activar, usar muestra real anonimizada solo con autorización específica y corrección docente independiente, manteniendo modelos y protocolo fijos; CI verde y autorización de activación separados.

## Criterios de salida

- **SC-001** Ningún caso sintético dudoso produce cero/máximo determinista.
- **SC-002** Coincidencias e incorrectas claras, números repetidos con ID, varias hojas y correcciones conservan asociación, páginas y máximos precisos.
- **SC-003** En la comparación sintética no empeora el error en casos resolubles; se informa por separado lo que queda pendiente. No equivale a una validación de OCR ni de exactitud en fotos reales.
- **SC-004** Regresiones de orquestación, consenso, fórmulas, permisos y edición docente conservadas; ningún cambio de modelos ni producción.

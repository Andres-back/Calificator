# Investigación: respuesta estructurada y rutas rápidas

## Decisión 1: distinguir truncado de JSON inválido

**Decisión**: revisar la razón de finalización del proveedor antes de parsear. `length` o `max_tokens` se consideran truncado explícito.

**Justificación**: la ejecución real produjo exactamente 1.536 tokens y un error de sintaxis al final. Intentar reparar ciegamente puede aceptar datos incompletos.

**Alternativas consideradas**: agregar una biblioteca de reparación JSON. Se descarta porque podría convertir una respuesta incompleta en aparentemente válida y añade una dependencia innecesaria.

## Decisión 2: usar solo controles admitidos y reducir el contexto

**Decisión**: solicitar razonamiento desactivado únicamente a DeepSeek V4 Flash Vision Exp, que admite ese control. GLM 5.3 Flash omite el campo `thinking`, recibe un contexto compacto y dispone de un presupuesto de salida suficiente para cerrar el JSON.

**Justificación**: una llamada real al gateway devolvió HTTP 400 para GLM con `thinking`, mientras la misma solicitud sin ese campo finalizó correctamente. El contexto compacto evita repetir enunciados y reserva la salida para el contrato estructurado.

**Alternativas consideradas**: forzar el mismo parámetro en todos los modelos o duplicar indiscriminadamente el límite. Se descartan porque el primer enfoque rompe GLM y el segundo puede aumentar tiempo/costo sin reducir texto redundante.

## Decisión 3: no arbitrar si falta una nota verificadora

**Decisión**: cuando solo existe la nota principal, conservarla como sugerencia, añadir alerta y forzar revisión docente sin una tercera llamada.

**Justificación**: la llamada adicional de producción tomó 27,084 s y no aporta verdadera independencia si usa el mismo modelo que acaba de fallar.

**Alternativas consideradas**: reintentar siempre el verificador. Se mantiene únicamente como posible evolución futura; para el hotfix se prioriza respuesta rápida y honesta.

## Decisión 4: corregir configuración, no acoplar modelos

**Decisión**: actualizar la etapa `digitalizacion.estructura` mediante la configuración institucional existente a un modelo disponible y mantener un respaldo válido.

**Justificación**: el código ya honra snapshots por etapa; el 404 provino de un modelo retirado configurado en producción, no de la extracción visual.

**Alternativas consideradas**: fijar el modelo en código. Se descarta porque viola la portabilidad de proveedores y el panel administrable.

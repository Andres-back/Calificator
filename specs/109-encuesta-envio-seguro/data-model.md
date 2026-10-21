# Datos y estados

Sin migración SQLite. responses conserva cada constancia y esquema original; response_reviews permanece separado.

Release 5.0.1: signature.name se deriva del único campo identity.name; contrato y constancias almacenadas sin cambios. Cambiar nombre tras firmar invalida dibujo y autorización en la pestaña, no documentos previos.

5.0: manual.minutes decimal positivo, manual.deliveries entero positivo, manual.basis measured/estimated/na/skip, manual.open_percent 0–100, legibilidad/cámara y entrega/respaldo categóricos. Minutos por entrega solo con valores y procedencia válidos; no alterar originales.

completion_metrics opcional: elapsed_seconds, visible_seconds y source=browser, acotados y sin eventos detallados.

En curso → enviando → guardado. Rechazo → corrección. Recepción incierta → reintento idéntico. Limpiar campos únicamente tras comprobar una constancia correspondiente.

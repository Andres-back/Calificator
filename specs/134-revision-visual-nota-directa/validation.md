# Validación local — Spec 134

Fecha: 2026-10-29. Rama: `codex/134-revision-visual-nota-directa`. Issue: #281.

No se usaron datos de alumnos, claves de producción ni llamadas a IA. No se modificó producción, modelos, notas reales ni evidencias. Sin migración de aplicación; el nuevo paso de CI crea únicamente una base sintética vacía para estas pruebas.

## Resultados registrados

| Comprobación | Resultado |
| --- | --- |
| Calidad documental y aprobación | 16/16 + 8/8; aprobación explícita del plan y revisión de requisitos |
| Frontend unitario completo | 1.064 pruebas, 169 archivos, todos aprobados; ejecución aislada, 369,34 s |
| E2E nuevos | 32 aprobados en Chromium/WebKit, un worker, 4,8 min; 360/390/1440 px, claro/oscuro |
| Recuperación de acciones móviles | 2 pruebas adicionales aprobadas: guardar y cancelar tras 409 restauran foco, barra y estado de escritura |
| Regresión de revisión existente | 29 escenarios Chromium aprobados en el recorrido conjunto de revisión docente |
| Libro y lista después del ajuste | 12 E2E aprobados en Chromium/WebKit, 1,2 min, con consulta de lista coherente y comprobación del nuevo valor 4,5 |
| Integración PostgreSQL, ejecución final | 6 aprobadas, 129,88 s, solo esquemas aleatorios sintéticos; incluye lectura posterior del servicio del libro |
| Accesibilidad de revisión | 11 aprobadas; teclado/foco, temas, 360/390/768/1366/1920 px y reflujo al 200 % |
| Regresión contextual de revisión | 43 aprobadas, 6,3 min |
| Backend unitario completo, ejecución final | 1.583 aprobadas, 127,05 s; contenedor sin red y afinidad fija en CPU 2 |
| Tipos, lint y build finales | Aprobados; build 13,24 s; auditorías de acciones y build público aprobadas |
| Inventario | Generado y comprobado: 663 superficies, sin deriva; E2E particionado: 626 casos, cero omisiones o duplicados |
| Gobernanza, ejecución final | 61 aprobadas, 159,16 s, suite completa sin exclusiones; contexto del PR preparado validado |
| Converge | Sin hallazgos pendientes: 31 requisitos/escenarios, 4 decisiones y 8 principios revisados; T019 cierra la comprobación explícita de libro/lista |
| CI remoto y despliegue | Entrega preparada para PR/CI; los resultados anteriores son locales y el estado remoto se informa en el PR. Sin fusión ni despliegue |

La regresión existente y los escenarios nuevos se ejecutaron también juntos: los 29 anteriores pasaron, pero esa ejecución conjunta no fue completamente verde por tiempos de WebKit. El resultado final de 32/32 corresponde a la ejecución aislada descrita, no a ocultar esos fallos.

## Alcance probado

- Entrada de resultado deseado 4,1 → 4,5, coma/punto, cero, límites y cancelación sin redondear el dato persistido.
- Observación opcional; propuesta de IA, retroalimentación, puntos, estados individuales y evidencias conservados.
- Transacción real de nota, desglose y auditoría; reversión completa con fallo inducido después de suspender una publicación.
- Concurrencia: dos decisiones sobre la misma versión producen una aceptación y un conflicto; el mismo identificador de intención no duplica eventos.
- Casos con desglose completo, incompleto y sin desglose; no se crean ceros ni preguntas ficticias.
- Docente propietario permitido, estudiante/docente ajeno/sin permiso/sin sesión rechazados.
- Una publicada requiere advertencia; queda ajustada y sus publicaciones anteriores afectadas quedan suspendidas, sin reactivar enlaces.
- Colores de prioridad y selección conservados en navegación/detalle/resumen; sin alertas internas añadidas a la vista estudiantil. La matriz incluye fronteras, desconocidos, contradicciones y revisión individual docente.
- Capturas sintéticas locales bajo `frontend/output/playwright/spec134-*`, excluidas de Git. Revisión visual del editor y de las prioridades en pantalla estrecha.
- Convergencia: la lectura del servicio `list_calificaciones_for_evaluacion` devuelve 4,5 después del ajuste, también en casos incompletos y antiguos. La lista docente actualiza 4,5 en los seis tamaños/temas de ambos motores de navegador.

## Incidencias de validación y tratamiento

1. Las pruebas nuevas iniciales mostraron el contrato ausente y la falta de actor; se implementaron precondiciones, decisión global versionada e idempotencia. Los ocho fallos esperados iniciales no se contabilizan como una ejecución verde.
2. La primera suite backend tuvo dos fallos: un doble de base de datos antiguo no soportaba la lectura bloqueada y una microprueba de CPU excedió su razón 1,10 (1,132; después 1,168 incluso sin suites concurrentes). Se adaptó el doble sin cambiar sus aserciones. Se comparó el mismo test sin modificar en una copia limpia de main y la rama con afinidad fija al CPU 2: razones 1,020 y 1,056, ambas dentro del límite, con 40 llamadas sintéticas por 20 entregas en ambos casos. Después pasó la suite completa de 1.583 pruebas con esa misma afinidad. No se cambió el test, su umbral, sus repeticiones ni el código del pipeline medido; se documenta la sensibilidad de la medición al entorno virtualizado.
3. La primera suite frontend simultánea fue interrumpida para eliminar competencia de recursos después de dos fallos en formularios no modificados. La repetición completa aislada pasó las 1.064 pruebas sin relajar esos tests.
4. Los escenarios E2E inicialmente combinaban edición y tres selecciones y excedieron el tiempo global de WebKit. Se separaron edición y revisión; se comprobaron todos los colores, selección y anillo, y se eliminó una navegación redundante sobre la primera pregunta ya seleccionada, manteniendo sus aserciones. Las navegaciones restantes y todas las verificaciones se conservan. No se aumentaron timeouts ni reintentos ni se forzaron clics.
5. La primera comprobación de gobernanza antes de cerrar tareas pasó 60 casos y rechazó correctamente T017/T018 todavía abiertas. Se cerraron tras completar inventario, documentación y Converge; después pasaron los 61 casos de la suite completa, sin exclusiones.

## Límites y reversión

Los colores son heurísticas de prioridad, no probabilidades calibradas ni una validación de exactitud de IA. No se realizaron pruebas nuevas en teléfonos físicos; WebKit no equivale a validar un iPhone real. Esta entrega no incorpora el escáner pendiente de Spec 131.

Una reversión de código debe realizarse mediante PR/CI de main, no push directo. La persistencia usa tablas y campos existentes; se conservan versiones y auditoría, sin rollback destructivo de notas. Los campos nuevos del ajuste son opcionales para clientes antiguos. Fusión y despliegue requieren autorización posterior y CI vigente verde.
